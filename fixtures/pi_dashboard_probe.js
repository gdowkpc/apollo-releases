"use strict";
const {fixture, h, at} = require("./pi_bridge_v2");
const C = require("../scripts/pi_bridge_v2_contract"), P = require("../scripts/validate_pi_dashboard_delivery_probe");
function probeFixture() {
  const f = fixture(); f.v2Policy.public_probe_enabled = true;
  const probeAt = seconds => at(seconds + 2100); f.now = Date.parse(at(4300));
  const expected = {release: f.expected.release, native_record_sha256: h("native_record"), native_evidence_sha256: h("native_evidence"),
    requirements_sha256: f.contract.requirements_sha256, collector_manifest_sha256: f.contract.collector.manifest_sha256};
  const plan = {schema_version: "apollo-pi-dashboard-delivery-probe-plan-v1", operation_id: "a".repeat(32), catalog_url: P.URL, catalog_relative_path: P.RELATIVE,
    base_main_sha: "d".repeat(40), preimage_sha256: h("preimage"), descriptor_sha256: h("descriptor"), ...expected,
    not_before: probeAt(0), restore_deadline: probeAt(1800), maximum_exposure_seconds: 1800, restore_plan_sha256: h("restore_code"), restore_preimage_sha256: h("preimage"), risks: [...P.RISKS]};
  let context, armed, runtime, outcome;
  function resetBindings() {
    context = {plan_sha256: h(JSON.stringify(plan)), policy_sha256: h(JSON.stringify(f.v2Policy)), publish_head: "e".repeat(40), restore_head: "f".repeat(40),
      approval_evidence_sha256: h("trusted_human_approval"), approved_risks: [...P.RISKS], supervisor_key_id: "supervisor", supervisor_code_sha256: h("supervisor_code")};
    armed = {schema_version: P.DOMAIN + "-v2", state: "ARMED", operation_id: plan.operation_id, ...Object.fromEntries(["plan_sha256", "policy_sha256", "approval_evidence_sha256", "publish_head", "restore_head", "supervisor_code_sha256"].map(k => [k, context[k]])),
      armed_at: probeAt(0), heartbeat_at: probeAt(10), restore_deadline: plan.restore_deadline, write_probe_sha256: h("write"), cas_preimage_sha256: plan.preimage_sha256, lease_sha256: h("lease"), ledger_sha256: h("ledger")};
    runtime = {current_main_sha: plan.base_main_sha, current_descriptor_sha256: plan.preimage_sha256, operation_id: plan.operation_id, ledger_sha256: armed.ledger_sha256,
      lease_sha256: armed.lease_sha256, state: "ARMED_UNUSED", elapsed_seconds: 10};
    outcome = {schema_version: P.DOMAIN + "-v2", operation_id: plan.operation_id, ...Object.fromEntries(["plan_sha256", "policy_sha256", "approval_evidence_sha256", "publish_head", "restore_head", "supervisor_code_sha256"].map(k => [k, context[k]])),
      publish_merge_sha: "1".repeat(40), restore_merge_sha: "2".repeat(40), armed_at: probeAt(0), published_at: probeAt(10), second_check_at: probeAt(910), restored_at: probeAt(920), completed_at: probeAt(2000),
      publisher_elapsed_seconds: 910, descriptor_sha256: plan.descriptor_sha256, restored_preimage_sha256: plan.preimage_sha256, cas_result: "exact_preimage_restored",
      catalog_observations_sha256: h("real_https"), worker_second_check_sha256: h("second_fetch"), immutable_apply_audit_sha256: h("explicit_tag"), supervisor_log_sha256: h("supervisor_log"),
      residual_exposure: "global_cache_and_queued_clients_not_proved_expired", outcome: "delivery_proved_after_restore"};
  }
  resetBindings();
  return Object.assign(f, {plan, probeExpected: expected, resetBindings, probeAt,
    get context() { return context; }, get armed() { return armed; }, get runtime() { return runtime; }, get outcome() { return outcome; },
    // Access through methods keeps the rebound execution context separate from plans.
    state: () => ({context, armed, runtime, outcome}),
    eligible: (now = Date.parse(probeAt(10))) => P.validateProbeEligibility(plan, expected, f.v2Policy, context, f.sign(armed, P.DOMAIN, "supervisor"), f.policy, runtime, now),
    completed: () => P.validateCompletedProbe(f.sign(outcome, P.DOMAIN, "supervisor"), plan, expected, f.v2Policy, context, f.policy, f.now)});
}
module.exports = {probeFixture};
