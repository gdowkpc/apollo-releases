"use strict";
const crypto = require("node:crypto");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const hex = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
function gate(ok, code) { if (!ok) throw Error("pi_bridge_v2_" + code); }
function closed(value, keys, code) { gate(exact(value, keys), code); }
function equal(a, b, code) { gate(JSON.stringify(a) === JSON.stringify(b), code); }
function digests(value, keys, code) { closed(value, keys, code); gate(keys.every(key => hex(value[key])), code); }
function time(value) {
  gate(typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, "timestamp");
  return Date.parse(value);
}
function decode(value, limit) {
  gate(typeof value === "string" && value.length <= limit * 2, "base64");
  const bytes = Buffer.from(value, "base64");
  gate(bytes.length <= limit && bytes.toString("base64") === value, "base64"); return bytes;
}
function signed(envelope, prefix, policy) {
  closed(envelope, ["schema_version", "key_id", "payload", "signature"], "envelope");
  gate(envelope.schema_version === prefix + "-attestation-v2", "domain");
  const key = Object.hasOwn(policy.trusted_keys || {}, envelope.key_id) && policy.trusted_keys[envelope.key_id];
  gate(typeof key === "string", "signer");
  const bytes = decode(envelope.payload, 512 * 1024), signature = decode(envelope.signature, 64);
  gate(signature.length === 64 && crypto.verify(null, Buffer.concat([Buffer.from(prefix + "-v2\n"), bytes]), key, signature), "signature");
  const text = bytes.toString("utf8"), value = JSON.parse(text);
  gate(JSON.stringify(value) === text, "canonical_json"); return value;
}
const RF = Object.freeze({qualified: false, reason: "separate_live_rf_qualification_required"});
const BASELINES = Object.freeze(["original307_unbound", "healthy_observed331_bound"]);
const NEGATIVES = Object.freeze(["owner_gain", "calibration_ppm", "foreign_identity", "unknown_fields", "multiple_receivers",
  "missing_hardware", "ambiguous_hardware", "unstable_hardware", "active_custom_survey", "falsey_alias", "missing_scan_intent", "missing_reporting_intent"]);
const PHASES = Object.freeze(["activation", "restart", "forced_failure", "rollback", "retry"]);
function requirements(updaters) {
  return {schema_version: "apollo-pi-dashboard-bridge-requirements-v2", updaters,
    baselines: [...BASELINES], phases: [...PHASES], negatives: [...NEGATIVES], first_save: "target_registered_unbound",
    component: "separate_same_application_request"};
}
function interval(value, start, end) {
  const a = time(value.started_at), b = time(value.completed_at);
  gate(a >= start && b > a && b <= end, "interval"); return [a, b];
}
module.exports = {hash, hex, sha, exact, gate, closed, equal, digests, time, signed, RF, BASELINES, NEGATIVES, PHASES, requirements, interval};
