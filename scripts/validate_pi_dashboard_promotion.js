"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { compare, validate } = require("./validate_pi_updater_requirement");

const ROOT = path.resolve(__dirname, "..");
const STABLE = "stable/apollo-passive-receive-linux-arm64.json";
// Public Build 404 (source 37a40043f8c0ba385f85b77b9654936a87f5721b)
// shipped updater 1.0.116. Keep this baseline until support for it is retired.
const BASELINE = { build: 404, updater: "1.0.116" };
const INSTALLER_SCHEMAS = new Set([
  "apollo-pi-installer-distribution-v2",
  "apollo-pi-installer-distribution-v3",
]);
const MAX_INSTALLER_BYTES = 16 * 1024 * 1024;

// Build 419 was already public when this check was introduced. Only the exact
// existing files are grandfathered. A rollback or new promotion runs the gate.
const EXISTING_419 = {
  descriptor: "23a7b132f1b246a2364e743fdb17b0114ef918cd241d4e586d74c738b74b5a36",
  installer: "7db72446dffe4f392f43bf08fe82aa09023b5b28f29c23bfd5b6f4fa51d7ea79",
};
const hash = bytes => createHash("sha256").update(bytes.toString("utf8").replace(/\r\n/g, "\n")).digest("hex");

function installerTag(target) {
  return `apollo-pi-installer-v${target.version}-build.${target.build}-updater.${target.minimum_pi_updater_version}`;
}

// Mirrors the published Build 404 worker's installer record admission check.
function validateCompatibility(target, record) {
  if (target.build <= BASELINE.build || compare(BASELINE.updater, target.minimum_pi_updater_version) >= 0)
    return;
  const tag = installerTag(target);
  const updater = target.minimum_pi_updater_version;
  const filename = `Apollo-Pi-Installer-${target.version}-build.${target.build}-updater.${updater}-linux-arm64.zip`;
  if (!INSTALLER_SCHEMAS.has(record?.schema_version) || record.publication_status !== "qualified"
      || record.release_tag !== tag || record.target?.version !== target.version
      || record.target?.build !== target.build || record.target?.source_commit !== target.source_commit
      || record.target?.sha256 !== target.sha256 || record.updater?.version !== updater
      || record.installer?.filename !== filename || !Number.isSafeInteger(record.installer.bytes)
      || record.installer.bytes < 1 || record.installer.bytes > MAX_INSTALLER_BYTES
      || !/^[a-f0-9]{64}$/.test(record.installer.sha256 || "")) {
    throw new Error(`Pi stable Build ${target.build} would strand Build ${BASELINE.build} with updater ${BASELINE.updater}. Publish a compatible qualified installer record at installers/${tag}.json before promoting.`);
  }
  for (const suffix of ["-linux-arm64.zip", ".authority.json", ".controller-capsule.json"]) {
    const asset = record.updater.unchanged_asset_hashes?.[`ApolloUniversalPiUpdater-${updater}${suffix}`];
    if (!/^[a-f0-9]{64}$/.test(asset?.sha256 || "") || !Number.isSafeInteger(asset.bytes)
        || asset.bytes < 1 || asset.bytes > MAX_INSTALLER_BYTES) {
      throw new Error(`Pi stable Build ${target.build} has missing or invalid signed updater payload metadata for ${suffix}.`);
    }
  }
}

function validateRepository(read = relative => fs.readFileSync(path.join(ROOT, relative)), baseDescriptor = read(STABLE)) {
  const descriptor = read(STABLE);
  const target = JSON.parse(descriptor);
  if (validate(target, tag => JSON.parse(read(`provenance/${tag}.json`))).held_legacy)
    return "unchanged legacy target";
  const recordPath = `installers/${installerTag(target)}.json`;
  const installer = read(recordPath);
  if (hash(baseDescriptor) === EXISTING_419.descriptor && hash(descriptor) === EXISTING_419.descriptor
      && hash(installer) === EXISTING_419.installer)
    return "existing Build 419 exception remains incompatible with Build 404";
  validateCompatibility(target, JSON.parse(installer));
  require("./validate_pi_in_place_upgrade").validateRepository(target, recordPath, ROOT);
  return "in-place upgrade evidence covers tracked predecessor artifacts";
}

if (require.main === module) {
  try {
    const base = process.env.PI_PROMOTION_BASE_SHA;
    if (base && !/^[a-f0-9]{40}$/.test(base)) throw new Error("Invalid release base SHA");
    const baseDescriptor = base ? execFileSync("git", ["show", base + ":" + STABLE], { cwd: ROOT }) : undefined;
    console.log("pi-dashboard-promotion: " + validateRepository(undefined, baseDescriptor));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { validateCompatibility, validateRepository };
