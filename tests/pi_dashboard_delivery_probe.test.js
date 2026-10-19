"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const {probeFixture} = require("../fixtures/pi_dashboard_probe");
const {h, at} = require("../fixtures/pi_bridge_v2");
test("explicit externally authorized live probe grants only temporary native scope", () => {
  const f = probeFixture(); assert.equal(f.eligible().scope, "native_public_probe_only");
  assert.equal(f.completed().outcome, "delivery_proved_after_restore");
});
const bad = {
  "disabled policy": f => { f.v2Policy.public_probe_enabled = false; },
  "private catalog": f => { f.plan.catalog_url = "https://example.test/catalog.json"; },
  "alternate catalog path": f => { f.plan.catalog_relative_path = "candidates/test.json"; },
  "extra approval flag": f => { f.plan.approved = true; },
  "changed native evidence": f => { f.plan.native_evidence_sha256 = h("other"); },
  "changed preimage": f => { f.state().runtime.current_descriptor_sha256 = h("different"); },
  "changed current main": f => { f.state().runtime.current_main_sha = "c".repeat(40); },
  "used operation nonce": f => { f.state().runtime.state = "USED"; },
  "lease mismatch": f => { f.state().runtime.lease_sha256 = h("other"); },
  "ledger mismatch": f => { f.state().runtime.ledger_sha256 = h("other"); },
  "missing real write probe": f => { f.state().armed.write_probe_sha256 = null; },
  "stale supervisor": f => { f.state().armed.heartbeat_at = at(-40); },
  "future heartbeat": f => { f.state().armed.heartbeat_at = f.probeAt(11); },
  "wrong restore head": f => { f.state().armed.restore_head = "b".repeat(40); },
  "unapproved global risks": f => { f.state().context.approved_risks.pop(); },
  "monotonic exposure elapsed": f => { f.state().runtime.elapsed_seconds = 1800; },
  "negative elapsed": f => { f.state().runtime.elapsed_seconds = -1; },
  "window beyond ceiling": f => { f.plan.maximum_exposure_seconds = 1801; f.resetBindings(); },
  "deadline extension": f => { f.state().armed.restore_deadline = at(1801); },
  "arbitrary policy context": f => { f.state().context.policy_sha256 = h("otherpolicy"); }
};
for (const [name, change] of Object.entries(bad)) test("probe rejects " + name, () => {
  const f = probeFixture(); change(f); assert.throws(() => f.eligible());
});
test("expired probe cannot authorize another attempt", () => { const f = probeFixture(); assert.throws(() => f.eligible(Date.parse(f.plan.restore_deadline))); });
const failed = {
  "failed restore": p => { p.cas_result = "conflict"; },
  "wrong restored bytes": p => { p.restored_preimage_sha256 = h("other"); },
  "restored before second descriptor check": p => { p.restored_at = at(900); },
  "restored after deadline": p => { p.restored_at = at(1801); },
  "missing second-check trace": p => { p.worker_second_check_sha256 = null; },
  "unproved immutable apply": p => { p.immutable_apply_audit_sha256 = null; },
  "fabricated global cache purge": p => { p.residual_exposure = "all_clients_expired"; },
  "failed outcome": p => { p.outcome = "CLOSED_FAILED"; },
  "monotonic underreport": p => { p.publisher_elapsed_seconds = 1; },
  "wrong approved source": p => { p.publish_head = "c".repeat(40); },
  "missing restore merge": p => { p.restore_merge_sha = null; }
};
for (const [name, change] of Object.entries(failed)) test("completed probe rejects " + name, () => {
  const f = probeFixture(); change(f.state().outcome); assert.throws(() => f.completed());
});
