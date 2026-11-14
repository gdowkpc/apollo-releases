"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { requiredPredecessors, validateEvidence } = require("./validate_pi_in_place_upgrade");

const root = path.resolve(__dirname, "..");
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function main(targetFile, fixtureFile, output) {
  if (process.platform !== "linux" || process.arch !== "arm64") {
    throw new Error("Run historical qualification on the Linux ARM64 builder");
  }
  const target = readJson(targetFile);
  const fixtures = readJson(fixtureFile);
  for (const part of [target.runtime, target.installer]) {
    if (sha256(part.path) !== part.sha256) throw new Error("Target artifact digest mismatch: " + part.path);
  }
  const required = requiredPredecessors(target, dir => fs.readdirSync(path.join(root, dir)),
    file => readJson(path.join(root, file)));
  for (const key of Object.keys(fixtures)) {
    if (!required.has(key)) throw new Error("Unknown predecessor artifact: " + key);
  }
  fs.mkdirSync(output, { mode: 0o700 });
  const installer = { installer: { sha256: target.installer.sha256 } };
  const evidence = { schema_version: "apollo-pi-in-place-upgrade-v1",
    target_sha256: target.runtime.sha256, installer_sha256: target.installer.sha256, predecessors: {} };
  const summary = [];
  let index = 0;
  for (const [key, predecessor] of required) {
    const fixture = fixtures[key];
    if (!fixture) {
      summary.push({ key, state: "missing_fixture" });
      continue;
    }
    const job = path.resolve(output, String(++index).padStart(3, "0"));
    fs.mkdirSync(job, { mode: 0o700 });
    const log = path.join(job, "run.log");
    try {
      if (sha256(fixture.artifact) !== predecessor.sha256) throw new Error("Predecessor artifact digest mismatch");
      const request = path.join(job, "request.json");
      fs.writeFileSync(request, JSON.stringify({ key, predecessor, artifact: fixture.artifact, target }), { mode: 0o600 });
      const fd = fs.openSync(log, "wx", 0o600);
      let result;
      try {
        result = spawnSync(fixture.adapter, [request, job], { cwd: job, shell: false,
          stdio: ["ignore", fd, fd], timeout: 60 * 60 * 1000 });
      } finally {
        fs.closeSync(fd);
      }
      if (result.error || result.status !== 0) throw new Error("Fixture adapter did not complete");
      const recorded = readJson(path.join(job, "result.json"));
      if (recorded.scope === "isolated_transaction") {
        summary.push({ key, state: "builder_only", job, results_sha256: sha256(log) });
        continue;
      }
      // Only a separately collected full result is eligible for the unchanged gate.
      const run = { ...recorded.run, results_sha256: sha256(log) };
      validateEvidence(targetWithDigest(target), installer, new Map([[key, predecessor]]),
        { ...evidence, predecessors: { [key]: run } });
      evidence.predecessors[key] = run;
      summary.push({ key, state: "gate_evidence", job });
    } catch (error) {
      summary.push({ key, state: "failed", job, reason: error.message });
    }
  }
  fs.writeFileSync(path.join(output, "summary.json"), JSON.stringify(summary, null, 2) + "\n", { mode: 0o600 });
  fs.writeFileSync(path.join(output, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n", { mode: 0o600 });
  validateEvidence(targetWithDigest(target), installer, required, evidence);
}

function targetWithDigest(target) {
  return { build: target.build, sha256: target.runtime.sha256 };
}

if (require.main === module) {
  try {
    if (process.argv.length !== 5) throw new Error("Usage: node run_pi_historical_qualification.js TARGET.json FIXTURES.json OUTPUT_DIR");
    main(...process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
