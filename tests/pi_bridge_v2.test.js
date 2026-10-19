"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const {fixture, h} = require("../fixtures/pi_bridge_v2");
const V = require("../scripts/validate_pi_bridge_compatibility_v2");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const {repository} = require("../fixtures/pi_bridge_v2_repository");
const {validateRepository} = require("../scripts/validate_pi_live_qualification");
const {validateRepositoryProbe} = require("../scripts/pi_bridge_v2_records");
const P = require("../scripts/validate_pi_dashboard_delivery_probe");
function run(change = () => {}) { const f = fixture(); change(f); return V.validateNativeEvidence(f.envelope(), f.expected, f.policy, f.v2Policy, f.now); }
test("native v2 accepts complete authenticated matrix without claiming owner delivery or RF", () => assert.equal(run().cases.length, 4));
const bad = {
  "unknown schema": f => { f.contract.extra = true; },
  "missing baseline family": f => { f.contract.cases.pop(); },
  "duplicate case": f => { f.contract.cases[1] = f.contract.cases[0]; },
  "inventory identity mismatch": f => { f.contract.cases[0].updater.package_sha256 = h("foreign"); },
  "self-selected requirements": f => { f.contract.requirements_sha256 = h("my matrix"); },
  "no independent collector approval": f => { f.v2Policy.approved_collectors = {}; },
  "collector source substitution": f => { f.contract.collector.source_commit = "d".repeat(40); },
  "same collector actor as reviewer": f => { f.v2Policy.approved_collectors[f.contract.collector.manifest_sha256].reviewer.actor_sha256 = f.contract.collector.actor_sha256; },
  "unbound baseline invented health": f => { f.contract.cases[0].baseline.progress = f.contract.cases[1].baseline.progress; },
  "bound baseline absent fresh progress": f => { f.contract.cases[1].baseline.progress = null; },
  "borrowed branch": f => { f.contract.cases[0].rollback_branch = f.contract.cases[0].activation_branch; },
  "missing phase": f => { f.contract.cases[0].phases.pop(); },
  "wrong phase order": f => { f.contract.cases[0].phases.reverse(); },
  "noncontiguous rollback retry": f => { f.contract.cases[0].phases[4].before_state_sha256 = h("other"); },
  "reused transaction": f => { f.contract.cases[0].phases[4].transaction_sha256 = f.contract.cases[0].phases[0].transaction_sha256; },
  "fictional automatic SDK replacement": f => { f.contract.cases[0].phases[0].installed_updater.version = f.expected.release.updater_version; },
  "wrong activated application": f => { f.contract.cases[0].phases[0].application_identity.application_sha256 = h("other"); },
  "untriggered failure helper": f => { f.contract.cases[0].phases[2].fault.stop_count = 0; },
  "failed target stop": f => { f.contract.cases[0].phases[2].fault.stop_exit_code = 1; },
  "helper may kill later retry": f => { f.contract.cases[0].phases[2].fault.helper_settled_at = f.contract.completed_at; },
  "restart invents new first binding": f => { f.contract.cases[0].phases[1].preservation = f.contract.cases[0].phases[0].preservation; },
  "same restart incarnation": f => { f.contract.cases[0].phases[1].incarnation_sha256 = f.contract.cases[0].phases[0].incarnation_sha256; },
  "false rollback baseline": f => { f.contract.cases[0].phases[3].after_state_sha256 = h("other"); },
  "credential change": f => { f.contract.cases[0].phases[0].preservation.restricted_after_sha256 = h("changed"); },
  "custody change": f => { f.contract.cases[0].phases[0].preservation.custody_after_sha256 = h("changed"); },
  "canonical identity change": f => { f.contract.cases[0].phases[0].preservation.canonical_identity_sha256 = h("changed"); },
  "unreviewed projection formatting": f => { f.contract.cases[0].phases[0].preservation.expected_projection_sha256 = h("different render"); },
  "bound config normalization": f => { f.contract.cases[1].phases[0].preservation.after_configuration_sha256 = h("changed"); },
  "whole receiver waiver": f => { f.contract.cases[0].phases[0].preservation.mode = "ignore_receiver"; },
  "replay SDK not installed archive": f => { f.contract.cases[0].phases[0].preservation.replay.sdk_archive_sha256 = h("other sdk"); },
  "replay expected mismatch": f => { f.contract.cases[0].phases[0].preservation.replay.expected_configuration_sha256 = h("after"); },
  "missing negative family": f => { f.contract.cases[0].negatives.pop(); },
  "duplicate negative": f => { f.contract.cases[0].negatives[1] = f.contract.cases[0].negatives[0]; },
  "refusal activated app": f => { f.contract.cases[0].negatives[0].transactions_after_sha256 = h("new transaction"); },
  "first Save erases registration": f => { f.contract.first_save.registration_after_sha256 = h("lost"); },
  "first Save borrowed bound lineage": f => { f.contract.first_save.lineage_sha256 = f.contract.cases[0].activation_branch.lineage_sha256; },
  "component missing historical version": f => { f.contract.components.pop(); },
  "fictional automatic bootstrap": f => { f.contract.components[0].request_kind = "automatic_old_dashboard_bootstrap"; },
  "component changes application": f => { f.contract.components[0].application_after_sha256 = h("other"); },
  "component changes settings": f => { f.contract.components[0].state_after_sha256 = h("other"); },
  "synthetic physical USB": f => { f.contract.lab.hardware_adapters = true; },
  "quiet RF separate scope violated": f => { f.contract.live_rf_reporting.qualified = true; }
};
for (const [name, change] of Object.entries(bad)) test("native v2 rejects " + name, () => assert.throws(() => run(change)));
test("audit binds full contract and cannot be borrowed after mutation", () => {
  const f = fixture(), envelope = f.envelope(), payload = JSON.parse(Buffer.from(envelope.payload, "base64"));
  payload.native_contract.cases[0].raw_manifest_sha256 = h("replaced");
  assert.throws(() => V.validateNativeEvidence(f.sign(payload, V.NATIVE), f.expected, f.policy, f.v2Policy, f.now), /audit_binding/);
});
test("existing authorized key may sign separate audit domain with independently pinned reviewer provenance", () => {
  const f = fixture(); f.v2Policy.approved_collectors[f.contract.collector.manifest_sha256].audit_key_id = "collector";
  assert.equal(V.validateNativeEvidence(f.envelope(), f.expected, f.policy, f.v2Policy, f.now).cases.length, 4);
});
test("domains and duplicate/noncanonical signed payloads fail", () => {
  const f = fixture(); const envelope = f.envelope();
  envelope.schema_version = "apollo-pi-dashboard-bridge-compatibility-attestation-v1";
  assert.throws(() => V.validateNativeEvidence(envelope, f.expected, f.policy, f.v2Policy, f.now), /domain/);
  envelope.schema_version = V.NATIVE + "-attestation-v2"; envelope.payload = Buffer.from("{}").toString("base64");
  assert.throws(() => V.validateNativeEvidence(envelope, f.expected, f.policy, f.v2Policy, f.now), /signature/);
  for (const text of ['{"schema_version":"x","schema_version":"x"}', '{ "schema_version": "x" }'])
    assert.throws(() => V.validateNativeEvidence(f.signBytes(text, V.NATIVE), f.expected, f.policy, f.v2Policy, f.now), /canonical_json/);
});
function repoTest(change, verify) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apollo-v2-policy-"));
  try { const f = repository(root); change(root, f); verify(() => validateRepository(root)); }
  finally { fs.rmSync(root, {recursive: true, force: true}); }
}
test("repository explicitly dispatches final v2 after full native/public delivery/audit validation", () => repoTest(() => {}, run => assert.equal(run().signed, 1)));
const repoBad = {
  "native prerequisite is not a final bridge": (root, f) => fs.unlinkSync(path.join(root, `bridges/${f.tag}.json`)),
  "native candidate cannot live in final directory": (root, f) => f.write(`bridges/${f.tag}.json`, f.candidate),
  "no reviewed operation authorization": (root, f) => f.write("policy/pi-dashboard-probe-authorizations.json", {}),
  "collector not independently approved": (root, f) => { f.v2Policy.approved_collectors = {}; f.write("policy/pi-dashboard-bridge-v2.json", f.v2Policy); },
  "private discovery relabeled": (root, f) => { f.delivery.owner_http.transport = "private_descriptor_fixture"; f.saveFinal(); },
  "wrong fixed endpoint": (root, f) => { f.delivery.owner_http.catalog_url = "https://example.test/"; f.saveFinal(); },
  "second descriptor read not bound": (root, f) => { f.delivery.owner_http.second_catalog_check_sha256 = h("unrelated"); f.saveFinal(); },
  "extra private customer identifier": (root, f) => { f.delivery.owner_http.node_uuid = "private"; f.saveFinal(); },
  "native digest substitution": (root, f) => { f.delivery.native_evidence_sha256 = h("other"); f.saveFinal(); },
  "final tries to claim RF": (root, f) => { f.delivery.live_rf_reporting.qualified = true; f.saveFinal(); },
  "wrong source and release": (root, f) => { f.record.release = {...f.record.release, source_commit: "d".repeat(40)}; f.saveFinal(); },
  "malformed v2 cannot fall back to v1": (root, f) => { f.record.compatibility_evidence.path = "qualifications/../other.json"; f.write(`bridges/${f.tag}.json`, f.record); }
};
for (const [name, change] of Object.entries(repoBad)) test("repository rejects " + name, () => repoTest(change, run => assert.throws(run)));
test("guarded probe reader authenticates native prerequisites while normal stable admission stays unchanged", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apollo-v2-probe-"));
  try {
    const f = repository(root), r = f.expected.release;
    fs.unlinkSync(path.join(root, `bridges/${f.tag}.json`));
    f.write("stable/apollo-passive-receive-linux-arm64.json", {version: r.version, build: r.build, source_commit: r.source_commit,
      sha256: r.application_sha256, minimum_pi_updater_version: r.updater_version});
    const plan = f.write(`probe-operations/${f.tag}.plan.json`, f.plan);
    const armed = f.write(`probe-operations/${f.plan.operation_id}.armed.json`, f.sign(f.state().armed, P.DOMAIN, "supervisor"));
    assert.equal(validateRepositoryProbe(root, plan, armed, f.state().context, f.state().runtime, Date.parse(f.probeAt(10))).scope, "native_public_probe_only");
    f.v2Policy.approved_collectors = {}; f.write("policy/pi-dashboard-bridge-v2.json", f.v2Policy);
    assert.throws(() => validateRepositoryProbe(root, plan, armed, f.state().context, f.state().runtime, Date.parse(f.probeAt(10))), /unapproved_collector/);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
