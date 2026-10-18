"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const DOMAIN = Buffer.from("apollo-pi-live-qualification-v1\n", "utf8");
const ONBOARDING_DOMAIN = Buffer.from("apollo-pi-onboarding-qualification-v1\n", "utf8");
const ERRORS = ["failed_sweeps", "helper_crashes", "sample_stream_stalls", "usb_disconnects", "unrecovered_timeout_sweeps", "scheduled_sweep_failures"];
const hash = b => crypto.createHash("sha256").update(b).digest("hex");
const fingerprint = v => hash(JSON.stringify(Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]]))));
const hex = v => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const integer = v => Number.isSafeInteger(v) && v >= 0;
function requireGate(ok, code) { if (!ok) throw Error("pi_live_qualification_" + code); }
function exact(v, keys) { return v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)); }
function epoch(value) {
  requireGate(typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(value), "timestamp");
  const valueMs = Date.parse(value); requireGate(Number.isFinite(valueMs), "timestamp"); return valueMs;
}
function decode(value, maximum) {
  requireGate(typeof value === "string" && value.length <= maximum * 2 && /^[A-Za-z0-9+/]*={0,2}$/.test(value), "base64");
  const b = Buffer.from(value, "base64"); requireGate(b.length <= maximum && b.toString("base64") === value, "base64"); return b;
}
function parse(bytes) {
  // Signed documents are emitted as canonical JSON by the trusted collector.
  const s = Buffer.from(bytes).toString("utf8"); const v = JSON.parse(s);
  requireGate(JSON.stringify(v) === s, "noncanonical_json"); return v;
}
function validatePhase(p, release, start, end, requireReport = true) {
  requireGate(exact(p, ["started_at", "completed_at", "boot_fingerprint", "checkin", "report", "samples"]), "phase_fields");
  const a = epoch(p.started_at), b = epoch(p.completed_at);
  requireGate(a >= start && b <= end && b > a && hex(p.boot_fingerprint), "phase_interval");
  requireGate(exact(p.checkin, ["received_at", "event_fingerprint"]) && hex(p.checkin.event_fingerprint), "checkin");
  requireGate(epoch(p.checkin.received_at) >= a && epoch(p.checkin.received_at) <= b, "fresh_checkin");
  if (requireReport) {
  requireGate(exact(p.report, ["received_at", "observed_at", "event_fingerprint", "source_version"])
    && hex(p.report.event_fingerprint) && p.report.source_version === release.version, "report");
  requireGate(epoch(p.report.observed_at) >= a && epoch(p.report.observed_at) <= b
    && epoch(p.report.received_at) >= a && epoch(p.report.received_at) <= b
    && epoch(p.report.observed_at) <= epoch(p.report.received_at) + 300000, "fresh_real_report");
  } else requireGate(p.report === null, "onboarding_cannot_claim_rf_report");
  requireGate(Array.isArray(p.samples) && p.samples.length >= 3 && p.samples.length <= 20, "rf_samples");
  let prior = null, indexes = null;
  for (const sample of p.samples) {
    requireGate(exact(sample, ["at", "accepted_captures", "errors", "windows"])
      && epoch(sample.at) >= a && epoch(sample.at) <= b && integer(sample.accepted_captures)
      && exact(sample.errors, ERRORS) && ERRORS.every(k => integer(sample.errors[k])), "rf_sample");
    requireGate(Array.isArray(sample.windows) && sample.windows.length > 0 && sample.windows.length <= 128, "rf_windows");
    const found = sample.windows.map(w => {
      requireGate(exact(w, ["index", "sweeps", "sampled_at"]) && integer(w.index) && integer(w.sweeps)
        && w.sweeps > 0 && epoch(w.sampled_at) <= epoch(sample.at) && epoch(w.sampled_at) >= a, "rf_window");
      return w.index;
    }).sort((x,y) => x-y);
    requireGate(new Set(found).size === found.length && (!indexes || JSON.stringify(indexes) === JSON.stringify(found)), "rf_window_set");
    indexes = found;
    if (prior) requireGate(epoch(sample.at) > epoch(prior.at) && sample.accepted_captures >= prior.accepted_captures
      && ERRORS.every(k => sample.errors[k] === prior.errors[k]), "receiver_errors_or_reset");
    prior = sample;
  }
  const first = p.samples[0], last = p.samples.at(-1);
  requireGate(epoch(last.at) - epoch(first.at) >= 120000 && last.accepted_captures > first.accepted_captures, "sustained_rf");
  for (const w of last.windows) {
    const old = first.windows.find(v => v.index === w.index);
    requireGate(w.sweeps > old.sweeps && epoch(w.sampled_at) > epoch(old.sampled_at), "stalled_window");
  }
}
function validateEvidence(envelope, expected, policy, now = Date.now()) {
  return validateSignedEvidence(envelope, expected, policy, now, false);
}
function validateOnboardingEvidence(envelope, expected, policy, now = Date.now()) {
  requireGate(policy.allowed_qualification_scopes?.includes("installer_onboarding"), "onboarding_scope_not_authorized");
  return validateSignedEvidence(envelope, expected, policy, now, true);
}
function validateSignedEvidence(envelope, expected, policy, now, onboarding) {
  const prefix = onboarding ? "apollo-pi-onboarding-qualification" : "apollo-pi-live-qualification";
  requireGate(exact(envelope, ["schema_version", "key_id", "payload", "signature"])
    && envelope.schema_version === prefix + "-attestation-v1", "attestation");
  const publicKey = policy.trusted_keys?.[envelope.key_id]; requireGate(typeof publicKey === "string", "untrusted_signer");
  const bytes = decode(envelope.payload, 128 * 1024), signature = decode(envelope.signature, 64);
  requireGate(signature.length === 64 && crypto.verify(null, Buffer.concat([onboarding ? ONBOARDING_DOMAIN : DOMAIN, bytes]), publicKey, signature), "signature");
  const p = parse(bytes);
  requireGate(exact(p, ["schema_version", "release", "lab", "started_at", "completed_at", "install", "pre_reboot", "post_reboot", "backend", ...(onboarding ? ["onboarding", "live_rf_reporting"] : [])])
    && p.schema_version === prefix + "-v1", "payload");
  if (onboarding) {
    requireGate(exact(p.live_rf_reporting, ["qualified", "reason"]) && p.live_rf_reporting.qualified === false
      && p.live_rf_reporting.reason === "separate_live_rf_qualification_required", "live_rf_status");
    const proof = p.onboarding;
    requireGate(exact(proof, ["application_source_commit", "website_test_source_commit", "website_test_sha256", "runtime_modules_sha256", "test_log_sha256", "server_checks", "runtime_tests", "production_records_mutated"])
      && proof.application_source_commit === expected.source_commit
      && /^[a-f0-9]{40}$/.test(proof.website_test_source_commit || "")
      && [proof.website_test_sha256, proof.runtime_modules_sha256, proof.test_log_sha256].every(hex)
      && integer(proof.server_checks) && proof.server_checks >= 32
      && integer(proof.runtime_tests) && proof.runtime_tests > 0
      && proof.production_records_mutated === false, "onboarding_test_evidence");
  }
  requireGate(exact(p.release, ["version", "build", "source_commit", "application_sha256", "updater_version", "updater_sha256", "installer_sha256", "installer_bytes", "agent_sha256"]), "release_fields");
  for (const key of ["version", "build", "source_commit", "application_sha256", "updater_version", "updater_sha256", "installer_sha256", "installer_bytes"])
    requireGate(p.release[key] === expected[key], "artifact_mismatch_" + key);
  requireGate(hex(p.release.agent_sha256) && exact(p.lab, ["role", "receiver_kind", "registered_before_install"])
    && p.lab.role === policy.required_lab_role && p.lab.receiver_kind === "rtl_sdr" && p.lab.registered_before_install === true, "owned_registered_lab");
  requireGate(exact(p.backend, ["host", "authority_revision", "client_binding_verified"])
    && p.backend.host === "www.repeaterbook.com" && integer(p.backend.authority_revision)
    && p.backend.authority_revision > 0 && p.backend.client_binding_verified === true, "backend");
  const a = epoch(p.started_at), b = epoch(p.completed_at);
  requireGate(b > a && b <= now + 300000 && b-a <= 7200000, "run_interval");
  requireGate(exact(p.install, ["before_state_sha256", "after_state_sha256", "repeat_state_sha256", "activated_agent_sha256", "updater_version", "transaction_recorded"])
    && hex(p.install.before_state_sha256) && p.install.before_state_sha256 === p.install.after_state_sha256
    && p.install.after_state_sha256 === p.install.repeat_state_sha256
    && p.install.activated_agent_sha256 === p.release.agent_sha256
    && p.install.updater_version === p.release.updater_version && p.install.transaction_recorded === true, "installation_preservation");
  validatePhase(p.pre_reboot, p.release, a, b, !onboarding); validatePhase(p.post_reboot, p.release, a, b, !onboarding);
  const windowSet = phase => phase.samples[0].windows.map(w => w.index).sort((x,y) => x-y);
  requireGate(JSON.stringify(windowSet(p.pre_reboot)) === JSON.stringify(windowSet(p.post_reboot)), "reboot_window_set_changed");
  requireGate(epoch(p.post_reboot.started_at) > epoch(p.pre_reboot.completed_at)
    && p.pre_reboot.boot_fingerprint !== p.post_reboot.boot_fingerprint
    && p.pre_reboot.checkin.event_fingerprint !== p.post_reboot.checkin.event_fingerprint
    && (onboarding || p.pre_reboot.report.event_fingerprint !== p.post_reboot.report.event_fingerprint), "reboot_or_replayed_evidence");
  return p;
}
function read(root, relative) {
  requireGate(typeof relative === "string" && /^[A-Za-z0-9_./-]+\.json$/.test(relative) && !relative.split("/").includes(".."), "record_path");
  const resolved = path.resolve(root, relative); requireGate(resolved.startsWith(path.resolve(root) + path.sep), "record_path");
  const stat = fs.lstatSync(resolved); requireGate(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 512*1024, "record_file");
  return fs.readFileSync(resolved);
}
function expectedRelease(record) {
  const updater = record.updater?.unchanged_asset_hashes?.[`ApolloUniversalPiUpdater-${record.updater?.version}-linux-arm64.zip`];
  return {version: record.target?.version, build: record.target?.build, source_commit: record.target?.source_commit,
    application_sha256: record.target?.sha256, updater_version: record.updater?.version, updater_sha256: updater?.sha256,
    installer_sha256: record.installer?.sha256, installer_bytes: record.installer?.bytes};
}
function validateRecord(record, relative, root, policy) {
  const bytes = read(root, relative);
  if (policy.held_installer_sha256_lf?.[relative] === hash(bytes.toString("utf8").replace(/\r\n/g,"\n"))) return {held: true, record};
  const onboarding = record.schema_version === "apollo-pi-installer-distribution-v3";
  requireGate((onboarding || record.schema_version === "apollo-pi-installer-distribution-v2") && record.publication_status === "qualified", "installer_contract");
  if (onboarding) requireGate(record.qualification_scope === "installer_onboarding"
    && exact(record.live_rf_reporting, ["qualified", "reason"]) && record.live_rf_reporting.qualified === false
    && record.live_rf_reporting.reason === "separate_live_rf_qualification_required"
    && !Object.hasOwn(record, "live_qualification"), "installer_scope");
  const expected = expectedRelease(record);
  requireGate(typeof expected.version === "string" && /^\d+\.\d+\.\d+$/.test(expected.version)
    && integer(expected.build) && expected.build > 0 && /^[a-f0-9]{40}$/.test(expected.source_commit || "")
    && [expected.application_sha256,expected.updater_sha256,expected.installer_sha256].every(hex)
    && integer(expected.installer_bytes) && expected.installer_bytes > 0 && /^\d+\.\d+\.\d+$/.test(expected.updater_version || ""), "installer_identity");
  const tag = `apollo-pi-installer-v${expected.version}-build.${expected.build}-updater.${expected.updater_version}`;
  requireGate(record.release_tag === tag && relative === `installers/${tag}.json`
    && record.installer.filename === `Apollo-Pi-Installer-${expected.version}-build.${expected.build}-updater.${expected.updater_version}-linux-arm64.zip`, "installer_tag");
  const provenance = JSON.parse(read(root, `provenance/apollo-passive-v${expected.version}-build.${expected.build}.json`));
  requireGate(provenance.source?.commit === expected.source_commit && provenance.package?.sha256 === expected.application_sha256, "application_provenance");
  const reference = onboarding ? record.onboarding_qualification : record.live_qualification;
  requireGate(exact(reference, ["path", "sha256"]) && reference.path === `qualifications/${tag}.${onboarding ? "onboarding" : "live"}.json` && hex(reference.sha256), "evidence_required");
  const evidence = read(root, reference.path); requireGate(hash(evidence) === reference.sha256, "evidence_digest");
  (onboarding ? validateOnboardingEvidence : validateEvidence)(JSON.parse(evidence), expected, policy);
  return {held: false, record, scope: onboarding ? "installer_onboarding" : "live_rf"};
}
function validateRepository(root = ROOT) {
  const policy = JSON.parse(read(root,"policy/pi-live-qualification.json"));
  requireGate(policy.required_lab_role === "owned-rtl-bench" && Object.keys(policy.trusted_keys || {}).length > 0, "trust_policy");
  const records = fs.readdirSync(path.join(root,"installers")).filter(n => n.endsWith(".json"));
  requireGate(Object.keys(policy.held_installer_sha256_lf || {}).every(n => records.includes(n.replace(/^installers\//,""))), "historical_record_missing");
  const validated = records.map(n => validateRecord(JSON.parse(read(root,`installers/${n}`)),`installers/${n}`,root,policy));
  const stable = JSON.parse(read(root,"stable/apollo-passive-receive-linux-arm64.json"));
  if (fingerprint(stable) !== policy.held_stable_fingerprint) {
    requireGate(validated.some(v => !v.held && v.record.target?.build === stable.build
      && v.record.target?.source_commit === stable.source_commit && v.record.target?.sha256 === stable.sha256
      && v.record.target?.version === stable.version && v.record.updater?.version === stable.minimum_pi_updater_version), "stable_requires_matching_qualified_installer");
  }
  return {records: validated.length, signed: validated.filter(v => !v.held).length};
}
if (require.main === module) {
  try { console.log("pi-live-qualification: PASS " + JSON.stringify(validateRepository())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = {DOMAIN, ONBOARDING_DOMAIN, ERRORS, hash, fingerprint, validateEvidence, validateOnboardingEvidence, expectedRelease, validateRecord, validateRepository};
