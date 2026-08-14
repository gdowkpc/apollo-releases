"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const provenanceDirectory = path.join(root, "provenance");
const schema = "apollo-github-release-provenance-v1";
const repository = Object.freeze({ full_name: "gdowkpc/apollo-releases", repository_id: 1334398301, owner_login: "gdowkpc", owner_id: 3979668 });
const semver = "(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?";
const tagPattern = new RegExp(`^apollo-passive-v(${semver})-build\\.([1-9]\\d*)$`);
const filenamePattern = new RegExp(`^ApolloPassiveReceive-(${semver})-build\\.([1-9]\\d*)-linux-arm64\\.zip$`);

function fail(message) { throw new Error(message); }
function object(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
function exact(value, fields) { return object(value) && Object.keys(value).length === fields.length && Object.keys(value).every((key) => fields.includes(key)); }
function positive(value) { return Number.isSafeInteger(value) && value > 0; }
function duplicateSafeJson(bytes) {
  const source = String(bytes); let index = 0;
  const whitespace = () => { while (/[\t\n\r ]/.test(source[index] || "")) index += 1; };
  const string = () => {
    if (source[index] !== '"') fail("invalid JSON");
    const start = index++;
    while (index < source.length) {
      const character = source[index++];
      if (character === '"') return JSON.parse(source.slice(start, index));
      if (character === "\\") {
        if (index >= source.length) fail("invalid JSON");
        const escape = source[index++];
        if (escape === "u") { if (!/^[0-9a-fA-F]{4}$/.test(source.slice(index, index + 4))) fail("invalid JSON"); index += 4; }
        else if (!'"\\\\/bfnrt'.includes(escape)) fail("invalid JSON");
      } else if (character.charCodeAt(0) < 0x20) fail("invalid JSON");
    }
    fail("invalid JSON");
  };
  const value = () => {
    whitespace(); const start = index;
    if (source[index] === '"') { string(); return; }
    if (source[index] === "{") {
      index += 1; whitespace(); const keys = new Set();
      if (source[index] === "}") { index += 1; return; }
      while (true) {
        whitespace(); const key = string(); if (keys.has(key)) fail("duplicate JSON key"); keys.add(key);
        whitespace(); if (source[index++] !== ":") fail("invalid JSON"); value(); whitespace();
        if (source[index] === "}") { index += 1; return; }
        if (source[index++] !== ",") fail("invalid JSON");
      }
    }
    if (source[index] === "[") {
      index += 1; whitespace(); if (source[index] === "]") { index += 1; return; }
      while (true) { value(); whitespace(); if (source[index] === "]") { index += 1; return; } if (source[index++] !== ",") fail("invalid JSON"); }
    }
    const literal = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(start));
    if (!literal) fail("invalid JSON"); index += literal[0].length;
  };
  value(); whitespace(); if (index !== source.length) fail("invalid JSON");
  try { return JSON.parse(source); } catch (_) { fail("invalid JSON"); }
}

function validate(record, relative) {
  if (!exact(record, ["schema_version", "release_repository", "release_tag", "source", "release", "package", "qualification"]) || record.schema_version !== schema) fail(`${relative}: top-level contract`);
  if (!exact(record.release_repository, ["full_name", "repository_id", "owner_login", "owner_id"]) || Object.keys(repository).some((key) => record.release_repository[key] !== repository[key])) fail(`${relative}: release repository identity`);
  const tag = typeof record.release_tag === "string" && tagPattern.exec(record.release_tag);
  if (!tag) fail(`${relative}: release tag`);
  if (!exact(record.source, ["repository", "commit"]) || record.source.repository !== "gdowkpc/apollo" || !/^[a-f0-9]{40}$/.test(String(record.source.commit || ""))) fail(`${relative}: source identity`);
  if (!exact(record.release, ["version", "build", "platform", "architecture"]) || record.release.version !== tag[1] || record.release.build !== Number(tag[2]) || record.release.platform !== "linux" || record.release.architecture !== "arm64") fail(`${relative}: release identity`);
  const file = typeof record.package?.filename === "string" && filenamePattern.exec(record.package.filename);
  if (!exact(record.package, ["filename", "byte_size", "sha256", "package_type"]) || !file || file[1] !== record.release.version || Number(file[2]) !== record.release.build || !positive(record.package.byte_size) || !/^[a-f0-9]{64}$/.test(String(record.package.sha256 || "")) || record.package.package_type !== "portable_zip") fail(`${relative}: package identity`);
  if (!exact(record.qualification, ["status", "evidence_references"]) || record.qualification.status !== "qualified" || !Array.isArray(record.qualification.evidence_references) || record.qualification.evidence_references.length > 32 || record.qualification.evidence_references.some((item) => typeof item !== "string" || !item.length || item.length > 500)) fail(`${relative}: qualification evidence`);
  const expected = `${record.release_tag}.json`;
  if (path.basename(relative) !== expected) fail(`${relative}: filename must equal ${expected}`);
}

const files = fs.existsSync(provenanceDirectory) ? fs.readdirSync(provenanceDirectory).filter((name) => name.endsWith(".json")).sort() : [];
for (const name of files) validate(duplicateSafeJson(fs.readFileSync(path.join(provenanceDirectory, name), "utf8")), `provenance/${name}`);
process.stdout.write(`provenance-validation: ${files.length} record(s) passed\n`);
