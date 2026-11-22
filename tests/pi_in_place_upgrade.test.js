"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { requiredPredecessors, validateEvidence } = require("../scripts/validate_pi_in_place_upgrade");

const stateHash = "a".repeat(64);
const packageHash = "b".repeat(64);
const installerHash = "c".repeat(64);
const target = { build: 420, sha256: packageHash };
const installer = { installer: { sha256: installerHash } };
const required = new Map([["provenance/legacy.json", { build: 38, sha256: packageHash }]]);

function evidence() {
  const before = { build: 38, boot_id: "first", registration_sha256: stateHash,
    scan_settings_sha256: stateHash, last_successful_scan: "2026-11-14T00:00:00Z" };
  const after = { ...before, build: 420, boot_id: "second", booted_at: "2026-11-14T00:01:00Z",
    last_successful_scan: "2026-11-14T00:02:00Z" };
  return { schema_version: "apollo-pi-in-place-upgrade-v1", target_sha256: packageHash, installer_sha256: installerHash,
    predecessors: { "provenance/legacy.json": { predecessor_sha256: packageHash, in_place: true,
      operator_actions: 1, dashboard_available: false, entry_point: "signed_installer",
      before, after_reboot: after, results_sha256: stateHash } } };
}

test("inventory includes early ARM installs and distinct installer and image artifacts", () => {
  const files = {
    "provenance/legacy.json": { release: { build: 38, platform: "linux", architecture: "arm" }, package: { sha256: packageHash } },
    "installers/old.json": { target: { build: 404 }, installer: { sha256: installerHash } },
    "images/old.json": { build: 404, sha256: stateHash, installer: { sha256: installerHash } },
  };
  assert.deepEqual([...requiredPredecessors(target,
    directory => Object.keys(files).filter(key => key.startsWith(directory + "/")).map(key => key.split("/")[1]),
    key => files[key])], [
    ["provenance/legacy.json", { build: 38, sha256: packageHash }],
    ["installers/old.json", { build: 404, sha256: installerHash }],
    ["images/old.json", { build: 404, sha256: stateHash }],
  ]);
});

test("direct signed installer and one-action dashboard routes pass with matching state", () => {
  const result = evidence();
  assert.doesNotThrow(() => validateEvidence(target, installer, required, result));
  Object.assign(result.predecessors["provenance/legacy.json"], { entry_point: "dashboard", dashboard_available: true });
  assert.doesNotThrow(() => validateEvidence(target, installer, required, result));
});

test("missing evidence, manual hops, fresh installs, changed state and stale scans fail", () => {
  for (const mutate of [
    (_, result) => { result.predecessors = {}; },
    run => { run.operator_actions = 2; },
    run => { run.in_place = false; },
    run => { run.dashboard_available = true; },
    run => { run.after_reboot.build--; },
    run => { run.after_reboot.boot_id = run.before.boot_id; },
    run => { run.after_reboot.registration_sha256 = packageHash; },
    run => { run.after_reboot.scan_settings_sha256 = packageHash; },
    run => { run.after_reboot.last_successful_scan = run.after_reboot.booted_at; },
  ]) {
    const result = evidence();
    mutate(result.predecessors["provenance/legacy.json"], result);
    assert.throws(() => validateEvidence(target, installer, required, result), /missing or failed/i);
  }
  assert.throws(() => validateEvidence(target, installer, required, { ...evidence(), installer_sha256: packageHash }),
    /exact runtime and signed installer/);
});
