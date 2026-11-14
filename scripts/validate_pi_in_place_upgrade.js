"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DIRS = ["provenance", "installers", "images"];
const SHA256 = /^[a-f0-9]{64}$/;

function requiredPredecessors(target, list, read) {
  const required = new Map();
  for (const directory of DIRS) {
    for (const filename of list(directory).filter(name => name.endsWith(".json"))) {
      const key = directory + "/" + filename;
      // The provenance workflow fixture was never an installable Pi release.
      if (key === "provenance/apollo-passive-v0.0.0-fixture.1-build.1.json") continue;
      const record = read(key);
      if (directory === "provenance" &&
          (record.release?.platform !== "linux" || !["arm64", "arm"].includes(record.release.architecture))) continue;
      const release = record.release || record.target || record;
      if (!Number.isSafeInteger(release.build) || release.build >= target.build) continue;
      const sha256 = (directory === "provenance" ? record.package : directory === "installers" ? record.installer : record)?.sha256;
      if (!SHA256.test(sha256 || "")) throw new Error("Missing predecessor artifact digest: " + key);
      required.set(key, { build: release.build, sha256 });
    }
  }
  return required;
}

function validateEvidence(target, installer, required, evidence) {
  if (evidence?.schema_version !== "apollo-pi-in-place-upgrade-v1" ||
      evidence.target_sha256 !== target.sha256 ||
      evidence.installer_sha256 !== installer?.installer?.sha256 ||
      !SHA256.test(evidence.installer_sha256 || "") || !evidence.predecessors) {
    throw new Error("Pi promotion requires in-place upgrade evidence for the exact runtime and signed installer");
  }
  const failures = [];
  for (const [key, predecessor] of required) {
    const run = evidence.predecessors[key];
    const before = run?.before;
    const after = run?.after_reboot;
    const valid = run?.predecessor_sha256 === predecessor.sha256 && run?.in_place === true &&
      run.operator_actions === 1 && ["dashboard", "signed_installer"].includes(run.entry_point) &&
      run.dashboard_available === (run.entry_point === "dashboard") &&
      before?.build === predecessor.build && after?.build === target.build &&
      typeof before.boot_id === "string" && before.boot_id.length > 0 &&
      typeof after.boot_id === "string" && after.boot_id.length > 0 && before.boot_id !== after.boot_id &&
      SHA256.test(before.registration_sha256 || "") && before.registration_sha256 === after.registration_sha256 &&
      SHA256.test(before.scan_settings_sha256 || "") && before.scan_settings_sha256 === after.scan_settings_sha256 &&
      Number.isFinite(Date.parse(after.booted_at)) && Date.parse(after.last_successful_scan) > Date.parse(after.booted_at) &&
      Date.parse(after.last_successful_scan) > Date.parse(before.last_successful_scan) &&
      SHA256.test(run.results_sha256 || "");
    if (!valid) failures.push(key);
  }
  if (failures.length) {
    throw new Error("Missing or failed in-place Pi upgrade evidence for " + failures.length +
      " predecessor artifact(s): " + failures.slice(0, 8).join(", "));
  }
}

function validateRepository(target, installerPath, root) {
  const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
  const list = relative => fs.readdirSync(path.join(root, relative));
  const installer = read(installerPath);
  const evidencePath = "qualifications/pi-in-place-upgrade-build." + target.build + ".json";
  if (!fs.existsSync(path.join(root, evidencePath))) {
    throw new Error("Pi promotion is missing upgrade qualification evidence at " + evidencePath);
  }
  const evidence = read(evidencePath);
  validateEvidence(target, installer, requiredPredecessors(target, list, read), evidence);
}

module.exports = { requiredPredecessors, validateEvidence, validateRepository };
