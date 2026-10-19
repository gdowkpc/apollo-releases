"use strict";
const C = require("./pi_bridge_v2_contract");
const {hash, hex, gate, closed, equal, digests, signed, time, RF, requirements} = C;
const V = require("./validate_pi_bridge_compatibility_v2");
const P = require("./validate_pi_dashboard_delivery_probe");
function io() { return require("./validate_pi_bridge_compatibility"); }
function read(root, ref, path) {
  // Existing installer/inventory bytes retain their v1 rules. New v2 records
  // use canonical JSON (optional single LF), which also rejects duplicate keys.
  const value = io().referencedBridgeRecord(root, ref, path);
  if (!path.startsWith("installers/") && !path.includes(".onboarding.json") && !path.includes("pi-updater-inventory-")) {
    const text = io().readBridgeRecord(root, path).toString("utf8"), canonical = JSON.stringify(value);
    gate(text === canonical || text === canonical + "\n", "record_noncanonical_json");
  }
  return value;
}
function validateNativeRecord(record, relative, root, policy, installers, now = Date.now()) {
  closed(record, ["schema_version", "release", "installer_record", "minimum_updater_version", "updater_inventory", "collector_manifest", "native_evidence", "status"], "native_record");
  gate(record.schema_version === "apollo-pi-dashboard-bridge-native-record-v2" && record.status === "native_prerequisites_only", "native_record_scope");
  const r = record.release, tag = `apollo-passive-v${r?.version}-build.${r?.build}`;
  gate(relative === `bridge-candidates/${tag}.native.json`, "native_path");
  const installerTag = `apollo-pi-installer-v${r?.version}-build.${r?.build}-updater.${r?.updater_version}`;
  const installerPath = `installers/${installerTag}.json`;
  const installer = read(root, record.installer_record, installerPath);
  const validated = installers.find(v => !v.held && v.scope === "installer_onboarding" && v.relative === installerPath);
  gate(validated && JSON.stringify(validated.record) === JSON.stringify(installer), "normal_installer_required");
  equal(r, require("./validate_pi_live_qualification").expectedRelease(installer), "normal_release");
  const normal = read(root, installer.onboarding_qualification, `qualifications/${installerTag}.onboarding.json`);
  // Revalidate the normal signature here too; the record never trusts flags.
  const payload = require("./validate_pi_live_qualification").validateOnboardingEvidence(normal, r, policy, now);
  const inventory = io().validateUpdaterInventory(read(root, record.updater_inventory,
    `qualifications/pi-updater-inventory-${record.updater_inventory?.sha256}.json`), policy, record.minimum_updater_version, r.updater_version, now);
  gate(inventory.payload.updaters.find(u => u.version === r.updater_version)?.package_sha256 === r.updater_sha256, "inventory_target");
  const v2Policy = JSON.parse(io().readBridgeRecord(root, "policy/pi-dashboard-bridge-v2.json")); V.validatePolicy(v2Policy);
  const collector = read(root, record.collector_manifest, `qualifications/pi-bridge-collector-${record.collector_manifest?.sha256}.json`);
  closed(collector, ["schema_version", "source_commit", "producer_sha256", "actor_sha256", "release", "artifacts"], "collector_manifest");
  gate(collector.schema_version === "apollo-pi-dashboard-bridge-collector-v2", "collector_manifest_schema");
  equal(collector.release, r, "collector_release");
  digests(collector.artifacts, ["manifest_sha256", "principal_sha256", "detector_sha256", "starter_sha256"], "target_artifacts");
  const expected = {release: r, agent_sha256: payload.release.agent_sha256, installer_evidence_sha256: installer.onboarding_qualification.sha256,
    minimum_updater_version: record.minimum_updater_version, updater_inventory_sha256: record.updater_inventory.sha256,
    required_updaters: inventory.required_updaters, inventory_collected_at: inventory.payload.collected_at, artifacts: collector.artifacts};
  const native = V.validateNativeEvidence(read(root, record.native_evidence, `qualifications/${tag}.bridge-native-v2.json`), expected, policy, v2Policy, now);
  equal(native.collector, {manifest_sha256: record.collector_manifest.sha256, source_commit: collector.source_commit, producer_sha256: collector.producer_sha256, actor_sha256: collector.actor_sha256}, "collector_record_binding");
  return {record, relative, native, expected, v2Policy};
}
function validateFinalRecord(record, relative, root, policy, installers, now = Date.now()) {
  const raw = io().readBridgeRecord(root, relative).toString("utf8"), canonical = JSON.stringify(record);
  gate(raw === canonical || raw === canonical + "\n", "final_record_noncanonical_json");
  closed(record, ["schema_version", "release", "minimum_updater_version", "native_candidate_record", "compatibility_evidence", "live_rf_reporting"], "final_record");
  gate(record.schema_version === "apollo-pi-dashboard-bridge-record-v2", "final_record_schema");
  const tag = `apollo-passive-v${record.release?.version}-build.${record.release?.build}`;
  gate(relative === `bridges/${tag}.json`, "final_path"); equal(record.live_rf_reporting, RF, "final_rf");
  const nativePath = `bridge-candidates/${tag}.native.json`;
  const candidate = validateNativeRecord(read(root, record.native_candidate_record, nativePath), nativePath, root, policy, installers, now);
  equal(record.release, candidate.record.release, "final_release");
  gate(record.minimum_updater_version === candidate.record.minimum_updater_version, "final_minimum");
  const envelope = read(root, record.compatibility_evidence, `qualifications/${tag}.bridge-v2.json`);
  const proof = signed(envelope, V.FINAL, policy);
  closed(proof, ["schema_version", "delivery_contract", "independent_audit"], "final_payload");
  gate(proof.schema_version === V.FINAL + "-v2", "final_schema");
  const d = proof.delivery_contract;
  closed(d, ["release", "native_record_sha256", "native_evidence_sha256", "plan", "operation_outcome", "owner_http", "completed_at", "live_rf_reporting"], "delivery_contract");
  equal(d.release, record.release, "delivery_release"); equal(d.live_rf_reporting, RF, "delivery_rf");
  gate(d.native_record_sha256 === record.native_candidate_record.sha256 && d.native_evidence_sha256 === candidate.record.native_evidence.sha256, "delivery_native");
  const plan = read(root, d.plan, `probe-operations/${tag}.plan.json`);
  const authorizations = JSON.parse(io().readBridgeRecord(root, "policy/pi-dashboard-probe-authorizations.json"));
  gate(C.exact(authorizations, Object.keys(authorizations || {})), "authorization_map");
  const context = authorizations[hash(JSON.stringify(plan))]; gate(context, "missing_reviewed_operation_authorization");
  const expected = {release: d.release, native_record_sha256: d.native_record_sha256, native_evidence_sha256: d.native_evidence_sha256,
    requirements_sha256: hash(JSON.stringify(requirements(candidate.expected.required_updaters))), collector_manifest_sha256: candidate.record.collector_manifest.sha256};
  const outcome = P.validateCompletedProbe(read(root, d.operation_outcome, `probe-operations/${plan.operation_id}.outcome.json`), plan,
    expected, candidate.v2Policy, context, policy, now);
  gate(time(plan.not_before) >= time(candidate.native.completed_at), "probe_before_native_completion");
  const o = d.owner_http;
  closed(o, ["catalog_url", "descriptor_sha256", "historical_updater", "original_archive_sha256", "original_principal_sha256", "original_worker_sha256",
    "lineage_sha256", "http_transcript_sha256", "visible_confirmation_sha256", "accepted_request_sha256", "queue_sha256", "validated_target_sha256",
    "second_catalog_check_sha256", "worker_status_sha256", "transaction_sha256", "preservation_report_sha256", "post_activation_identity_sha256",
    "progress_sha256", "owner_action_inventory_sha256", "transport"], "owner_http");
  gate(o.catalog_url === P.URL && o.descriptor_sha256 === plan.descriptor_sha256 && o.second_catalog_check_sha256 === outcome.worker_second_check_sha256
    && o.transport === "unchanged_original_dashboard_real_public_https" && candidate.expected.required_updaters.some(u => JSON.stringify(u) === JSON.stringify(o.historical_updater))
    && Object.entries(o).filter(([k]) => k.endsWith("_sha256")).every(([, v]) => hex(v)), "owner_http_binding");
  gate(time(d.completed_at) >= time(outcome.completed_at) && time(d.completed_at) <= now + 300000, "delivery_time");
  const approved = candidate.v2Policy.approved_collectors[candidate.record.collector_manifest.sha256];
  gate(proof.independent_audit?.key_id === approved.audit_key_id, "delivery_audit_signer");
  const audit = signed(proof.independent_audit, V.AUDIT, policy);
  closed(audit, ["schema_version", "delivery_contract_sha256", "raw_artifact_manifest_sha256", "reviewer", "completed_at"], "delivery_audit");
  equal(audit.reviewer, approved.reviewer, "delivery_reviewer_provenance");
  gate(audit.schema_version === V.AUDIT + "-v2" && audit.delivery_contract_sha256 === hash(JSON.stringify(d)) && hex(audit.raw_artifact_manifest_sha256)
    && time(audit.completed_at) >= time(d.completed_at) && time(audit.completed_at) <= now + 300000, "delivery_audit_binding");
  return {record, relative};
}
function validateRepositoryProbe(root, planReference, armingReference, context, runtime, now = Date.now()) {
  const fs = require("node:fs"), path = require("node:path");
  const policy = JSON.parse(io().readBridgeRecord(root, "policy/pi-live-qualification.json"));
  // Preserve ordinary repository validation before considering a temporary
  // operation. This function does not change the normal stable gate.
  const live = require("./validate_pi_live_qualification"); live.validateRepository(root);
  const installers = fs.readdirSync(path.join(root, "installers")).filter(n => n.endsWith(".json")).map(n => {
    const relative = `installers/${n}`, record = JSON.parse(io().readBridgeRecord(root, relative));
    return {...live.validateRecord(record, relative, root, policy), relative};
  });
  gate(typeof planReference?.path === "string", "probe_plan_reference");
  const plan = read(root, planReference, planReference.path);
  const tag = `apollo-passive-v${plan.release?.version}-build.${plan.release?.build}`;
  gate(planReference.path === `probe-operations/${tag}.plan.json`, "probe_plan_path");
  const nativePath = `bridge-candidates/${tag}.native.json`;
  const raw = io().readBridgeRecord(root, nativePath);
  const candidate = validateNativeRecord(JSON.parse(raw), nativePath, root, policy, installers, now);
  gate(time(plan.not_before) >= time(candidate.native.completed_at), "probe_before_native_completion");
  const expected = {release: candidate.record.release, native_record_sha256: hash(raw), native_evidence_sha256: candidate.record.native_evidence.sha256,
    requirements_sha256: hash(JSON.stringify(requirements(candidate.expected.required_updaters))), collector_manifest_sha256: candidate.record.collector_manifest.sha256};
  const armed = read(root, armingReference, `probe-operations/${plan.operation_id}.armed.json`);
  return P.validateProbeEligibility(plan, expected, candidate.v2Policy, context, armed, policy, runtime, now);
}
module.exports = {validateNativeRecord, validateFinalRecord, validateRepositoryProbe};
