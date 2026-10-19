"use strict";
// Synthetic source-validator fixtures only. No production key or pass receipt.
const crypto = require("node:crypto");
const C = require("../scripts/pi_bridge_v2_contract"), V = require("../scripts/validate_pi_bridge_compatibility_v2");
const {EMPTY_ERRORS_SHA256} = require("../scripts/validate_pi_bridge_compatibility");
const h = value => C.hash(String(value)), at = seconds => new Date(Date.UTC(2026, 9, 19, 12, 0, seconds)).toISOString();
function fixture() {
  const keys = Object.fromEntries(["collector", "auditor", "supervisor"].map(id => [id, crypto.generateKeyPairSync("ed25519")]));
  const policy = {allowed_qualification_scopes: ["dashboard_bridge_compatibility"], trusted_keys: Object.fromEntries(Object.entries(keys)
    .map(([id, value]) => [id, value.publicKey.export({type: "spki", format: "pem"})]))};
  function sign(value, prefix, id = "collector") {
    const bytes = Buffer.from(JSON.stringify(value));
    return {schema_version: prefix + "-attestation-v2", key_id: id, payload: bytes.toString("base64"),
      signature: crypto.sign(null, Buffer.concat([Buffer.from(prefix + "-v2\n"), bytes]), keys[id].privateKey).toString("base64")};
  }
  function signV1(value, prefix, domain) {
    const bytes = Buffer.from(JSON.stringify(value));
    return {schema_version: prefix + "-attestation-v1", key_id: "collector", payload: bytes.toString("base64"),
      signature: crypto.sign(null, Buffer.concat([domain, bytes]), keys.collector.privateKey).toString("base64")};
  }
  function signBytes(text, prefix) {
    const bytes = Buffer.from(text);
    return {schema_version: prefix + "-attestation-v2", key_id: "collector", payload: bytes.toString("base64"),
      signature: crypto.sign(null, Buffer.concat([Buffer.from(prefix + "-v2\n"), bytes]), keys.collector.privateKey).toString("base64")};
  }
  const release = {version: "4.0.9", build: 999, source_commit: "a".repeat(40), application_sha256: h("application"), updater_version: "2.0.9",
    updater_sha256: h("new_sdk"), installer_sha256: h("installer"), installer_bytes: 12345};
  const updaters = [5, 7].map(n => ({version: "2.0." + n, package_sha256: h("sdk" + n), capsule_sha256: h("capsule" + n)}));
  const collector = {manifest_sha256: h("collector_manifest"), provenance: {kind: "reviewed_artifact_bundle", bundle_sha256: h("collector_bundle"), code_manifest_sha256: h("collector_code_manifest")},
    producer_sha256: h("producer"), dependency_manifest_sha256: h("collector_dependencies"), actor_sha256: h("collection_actor")};
  const v2Policy = {schema_version: "apollo-pi-dashboard-bridge-policy-v2", approved_collectors: {[collector.manifest_sha256]: {
    provenance: {...collector.provenance}, producer_sha256: collector.producer_sha256, dependency_manifest_sha256: collector.dependency_manifest_sha256, actor_sha256: collector.actor_sha256, audit_key_id: "auditor",
    reviewer: {actor_sha256: h("independent_review_actor"), provenance: {kind: "reviewed_artifact_bundle", bundle_sha256: h("review_bundle"), code_manifest_sha256: h("review_code_manifest")},
      producer_sha256: h("review_producer"), dependency_manifest_sha256: h("review_dependencies")}}}, maximum_publisher_exposure_seconds: 1800, public_probe_enabled: false};
  const artifacts = Object.fromEntries(["manifest_sha256", "principal_sha256", "detector_sha256", "starter_sha256"].map(k => [k, h(k)]));
  const expected = {release, agent_sha256: h("agent"), installer_evidence_sha256: h("normal"), updater_inventory_sha256: h("inventory"),
    minimum_updater_version: "2.0.5", required_updaters: updaters, inventory_collected_at: at(-10), artifacts};
  function progress(offset = 0) {
    return {started_at: at(offset), completed_at: at(offset + 121), samples: [0, 60, 120].map((s, i) => ({at: at(offset + s), accepted_captures: i + 1,
      errors_sha256: EMPTY_ERRORS_SHA256, windows: [0, 1].map(index => ({index, sweeps: i + 1, sampled_at: at(offset + s)}))}))};
  }
  function preservation(kind, updater, rollback = false, refusal = false) {
    const bind = !rollback && !refusal && kind === "original307_unbound";
    const p = {mode: rollback ? "exact_raw_rollback" : refusal ? "unchanged_native_refusal" : bind ? "legacy_neutral_rtl_first_binding" : "ordinary_bound_exact",
      ...Object.fromEntries(["before_manifest_sha256", "after_manifest_sha256", "before_configuration_sha256", "expected_configuration_sha256", "after_configuration_sha256",
        "restricted_before_sha256", "restricted_after_sha256", "custody_before_sha256", "custody_after_sha256", "owner_before_sha256", "owner_after_sha256", "neutral_before_sha256",
        "neutral_after_sha256", "location_before_sha256", "location_after_sha256", "registration_before_sha256", "registration_after_sha256", "identity_before_sha256",
        "identity_after_sha256", "canonical_identity_sha256", "projection_before_sha256", "projection_after_sha256", "expected_projection_sha256", "raw_six_files_sha256", "delta_manifest_sha256"].map(k => [k, h("same")])), replay: null};
    if (bind) {
      p.expected_configuration_sha256 = p.after_configuration_sha256 = h("expected_target_config");
      p.replay = Object.fromEntries(V.REPLAY.map(k => [k, h(k)]));
      Object.assign(p.replay, {sdk_archive_sha256: updater.package_sha256, sdk_capsule_sha256: updater.capsule_sha256,
        target_manifest_sha256: artifacts.manifest_sha256, target_principal_sha256: artifacts.principal_sha256, target_detector_sha256: artifacts.detector_sha256,
        target_starter_sha256: artifacts.starter_sha256, before_configuration_sha256: p.before_configuration_sha256,
        expected_configuration_sha256: p.expected_configuration_sha256, producer_sha256: collector.producer_sha256});
    }
    return p;
  }
  const contract = {release, agent_sha256: expected.agent_sha256, installer_evidence_sha256: expected.installer_evidence_sha256,
    updater_inventory_sha256: expected.updater_inventory_sha256, minimum_updater_version: expected.minimum_updater_version,
    requirements_sha256: h(JSON.stringify(C.requirements(updaters))), collector, artifacts, started_at: at(0), completed_at: at(2000),
    lab: {role: "owned-rtl-bench", physical_usb: true, production_credentials_used: false, production_records_mutated: false,
      service_adapters: false, process_adapters: false, hardware_adapters: false, authority_adapters: false, health_adapters: false}, cases: [],
    first_save: null, components: [], live_rf_reporting: {...C.RF}};
  for (const updater of updaters) for (const kind of C.BASELINES) {
    const seed = updater.version + kind;
    const branch = suffix => Object.fromEntries(["lineage_sha256", "root_custody_sha256", "baseline_import_sha256", "baseline_export_sha256"].map(k => [k, h(seed + suffix + k)]));
    const activation = branch("a"), rollback = branch("b"), state = h(seed + "baseline");
    activation.baseline_export_sha256 = rollback.baseline_export_sha256 = state;
    const baseline = {kind, source_commit: "c".repeat(40), ...Object.fromEntries(["application_sha256", "archive_sha256", "manifest_sha256", "principal_sha256",
      "constructor_sha256", "import_sha256", "transaction_inventory_sha256", "root_custody_sha256"].map(k => [k, h(seed + k)])), state_sha256: state,
      configured_windows: [0, 1], progress: kind === "original307_unbound" ? null : progress(-130)};
    const phases = C.PHASES.map((name, i) => ({kind: name, started_at: at(i * 200), completed_at: at(i * 200 + 150), lineage_sha256: (i < 2 ? activation : rollback).lineage_sha256,
      before_state_sha256: i === 0 || i === 2 || i === 4 ? state : h(seed + "state" + (i - 1)), after_state_sha256: i === 3 ? state : h(seed + "state" + i),
      ...Object.fromEntries(["transaction_sha256", "worker_sha256", "request_sha256", "journals_sha256", "descriptor_sha256", "logs_sha256", "incarnation_sha256"].map(k => [k, h(seed + i + k)])),
      application_identity: i === 3 ? {application_sha256: baseline.application_sha256, source_commit: baseline.source_commit, principal_sha256: baseline.principal_sha256}
        : {application_sha256: release.application_sha256, source_commit: release.source_commit, principal_sha256: artifacts.principal_sha256}, installed_updater: {...updater},
      fault: i === 2 ? {code_sha256: h("one_shot_code"), target_application_sha256: release.application_sha256, triggered_at: at(401), stopped_at: at(402),
        helper_settled_at: at(403), stop_exit_code: 0, stop_count: 1, logs_sha256: h("actual_stop")} : null,
      preservation: preservation(i === 1 ? "healthy_observed331_bound" : kind, updater, i === 3), progress: i === 2 || i === 3 && kind === "original307_unbound" ? null : progress(i * 200),
      outcome: i === 2 ? "actual_one_shot_target_failure" : i === 3 ? kind === "original307_unbound" ? "original_setup_restored" : "healthy_baseline_restored" : "target_processing_ready"}));
    contract.cases.push({updater: {...updater}, baseline, activation_branch: activation, rollback_branch: rollback, phases,
      raw_manifest_sha256: h(seed + "raw")});
  }
  contract.safeguards = updaters.map(updater => ({scope: "verified_package_sdk_component_tests", updater: {...updater}, release, artifacts,
    test_provenance: {...collector.provenance}, sdk_authority_sha256: h("sdk_authority"), sdk_caller_sha256: h("actual_sdk_caller"), producer_sha256: h("safeguard_producer"),
    dependency_manifest_sha256: h("safeguard_dependencies"), raw_manifest_sha256: h("safeguards"), synthetic_hardware_inputs: true, queued_activation_claimed: false,
    cases: C.NEGATIVES.map(kind => ({kind, code: "generic_target_receiver_selection_required", input_manifest_sha256: h(kind), state_before_sha256: h("unchanged"),
      state_after_sha256: h("unchanged"), raw_case_sha256: h("raw" + kind)}))}));
  contract.native_no_device_refusal = {scope: "direct_verified_package_component", updater: {...updaters[0]}, release, artifacts, code: "generic_target_receiver_selection_required",
    physical_usb_present: false, hardware_adapters: false, queued_activation_claimed: false, producer_sha256: h("native_no_device_producer"), dependency_manifest_sha256: h("native_dependencies"),
    pointers_before_sha256: h("pointers"), pointers_after_sha256: h("pointers"), transactions_before_sha256: h("transactions"), transactions_after_sha256: h("transactions"),
    raw_manifest_sha256: h("native_no_device"), preservation: preservation("original307_unbound", updaters[0], false, true)};
  contract.first_save = {baseline_kind: "target_registered_unbound", ...Object.fromEntries(["constructor_sha256", "lineage_sha256", "before_state_sha256", "get_http_sha256", "save_http_sha256",
    "identity_recheck_sha256", "registration_before_sha256", "registration_after_sha256", "owner_before_sha256", "owner_after_sha256", "location_before_sha256", "location_after_sha256",
    "neutral_before_sha256", "neutral_after_sha256", "configuration_replay_sha256", "raw_manifest_sha256"].map(k => [k, h("save")])), configured_windows: [0, 1], progress: progress(1200)};
  contract.components = updaters.map(u => ({from_updater: {...u}, to_updater_version: release.updater_version, request_kind: "separate_same_application_request",
    result_code: "dashboard_update_not_newer", application_before_sha256: release.application_sha256, application_after_sha256: release.application_sha256,
    state_before_sha256: h("component_state"), state_after_sha256: h("component_state"), installed_archive_sha256: release.updater_sha256,
    authority_sha256: h("authority"), pointer_sha256: h("pointer"), receipt_sha256: h("receipt"), transaction_sha256: h("component"), raw_manifest_sha256: h("raw") }));
  function envelope() {
    const approved = v2Policy.approved_collectors[collector.manifest_sha256];
    const audit = sign({schema_version: V.AUDIT + "-v2", native_contract_sha256: h(JSON.stringify(contract)), collector_manifest_sha256: collector.manifest_sha256,
      raw_artifact_manifest_sha256: h("audit_raw"), replay_manifest_sha256: h("audit_replay"), reviewer: approved?.reviewer || {}, completed_at: at(2010)}, V.AUDIT, approved?.audit_key_id || "auditor");
    return sign({schema_version: V.NATIVE + "-v2", native_contract: contract, independent_audit: audit}, V.NATIVE);
  }
  return {h, at, sign, signV1, signBytes, policy, v2Policy, expected, contract, envelope, now: Date.parse(at(2200))};
}
module.exports = {fixture, h, at};
