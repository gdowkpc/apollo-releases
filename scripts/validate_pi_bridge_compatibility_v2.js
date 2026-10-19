"use strict";
const C = require("./pi_bridge_v2_contract");
const {hash, hex, sha, gate, closed, equal, digests, time, signed, RF, BASELINES, NEGATIVES, PHASES, requirements, interval} = C;
const NATIVE = "apollo-pi-dashboard-bridge-native";
const FINAL = "apollo-pi-dashboard-bridge-compatibility";
const AUDIT = "apollo-pi-dashboard-bridge-independent-audit";
const REPLAY = ["sdk_archive_sha256", "sdk_authority_sha256", "sdk_capsule_sha256", "target_manifest_sha256", "target_principal_sha256",
  "target_detector_sha256", "target_starter_sha256", "before_configuration_sha256", "expected_configuration_sha256",
  "measurement_sha256", "measured_serial_sha256", "measured_hardware_identity_sha256", "producer_sha256", "context_sha256"];
function validatePolicy(policy) {
  closed(policy, ["schema_version", "approved_collectors", "maximum_publisher_exposure_seconds", "public_probe_enabled"], "policy");
  gate(policy.schema_version === "apollo-pi-dashboard-bridge-policy-v2" && C.exact(policy.approved_collectors, Object.keys(policy.approved_collectors || {}))
    && Number.isSafeInteger(policy.maximum_publisher_exposure_seconds) && policy.maximum_publisher_exposure_seconds > 0
    && policy.maximum_publisher_exposure_seconds <= 1800 && typeof policy.public_probe_enabled === "boolean", "policy");
  for (const [id, value] of Object.entries(policy.approved_collectors)) {
    gate(hex(id), "collector_digest");
    closed(value, ["provenance", "producer_sha256", "dependency_manifest_sha256", "actor_sha256", "audit_key_id", "reviewer"], "collector_policy");
    closed(value.reviewer, ["actor_sha256", "provenance", "producer_sha256", "dependency_manifest_sha256"], "reviewer_policy");
    C.provenance(value.provenance); C.provenance(value.reviewer.provenance);
    gate(hex(value.producer_sha256) && hex(value.dependency_manifest_sha256) && hex(value.actor_sha256) && typeof value.audit_key_id === "string"
      && hex(value.reviewer.actor_sha256) && value.reviewer.actor_sha256 !== value.actor_sha256
      && hex(value.reviewer.producer_sha256) && hex(value.reviewer.dependency_manifest_sha256), "collector_policy");
  }
}
function preservation(p, baseline, updater, expected, rollback = false, refusal = false) {
  closed(p, ["mode", "before_manifest_sha256", "after_manifest_sha256", "before_configuration_sha256", "expected_configuration_sha256",
    "after_configuration_sha256", "restricted_before_sha256", "restricted_after_sha256", "custody_before_sha256", "custody_after_sha256",
    "owner_before_sha256", "owner_after_sha256", "neutral_before_sha256", "neutral_after_sha256", "location_before_sha256", "location_after_sha256",
    "registration_before_sha256", "registration_after_sha256", "identity_before_sha256", "identity_after_sha256", "canonical_identity_sha256",
    "projection_before_sha256", "projection_after_sha256", "expected_projection_sha256", "raw_six_files_sha256", "delta_manifest_sha256", "replay"], "preservation_fields");
  gate(Object.entries(p).filter(([k]) => !["mode", "replay"].includes(k)).every(([, v]) => hex(v)), "preservation_digest");
  for (const key of ["restricted", "custody", "owner", "neutral", "location", "registration", "identity"])
    gate(p[key + "_before_sha256"] === p[key + "_after_sha256"], "preservation_" + key);
  gate(p.identity_after_sha256 === p.canonical_identity_sha256, "canonical_identity");
  const binding = !rollback && !refusal && baseline === "original307_unbound";
  gate(p.mode === (rollback ? "exact_raw_rollback" : refusal ? "unchanged_native_refusal" : binding ? "legacy_neutral_rtl_first_binding" : "ordinary_bound_exact"), "preservation_mode");
  gate(p.expected_configuration_sha256 === p.after_configuration_sha256 && p.expected_projection_sha256 === p.projection_after_sha256, "expected_bytes");
  if (!binding) {
    gate(p.before_configuration_sha256 === p.after_configuration_sha256 && p.replay === null, "exact_configuration");
    if (rollback || refusal) gate(p.before_manifest_sha256 === p.after_manifest_sha256
      && p.projection_before_sha256 === p.projection_after_sha256, "exact_raw_state");
  } else {
    digests(p.replay, REPLAY, "replay_fields");
    gate(p.replay.sdk_archive_sha256 === updater.package_sha256 && p.replay.sdk_capsule_sha256 === updater.capsule_sha256
      && p.replay.target_manifest_sha256 === expected.artifacts.manifest_sha256
      && p.replay.target_principal_sha256 === expected.artifacts.principal_sha256
      && p.replay.target_detector_sha256 === expected.artifacts.detector_sha256
      && p.replay.target_starter_sha256 === expected.artifacts.starter_sha256
      && p.replay.before_configuration_sha256 === p.before_configuration_sha256
      && p.replay.expected_configuration_sha256 === p.expected_configuration_sha256
      && p.replay.producer_sha256 === expected.collector.producer_sha256
      && p.expected_configuration_sha256 !== p.before_configuration_sha256, "replay_binding");
  }
}
function baseline(value, kind, updater, start) {
  closed(value, ["kind", "source_commit", "application_sha256", "archive_sha256", "manifest_sha256", "principal_sha256", "constructor_sha256",
    "import_sha256", "transaction_inventory_sha256", "root_custody_sha256", "state_sha256", "configured_windows", "progress"], "baseline");
  gate(value.kind === kind && sha(value.source_commit) && ["application", "archive", "manifest", "principal", "constructor", "import", "transaction_inventory", "root_custody", "state"].every(k => hex(value[k + "_sha256"])), "baseline_binding");
  gate(Array.isArray(value.configured_windows) && value.configured_windows.length > 0
    && new Set(value.configured_windows).size === value.configured_windows.length
    && value.configured_windows.every(n => Number.isSafeInteger(n) && n >= 0), "windows");
  if (kind === "original307_unbound") gate(value.progress === null, "unbound_cannot_claim_health");
  else progress(value.progress, time(value.progress?.started_at), start, value.configured_windows);
}
function progress(value, start, end, windows) {
  // Reuse the unchanged v1 sustained-progress validator, including all six
  // zero-error counters, complete windows and at least two minutes of growth.
  require("./validate_pi_bridge_compatibility").validateBridgeProgress(value, start, end, windows);
}
function nativeContract(p, expected, now) {
  gate(Array.isArray(expected.required_updaters) && expected.required_updaters.length > 0 && expected.required_updaters.length <= 32
    && new Set(expected.required_updaters.map(u => u.version)).size === expected.required_updaters.length, "expected_inventory");
  closed(p, ["release", "agent_sha256", "installer_evidence_sha256", "updater_inventory_sha256", "minimum_updater_version", "requirements_sha256",
    "collector", "artifacts", "started_at", "completed_at", "lab", "cases", "safeguards", "native_no_device_refusal", "first_save", "components", "live_rf_reporting"], "native_fields");
  for (const key of ["release", "agent_sha256", "installer_evidence_sha256", "updater_inventory_sha256", "minimum_updater_version", "artifacts"])
    equal(p[key], expected[key], "binding_" + key);
  equal(p.live_rf_reporting, RF, "rf_scope");
  equal(p.lab, {role: "owned-rtl-bench", physical_usb: true, production_credentials_used: false, production_records_mutated: false,
    service_adapters: false, process_adapters: false, hardware_adapters: false, authority_adapters: false, health_adapters: false}, "lab");
  const a = time(p.started_at), b = time(p.completed_at);
  gate(b > a && b <= now + 300000 && b - a <= 7 * 86400000 && time(expected.inventory_collected_at) <= a, "native_interval");
  equal(p.collector, expected.collector, "collector");
  gate(p.requirements_sha256 === hash(JSON.stringify(requirements(expected.required_updaters))), "requirements");
  const keys = new Set();
  gate(Array.isArray(p.cases) && p.cases.length === expected.required_updaters.length * BASELINES.length, "matrix");
  for (const value of p.cases) {
    closed(value, ["updater", "baseline", "activation_branch", "rollback_branch", "phases", "raw_manifest_sha256"], "case");
    const updater = expected.required_updaters.find(u => u.version === value.updater?.version);
    gate(updater && BASELINES.includes(value.baseline?.kind), "case_inventory"); equal(value.updater, updater, "updater");
    const key = updater.version + ":" + value.baseline.kind;
    gate(!keys.has(key) && hex(value.raw_manifest_sha256), "duplicate_case"); keys.add(key);
    baseline(value.baseline, value.baseline.kind, updater, a);
    const branches = [value.activation_branch, value.rollback_branch];
    for (const branch of branches) {
      digests(branch, ["lineage_sha256", "root_custody_sha256", "baseline_import_sha256", "baseline_export_sha256"], "branch");
      gate(branch.baseline_export_sha256 === value.baseline.state_sha256, "branch_baseline");
    }
    gate(branches[0].lineage_sha256 !== branches[1].lineage_sha256 && branches[0].root_custody_sha256 !== branches[1].root_custody_sha256, "branch_isolation");
    gate(Array.isArray(value.phases) && value.phases.length === PHASES.length, "phases");
    const transactions = new Set(); let prior = a;
    for (let i = 0; i < PHASES.length; i++) {
      const phase = value.phases[i];
      closed(phase, ["kind", "started_at", "completed_at", "lineage_sha256", "before_state_sha256", "after_state_sha256", "transaction_sha256",
        "worker_sha256", "request_sha256", "journals_sha256", "descriptor_sha256", "logs_sha256", "incarnation_sha256", "application_identity", "installed_updater", "fault",
        "preservation", "progress", "outcome"], "phase");
      gate(phase.kind === PHASES[i], "phase_order");
      const [pa, pb] = interval(phase, a, b); gate(pa >= prior, "phase_time"); prior = pb;
      gate(["lineage", "before_state", "after_state", "transaction", "worker", "request", "journals", "descriptor", "logs", "incarnation"].every(k => hex(phase[k + "_sha256"])), "phase_digest");
      gate(phase.lineage_sha256 === branches[i < 2 ? 0 : 1].lineage_sha256, "phase_lineage");
      if (i > 0 && i !== 2) gate(phase.before_state_sha256 === value.phases[i - 1].after_state_sha256, "phase_continuity");
      if (i === 0 || i === 2) gate(phase.before_state_sha256 === value.baseline.state_sha256, "phase_initial_state");
      if (i !== 1 && i !== 3) { gate(!transactions.has(phase.transaction_sha256), "transaction_reuse"); transactions.add(phase.transaction_sha256); }
      const rollback = i === 3;
      equal(phase.installed_updater, updater, "retained_actual_sdk");
      equal(phase.application_identity, rollback ? {application_sha256: value.baseline.application_sha256,
        source_commit: value.baseline.source_commit, principal_sha256: value.baseline.principal_sha256}
        : {application_sha256: expected.release.application_sha256, source_commit: expected.release.source_commit,
          principal_sha256: expected.artifacts.principal_sha256}, "phase_application_identity");
      if (i === 2) {
        closed(phase.fault, ["code_sha256", "target_application_sha256", "triggered_at", "stopped_at", "helper_settled_at", "stop_exit_code", "stop_count", "logs_sha256"], "fault");
        gate(hex(phase.fault.code_sha256) && hex(phase.fault.logs_sha256) && phase.fault.target_application_sha256 === expected.release.application_sha256
          && phase.fault.stop_exit_code === 0 && phase.fault.stop_count === 1 && time(phase.fault.triggered_at) >= pa
          && time(phase.fault.stopped_at) >= time(phase.fault.triggered_at) && time(phase.fault.helper_settled_at) >= time(phase.fault.stopped_at)
          && time(phase.fault.helper_settled_at) <= pb, "actual_settled_fault");
      } else gate(phase.fault === null, "unexpected_fault");
      gate(phase.outcome === (i === 2 ? "actual_one_shot_target_failure" : rollback ? value.baseline.kind === "original307_unbound" ? "original_setup_restored" : "healthy_baseline_restored" : "target_processing_ready"), "phase_outcome");
      preservation(phase.preservation, i === 1 ? "healthy_observed331_bound" : value.baseline.kind, updater, expected, rollback);
      if (rollback) gate(phase.after_state_sha256 === value.baseline.state_sha256, "rollback_original");
      if (i === 2 || rollback && value.baseline.kind === "original307_unbound") gate(phase.progress === null, "nonhealthy_phase");
      else progress(phase.progress, pa, pb, value.baseline.configured_windows);
    }
    gate(value.phases[0].incarnation_sha256 !== value.phases[1].incarnation_sha256, "restart_incarnation");
  }
  // Synthetic device inventories are legitimate component-test inputs, never
  // evidence of physical multi-device/calibration injection or queued refusal.
  gate(Array.isArray(p.safeguards) && p.safeguards.length === expected.required_updaters.length, "safeguard_inventory");
  const guarded = new Set();
  for (const suite of p.safeguards) {
    closed(suite, ["scope", "updater", "release", "artifacts", "test_provenance", "sdk_authority_sha256", "sdk_caller_sha256", "producer_sha256",
      "dependency_manifest_sha256", "raw_manifest_sha256", "synthetic_hardware_inputs", "queued_activation_claimed", "cases"], "safeguard_fields");
    gate(suite.scope === "verified_package_sdk_component_tests" && suite.synthetic_hardware_inputs === true && suite.queued_activation_claimed === false, "safeguard_scope");
    const updater = expected.required_updaters.find(u => u.version === suite.updater?.version);
    gate(updater && !guarded.has(updater.version), "safeguard_coverage"); guarded.add(updater.version);
    equal(suite.updater, updater, "safeguard_sdk"); equal(suite.release, expected.release, "safeguard_release"); equal(suite.artifacts, expected.artifacts, "safeguard_artifacts");
    C.provenance(suite.test_provenance);
    gate(["sdk_authority_sha256", "sdk_caller_sha256", "producer_sha256", "dependency_manifest_sha256", "raw_manifest_sha256"].every(k => hex(suite[k])), "safeguard_digests");
    gate(Array.isArray(suite.cases) && suite.cases.length === NEGATIVES.length, "safeguard_matrix");
    const seen = new Set();
    for (const negative of suite.cases) {
      closed(negative, ["kind", "code", "input_manifest_sha256", "state_before_sha256", "state_after_sha256", "raw_case_sha256"], "safeguard_case");
      gate(NEGATIVES.includes(negative.kind) && !seen.has(negative.kind), "safeguard_family"); seen.add(negative.kind);
      gate(typeof negative.code === "string" && /^generic_[a-z_]{1,120}$/.test(negative.code) && hex(negative.input_manifest_sha256)
        && hex(negative.raw_case_sha256) && hex(negative.state_before_sha256) && negative.state_before_sha256 === negative.state_after_sha256, "safeguard_no_writes");
    }
  }
  const refusal = p.native_no_device_refusal;
  closed(refusal, ["scope", "updater", "release", "artifacts", "code", "physical_usb_present", "hardware_adapters", "queued_activation_claimed",
    "producer_sha256", "dependency_manifest_sha256", "pointers_before_sha256", "pointers_after_sha256", "transactions_before_sha256", "transactions_after_sha256",
    "raw_manifest_sha256", "preservation"], "no_device_refusal");
  gate(refusal.scope === "direct_verified_package_component" && refusal.code === "generic_target_receiver_selection_required"
    && refusal.physical_usb_present === false && refusal.hardware_adapters === false && refusal.queued_activation_claimed === false
    && expected.required_updaters.some(u => JSON.stringify(u) === JSON.stringify(refusal.updater)), "no_device_scope");
  equal(refusal.release, expected.release, "no_device_release"); equal(refusal.artifacts, expected.artifacts, "no_device_artifacts");
  gate(["producer_sha256", "dependency_manifest_sha256", "pointers_before_sha256", "transactions_before_sha256", "raw_manifest_sha256"].every(k => hex(refusal[k]))
    && refusal.pointers_before_sha256 === refusal.pointers_after_sha256 && refusal.transactions_before_sha256 === refusal.transactions_after_sha256, "no_device_no_writes");
  preservation(refusal.preservation, "original307_unbound", refusal.updater, expected, false, true);
  const save = p.first_save;
  closed(save, ["baseline_kind", "constructor_sha256", "lineage_sha256", "before_state_sha256", "get_http_sha256", "save_http_sha256", "identity_recheck_sha256",
    "registration_before_sha256", "registration_after_sha256", "owner_before_sha256", "owner_after_sha256", "location_before_sha256", "location_after_sha256",
    "neutral_before_sha256", "neutral_after_sha256", "configuration_replay_sha256", "raw_manifest_sha256", "configured_windows", "progress"], "first_save");
  gate(save.baseline_kind === "target_registered_unbound" && Object.entries(save).filter(([k]) => !["baseline_kind", "configured_windows", "progress"].includes(k)).every(([, v]) => hex(v)), "first_save_binding");
  for (const key of ["registration", "owner", "location", "neutral"]) gate(save[key + "_before_sha256"] === save[key + "_after_sha256"], "save_preservation");
  gate(!p.cases.some(v => [v.activation_branch, v.rollback_branch].some(branch => branch.lineage_sha256 === save.lineage_sha256)), "save_distinct_lineage");
  progress(save.progress, a, b, save.configured_windows);
  gate(Array.isArray(p.components) && p.components.length === expected.required_updaters.length, "components");
  const components = new Set();
  for (const component of p.components) {
    closed(component, ["from_updater", "to_updater_version", "request_kind", "result_code", "application_before_sha256", "application_after_sha256", "state_before_sha256",
      "state_after_sha256", "installed_archive_sha256", "authority_sha256", "pointer_sha256", "receipt_sha256", "transaction_sha256", "raw_manifest_sha256"], "component");
    const updater = expected.required_updaters.find(u => u.version === component.from_updater?.version);
    gate(updater && !components.has(updater.version), "component_coverage"); components.add(updater.version); equal(component.from_updater, updater, "component_sdk");
    gate(component.to_updater_version === expected.release.updater_version && component.request_kind === "separate_same_application_request"
      && component.result_code === "dashboard_update_not_newer" && component.application_before_sha256 === expected.release.application_sha256
      && component.application_after_sha256 === component.application_before_sha256 && component.state_before_sha256 === component.state_after_sha256
      && component.installed_archive_sha256 === expected.release.updater_sha256
      && Object.entries(component).filter(([k]) => k.endsWith("_sha256")).every(([, v]) => hex(v)), "component_binding");
  }
  return p;
}
function validateNativeEvidence(envelope, expected, policy, v2Policy, now = Date.now()) {
  validatePolicy(v2Policy);
  gate(policy.allowed_qualification_scopes?.includes("dashboard_bridge_compatibility"), "scope");
  const p = signed(envelope, NATIVE, policy);
  closed(p, ["schema_version", "native_contract", "independent_audit"], "native_payload");
  gate(p.schema_version === NATIVE + "-v2", "native_schema");
  const collector = p.native_contract?.collector;
  closed(collector, ["manifest_sha256", "provenance", "producer_sha256", "dependency_manifest_sha256", "actor_sha256"], "collector_fields");
  C.provenance(collector.provenance);
  const approved = v2Policy.approved_collectors[collector.manifest_sha256];
  gate(approved && collector.producer_sha256 === approved.producer_sha256 && collector.dependency_manifest_sha256 === approved.dependency_manifest_sha256
    && collector.actor_sha256 === approved.actor_sha256, "unapproved_collector");
  equal(collector.provenance, approved.provenance, "collector_provenance_binding");
  const contract = nativeContract(p.native_contract, {...expected, collector}, now);
  gate(p.independent_audit?.key_id === approved.audit_key_id, "audit_signer");
  const audit = signed(p.independent_audit, AUDIT, policy);
  closed(audit, ["schema_version", "native_contract_sha256", "collector_manifest_sha256", "raw_artifact_manifest_sha256", "replay_manifest_sha256", "reviewer", "completed_at"], "audit");
  equal(audit.reviewer, approved.reviewer, "reviewer_provenance");
  gate(audit.schema_version === AUDIT + "-v2" && audit.native_contract_sha256 === hash(JSON.stringify(contract))
    && audit.collector_manifest_sha256 === collector.manifest_sha256 && hex(audit.raw_artifact_manifest_sha256) && hex(audit.replay_manifest_sha256)
    && time(audit.completed_at) >= time(contract.completed_at) && time(audit.completed_at) <= now + 300000, "audit_binding");
  return contract;
}
module.exports = {NATIVE, FINAL, AUDIT, REPLAY, validatePolicy, preservation, nativeContract, validateNativeEvidence};
