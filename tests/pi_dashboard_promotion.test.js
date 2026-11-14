"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateCompatibility } = require("../scripts/validate_pi_dashboard_promotion");
const record = require("../installers/apollo-pi-installer-v2.3.206-build.419-updater.1.0.120.json");

const target = {
  version: record.target.version, build: record.target.build,
  source_commit: record.target.source_commit, sha256: record.target.sha256,
  minimum_pi_updater_version: record.updater.version,
};

test("Build 404 rejects the Build 419 installer exception when it needs the newer updater", () => {
  const previous = { ...record, schema_version: "apollo-pi-installer-owner-exception-v1",
    publication_status: "owner_authorized_exception" };
  assert.throws(() => validateCompatibility(target, previous), /would strand Build 404/);
});

test("a matching qualified installer record satisfies the Build 404 metadata checks", () => {
  const qualified = record;
  assert.doesNotThrow(() => validateCompatibility(target, qualified));
  assert.throws(() => validateCompatibility(target, { ...qualified, target: { ...record.target, sha256: "a".repeat(64) } }), /would strand/);
  assert.throws(() => validateCompatibility(target, { ...qualified, updater: { version: record.updater.version } }), /payload metadata/);
});

test("a target supported by the installed updater needs no replacement record", () => {
  assert.doesNotThrow(() => validateCompatibility({ ...target, minimum_pi_updater_version: "1.0.116" }));
});
