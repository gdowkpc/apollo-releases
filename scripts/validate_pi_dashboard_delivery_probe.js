"use strict";
const C = require("./pi_bridge_v2_contract");
const {hash, hex, sha, gate, closed, equal, time, signed} = C;
const URL = "https://raw.githubusercontent.com/gdowkpc/apollo-releases/main/stable/apollo-passive-receive-linux-arm64.json";
const RELATIVE = "stable/apollo-passive-receive-linux-arm64.json";
const RISKS = ["global_public_visibility", "independent_client_actions_possible", "cached_descriptor_residual",
  "queued_update_residual", "catalog_restore_not_device_rollback"];
const DOMAIN = "apollo-pi-dashboard-delivery-probe-execution";
function validatePlan(plan, expected, v2Policy) {
  closed(plan, ["schema_version", "operation_id", "catalog_url", "catalog_relative_path", "base_main_sha", "preimage_sha256", "descriptor_sha256",
    "native_record_sha256", "native_evidence_sha256", "release", "requirements_sha256", "collector_manifest_sha256", "not_before", "restore_deadline",
    "maximum_exposure_seconds", "restore_plan_sha256", "restore_preimage_sha256", "risks"], "probe_plan");
  gate(plan.schema_version === "apollo-pi-dashboard-delivery-probe-plan-v1" && /^[a-f0-9]{32}$/.test(plan.operation_id || "")
    && plan.catalog_url === URL && plan.catalog_relative_path === RELATIVE && sha(plan.base_main_sha), "probe_identity");
  equal(plan.release, expected.release, "probe_release");
  for (const key of ["native_record_sha256", "native_evidence_sha256", "requirements_sha256", "collector_manifest_sha256"])
    gate(hex(plan[key]) && plan[key] === expected[key], "probe_binding_" + key);
  gate(["preimage_sha256", "descriptor_sha256", "restore_plan_sha256", "restore_preimage_sha256"].every(k => hex(plan[k]))
    && plan.restore_preimage_sha256 === plan.preimage_sha256 && plan.descriptor_sha256 !== plan.preimage_sha256, "probe_hashes");
  const a = time(plan.not_before), b = time(plan.restore_deadline);
  gate(Number.isSafeInteger(plan.maximum_exposure_seconds) && plan.maximum_exposure_seconds > 0
    && plan.maximum_exposure_seconds <= v2Policy.maximum_publisher_exposure_seconds
    && b > a && b - a <= plan.maximum_exposure_seconds * 1000, "probe_window");
  equal(plan.risks, RISKS, "probe_risks");
  return plan;
}
function approval(context, plan) {
  // This context is supplied by the guarded publisher from direct human review,
  // not read from a plan or qualification payload. A caller must authenticate it.
  closed(context, ["plan_sha256", "policy_sha256", "publish_head", "restore_head", "approval_evidence_sha256", "approved_risks",
    "supervisor_key_id", "supervisor_code_sha256"], "probe_authorization");
  gate(context.plan_sha256 === hash(JSON.stringify(plan)) && hex(context.policy_sha256) && sha(context.publish_head)
    && sha(context.restore_head) && context.publish_head !== context.restore_head && hex(context.approval_evidence_sha256)
    && typeof context.supervisor_key_id === "string" && hex(context.supervisor_code_sha256), "probe_authorization_binding");
  equal(context.approved_risks, RISKS, "probe_authorization_risks");
}
function validateProbeEligibility(plan, expected, v2Policy, context, armingEnvelope, policy, runtime, now = Date.now()) {
  require("./validate_pi_bridge_compatibility_v2").validatePolicy(v2Policy);
  gate(v2Policy.public_probe_enabled === true, "public_probe_disabled");
  validatePlan(plan, expected, v2Policy); approval(context, plan);
  gate(context.policy_sha256 === hash(JSON.stringify(v2Policy)), "probe_policy_binding");
  gate(armingEnvelope?.key_id === context.supervisor_key_id, "supervisor_signer");
  const armed = signed(armingEnvelope, DOMAIN, policy);
  closed(armed, ["schema_version", "state", "operation_id", "plan_sha256", "policy_sha256", "approval_evidence_sha256", "publish_head", "restore_head", "supervisor_code_sha256",
    "armed_at", "heartbeat_at", "restore_deadline", "write_probe_sha256", "cas_preimage_sha256", "lease_sha256", "ledger_sha256"], "arming");
  gate(armed.schema_version === DOMAIN + "-v2" && armed.state === "ARMED" && armed.operation_id === plan.operation_id, "arming_state");
  for (const k of ["plan_sha256", "policy_sha256", "approval_evidence_sha256", "publish_head", "restore_head", "supervisor_code_sha256"])
    gate(armed[k] === context[k], "arming_binding");
  gate(time(armed.armed_at) <= time(armed.heartbeat_at) && time(armed.heartbeat_at) <= now && now - time(armed.heartbeat_at) <= 30000
    && now >= time(plan.not_before) && now < time(plan.restore_deadline) && armed.restore_deadline === plan.restore_deadline
    && armed.cas_preimage_sha256 === plan.preimage_sha256 && [armed.write_probe_sha256, armed.lease_sha256, armed.ledger_sha256].every(hex), "arming_liveness");
  closed(runtime, ["current_main_sha", "current_descriptor_sha256", "operation_id", "ledger_sha256", "lease_sha256", "state", "elapsed_seconds"], "probe_runtime");
  gate(runtime.current_main_sha === plan.base_main_sha && runtime.current_descriptor_sha256 === plan.preimage_sha256
    && runtime.operation_id === plan.operation_id && runtime.ledger_sha256 === armed.ledger_sha256 && runtime.lease_sha256 === armed.lease_sha256
    && runtime.state === "ARMED_UNUSED" && Number.isFinite(runtime.elapsed_seconds) && runtime.elapsed_seconds >= 0
    && runtime.elapsed_seconds < plan.maximum_exposure_seconds, "probe_cas_or_reuse");
  return {scope: "native_public_probe_only", plan_sha256: context.plan_sha256, expires_at: plan.restore_deadline};
}
function validateCompletedProbe(envelope, plan, expected, v2Policy, context, policy, now = Date.now()) {
  validatePlan(plan, expected, v2Policy); approval(context, plan);
  const p = signed(envelope, DOMAIN, policy);
  gate(envelope.key_id === context.supervisor_key_id, "outcome_signer");
  closed(p, ["schema_version", "operation_id", "plan_sha256", "policy_sha256", "approval_evidence_sha256", "publish_head", "restore_head", "publish_merge_sha", "restore_merge_sha",
    "supervisor_code_sha256", "armed_at", "published_at", "second_check_at", "restored_at", "completed_at", "publisher_elapsed_seconds", "descriptor_sha256",
    "restored_preimage_sha256", "cas_result", "catalog_observations_sha256", "worker_second_check_sha256", "immutable_apply_audit_sha256", "supervisor_log_sha256",
    "residual_exposure", "outcome"], "probe_outcome");
  gate(p.schema_version === DOMAIN + "-v2" && p.operation_id === plan.operation_id && p.outcome === "delivery_proved_after_restore", "probe_outcome_state");
  for (const key of ["plan_sha256", "policy_sha256", "approval_evidence_sha256", "publish_head", "restore_head", "supervisor_code_sha256"])
    gate(p[key] === context[key], "outcome_binding");
  gate(sha(p.publish_merge_sha) && sha(p.restore_merge_sha) && p.publish_merge_sha !== p.restore_merge_sha
    && p.descriptor_sha256 === plan.descriptor_sha256 && p.restored_preimage_sha256 === plan.preimage_sha256
    && p.cas_result === "exact_preimage_restored" && p.residual_exposure === "global_cache_and_queued_clients_not_proved_expired"
    && ["catalog_observations_sha256", "worker_second_check_sha256", "immutable_apply_audit_sha256", "supervisor_log_sha256"].every(k => hex(p[k])), "probe_restore");
  const times = [p.armed_at, p.published_at, p.second_check_at, p.restored_at, p.completed_at].map(time);
  gate(times.every((v, i) => !i || v >= times[i - 1]) && times[1] >= time(plan.not_before) && times[3] <= time(plan.restore_deadline)
    && times[4] <= now + 300000 && Number.isFinite(p.publisher_elapsed_seconds) && p.publisher_elapsed_seconds >= 0
    && p.publisher_elapsed_seconds <= plan.maximum_exposure_seconds && times[3] - times[1] <= p.publisher_elapsed_seconds * 1000, "probe_outcome_time");
  return p;
}
module.exports = {URL, RELATIVE, RISKS, DOMAIN, validatePlan, validateProbeEligibility, validateCompletedProbe};
