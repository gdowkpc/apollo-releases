"use strict";
const fs = require("node:fs"), path = require("node:path");
const C = require("../scripts/pi_bridge_v2_contract"), V = require("../scripts/validate_pi_bridge_compatibility_v2");
const P = require("../scripts/validate_pi_dashboard_delivery_probe"), {probeFixture} = require("./pi_dashboard_probe");
const old = require("../scripts/validate_pi_live_qualification"), bridge = require("../scripts/validate_pi_bridge_compatibility");
function repository(root) {
  const f = probeFixture(), {h, at} = f, r = f.expected.release;
  const tag = `apollo-passive-v${r.version}-build.${r.build}`, installerTag = `apollo-pi-installer-v${r.version}-build.${r.build}-updater.${r.updater_version}`;
  function write(name, value) {
    const bytes = Buffer.from(JSON.stringify(value)), file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, bytes); return {path: name, sha256: C.hash(bytes)};
  }
  Object.assign(f.policy, {allowed_qualification_scopes: ["installer_onboarding", "dashboard_bridge_compatibility"],
    required_lab_role: "owned-rtl-bench", held_installer_sha256_lf: {}, held_stable_fingerprint: "0".repeat(64)});
  write("policy/pi-live-qualification.json", f.policy);
  const phase = (offset, boot) => ({started_at: at(offset), completed_at: at(offset + 180), boot_fingerprint: h(boot),
    checkin: {received_at: at(offset + 30), event_fingerprint: h("checkin" + boot)}, report: null,
    samples: [10, 70, 130].map((s, i) => ({at: at(offset + s), accepted_captures: i + 1, errors: Object.fromEntries(old.ERRORS.map(k => [k, 0])),
      windows: [0, 1].map(index => ({index, sweeps: i + 1, sampled_at: at(offset + s)}))}))});
  const normal = {schema_version: "apollo-pi-onboarding-qualification-v1", release: {...r, agent_sha256: f.expected.agent_sha256},
    lab: {role: "owned-rtl-bench", receiver_kind: "rtl_sdr", registered_before_install: true}, started_at: at(0), completed_at: at(600),
    install: {before_state_sha256: h("normal_state"), after_state_sha256: h("normal_state"), repeat_state_sha256: h("normal_state"), activated_agent_sha256: f.expected.agent_sha256,
      updater_version: r.updater_version, transaction_recorded: true}, pre_reboot: phase(0, "boot1"), post_reboot: phase(300, "boot2"),
    backend: {host: "www.repeaterbook.com", authority_revision: 1, client_binding_verified: true},
    onboarding: {application_source_commit: r.source_commit, website_test_source_commit: "b".repeat(40), website_test_sha256: h("website"), runtime_modules_sha256: h("runtime"),
      test_log_sha256: h("tests"), server_checks: 51, runtime_tests: 57, production_records_mutated: false}, live_rf_reporting: {...C.RF}};
  const normalRef = write(`qualifications/${installerTag}.onboarding.json`, f.signV1(normal, "apollo-pi-onboarding-qualification", old.ONBOARDING_DOMAIN));
  const installer = {schema_version: "apollo-pi-installer-distribution-v3", publication_status: "qualified", qualification_scope: "installer_onboarding", release_tag: installerTag,
    target: {version: r.version, build: r.build, source_commit: r.source_commit, sha256: r.application_sha256}, updater: {version: r.updater_version,
      unchanged_asset_hashes: {[`ApolloUniversalPiUpdater-${r.updater_version}-linux-arm64.zip`]: {sha256: r.updater_sha256}}},
    installer: {filename: `Apollo-Pi-Installer-${r.version}-build.${r.build}-updater.${r.updater_version}-linux-arm64.zip`, sha256: r.installer_sha256, bytes: r.installer_bytes},
    onboarding_qualification: normalRef, live_rf_reporting: {...C.RF}};
  const installerRef = write(`installers/${installerTag}.json`, installer);
  write(`provenance/${tag}.json`, {source: {commit: r.source_commit}, package: {sha256: r.application_sha256}});
  const inventory = {schema_version: "apollo-pi-updater-inventory-v1", repository: "gdowkpc/apollo", collected_at: f.expected.inventory_collected_at,
    complete: true, minimum_updater_version: f.expected.minimum_updater_version, maximum_updater_version: r.updater_version,
    collector_source_commit: "c".repeat(40), manifest_sha256: h("inventory_manifest"), log_sha256: h("inventory_log"),
    updaters: [...f.expected.required_updaters, {version: r.updater_version, package_sha256: r.updater_sha256, capsule_sha256: h("newcapsule")}]};
  const inventoryEnvelope = f.signV1(inventory, "apollo-pi-updater-inventory", bridge.INVENTORY_DOMAIN);
  const inventoryHash = h(JSON.stringify(inventoryEnvelope));
  const inventoryRef = write(`qualifications/pi-updater-inventory-${inventoryHash}.json`, inventoryEnvelope);
  const collector = {schema_version: "apollo-pi-dashboard-bridge-collector-v2", provenance: f.contract.collector.provenance,
    producer_sha256: f.contract.collector.producer_sha256, dependency_manifest_sha256: f.contract.collector.dependency_manifest_sha256,
    actor_sha256: f.contract.collector.actor_sha256, release: r, artifacts: f.expected.artifacts};
  const collectorHash = h(JSON.stringify(collector));
  const collectorRef = write(`qualifications/pi-bridge-collector-${collectorHash}.json`, collector);
  const approved = Object.values(f.v2Policy.approved_collectors)[0]; f.v2Policy.approved_collectors = {[collectorHash]: approved};
  f.contract.collector.manifest_sha256 = collectorHash;
  f.expected.installer_evidence_sha256 = f.contract.installer_evidence_sha256 = normalRef.sha256;
  f.expected.updater_inventory_sha256 = f.contract.updater_inventory_sha256 = inventoryRef.sha256;
  write("policy/pi-dashboard-bridge-v2.json", f.v2Policy);
  const nativeRef = write(`qualifications/${tag}.bridge-native-v2.json`, f.envelope());
  const candidate = {schema_version: "apollo-pi-dashboard-bridge-native-record-v2", release: r, installer_record: installerRef,
    minimum_updater_version: f.expected.minimum_updater_version, updater_inventory: inventoryRef, collector_manifest: collectorRef, native_evidence: nativeRef, status: "native_prerequisites_only"};
  const candidateRef = write(`bridge-candidates/${tag}.native.json`, candidate);
  Object.assign(f.probeExpected, {native_record_sha256: candidateRef.sha256, native_evidence_sha256: nativeRef.sha256, collector_manifest_sha256: collectorHash});
  Object.assign(f.plan, f.probeExpected); f.resetBindings();
  const context = f.state().context;
  write("policy/pi-dashboard-probe-authorizations.json", {[context.plan_sha256]: context});
  const planRef = write(`probe-operations/${tag}.plan.json`, f.plan);
  const outcomeRef = write(`probe-operations/${f.plan.operation_id}.outcome.json`, f.sign(f.state().outcome, P.DOMAIN, "supervisor"));
  const owner = {catalog_url: P.URL, descriptor_sha256: f.plan.descriptor_sha256, historical_updater: f.expected.required_updaters[0],
    ...Object.fromEntries(["original_archive_sha256", "original_principal_sha256", "original_worker_sha256", "lineage_sha256", "http_transcript_sha256", "visible_confirmation_sha256",
      "accepted_request_sha256", "queue_sha256", "validated_target_sha256", "second_catalog_check_sha256", "worker_status_sha256", "transaction_sha256", "preservation_report_sha256",
      "post_activation_identity_sha256", "progress_sha256", "owner_action_inventory_sha256"].map(k => [k, h(k)])), transport: "unchanged_original_dashboard_real_public_https"};
  owner.second_catalog_check_sha256 = f.state().outcome.worker_second_check_sha256;
  const delivery = {release: r, native_record_sha256: candidateRef.sha256, native_evidence_sha256: nativeRef.sha256, plan: planRef, operation_outcome: outcomeRef,
    owner_http: owner, completed_at: at(4200), live_rf_reporting: {...C.RF}};
  const record = {schema_version: "apollo-pi-dashboard-bridge-record-v2", release: r, minimum_updater_version: candidate.minimum_updater_version,
    native_candidate_record: candidateRef, compatibility_evidence: null, live_rf_reporting: {...C.RF}};
  function saveFinal() {
    const audit = f.sign({schema_version: V.AUDIT + "-v2", delivery_contract_sha256: h(JSON.stringify(delivery)), raw_artifact_manifest_sha256: h("delivery_raw"),
      reviewer: approved.reviewer, completed_at: at(4210)}, V.AUDIT, approved.audit_key_id);
    record.compatibility_evidence = write(`qualifications/${tag}.bridge-v2.json`, f.sign({schema_version: V.FINAL + "-v2", delivery_contract: delivery, independent_audit: audit}, V.FINAL));
    write(`bridges/${tag}.json`, record);
  }
  saveFinal();
  write("stable/apollo-passive-receive-linux-arm64.json", {version: r.version, build: r.build, source_commit: r.source_commit, sha256: r.application_sha256, minimum_pi_updater_version: candidate.minimum_updater_version});
  return {...f, tag, write, record, candidate, delivery, saveFinal};
}
module.exports = {repository};
