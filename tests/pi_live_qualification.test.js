"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const {prepare,publish}=require("../scripts/publish_pi_installer");
const cp=require("node:child_process");
const {DOMAIN,ERRORS,hash,fingerprint,validateEvidence,validateRepository} = require("../scripts/validate_pi_live_qualification");
const {ONBOARDING_DOMAIN,validateOnboardingEvidence} = require("../scripts/validate_pi_live_qualification");
const {privateKey,publicKey} = crypto.generateKeyPairSync("ed25519");
const policy = {trusted_keys:{fixture:publicKey.export({type:"spki",format:"pem"})},required_lab_role:"owned-rtl-bench"};
const h = v => hash(String(v)), at = n => new Date(Date.UTC(2026,9,15,12,0,n)).toISOString();
const expected = {version:"2.3.80",build:293,source_commit:"a".repeat(40),application_sha256:h("application"),updater_version:"1.0.83",updater_sha256:h("updater"),installer_sha256:h("installer"),installer_bytes:100};
function phase(offset, boot) {
  return {started_at:at(offset),completed_at:at(offset+180),boot_fingerprint:h(boot),
    checkin:{received_at:at(offset+40),event_fingerprint:h("heartbeat"+boot)},
    report:{observed_at:at(offset+60),received_at:at(offset+70),event_fingerprint:h("report"+boot),source_version:expected.version},
    samples:[30,90,150].map((s,i)=>({at:at(offset+s),accepted_captures:10+i,errors:Object.fromEntries(ERRORS.map(k=>[k,0])),
      windows:[0,1].map(index=>({index,sweeps:10+i,sampled_at:at(offset+s-1)}))}))};
}
function payload() { return {schema_version:"apollo-pi-live-qualification-v1",release:{...expected,agent_sha256:h("agent")},
  lab:{role:"owned-rtl-bench",receiver_kind:"rtl_sdr",registered_before_install:true},started_at:at(0),completed_at:at(600),
  backend:{host:"www.repeaterbook.com",authority_revision:2,client_binding_verified:true},
  install:{before_state_sha256:h("state"),after_state_sha256:h("state"),repeat_state_sha256:h("state"),activated_agent_sha256:h("agent"),updater_version:"1.0.83",transaction_recorded:true},
  pre_reboot:phase(0,"first"),post_reboot:phase(300,"second")}; }
function sign(p) { const bytes=Buffer.from(JSON.stringify(p));return {schema_version:"apollo-pi-live-qualification-attestation-v1",key_id:"fixture",payload:bytes.toString("base64"),signature:crypto.sign(null,Buffer.concat([DOMAIN,bytes]),privateKey).toString("base64")}; }
function validate(p) { return validateEvidence(sign(p),expected,policy,Date.UTC(2026,9,15,13)); }
function baselineRepository(root) {
  // Isolate historical fixtures from future real signed releases and keys.
  const source=path.join(__dirname,"..");
  for(const name of ["policy","provenance"])fs.cpSync(path.join(source,name),path.join(root,name),{recursive:true});
  for(const name of ["installers","stable"])fs.mkdirSync(path.join(root,name));
  const trust=JSON.parse(fs.readFileSync(path.join(root,"policy/pi-live-qualification.json")));
  for(const relative of Object.keys(trust.held_installer_sha256_lf))fs.copyFileSync(path.join(source,relative),path.join(root,relative));
  const stable={version:"2.3.79",build:292,minimum_pi_updater_version:"1.0.83"};
  trust.held_stable_fingerprint=fingerprint(stable);
  fs.writeFileSync(path.join(root,"stable/apollo-passive-receive-linux-arm64.json"),JSON.stringify(stable));
  fs.writeFileSync(path.join(root,"policy/pi-live-qualification.json"),JSON.stringify(trust));
}
test("signed complete owned-node evidence passes",()=>assert.equal(validate(payload()).release.build,293));
const cases = {
  "customer node":p=>p.lab.role="customer",
  "unregistered bench":p=>p.lab.registered_before_install=false,
  "wrong hardware":p=>p.lab.receiver_kind="simulated",
  "staging server substituted":p=>p.backend.host="staging.example",
  "unverified binding":p=>p.backend.client_binding_verified=false,
  "application changed":p=>p.release.application_sha256=h("other"),
  "installer changed":p=>p.release.installer_sha256=h("other"),
  "updater changed":p=>p.release.updater_sha256=h("other"),
  "source changed":p=>p.release.source_commit="b".repeat(40),
  "build changed":p=>p.release.build=294,
  "private state changed":p=>p.install.after_state_sha256=h("other"),
  "retry damages settings":p=>p.install.repeat_state_sha256=h("other"),
  "old agent remains active":p=>p.install.activated_agent_sha256=h("old agent"),
  "activation transaction absent":p=>p.install.transaction_recorded=false,
  "missing pre-reboot checkin":p=>delete p.pre_reboot.checkin,
  "missing post-reboot report":p=>delete p.post_reboot.report,
  "old queued RF":p=>p.post_reboot.report.observed_at=at(20),
  "old server receipt":p=>p.post_reboot.report.received_at=at(20),
  "wrong report version":p=>p.post_reboot.report.source_version="2.3.79",
  "replayed heartbeat":p=>p.post_reboot.checkin.event_fingerprint=p.pre_reboot.checkin.event_fingerprint,
  "replayed report":p=>p.post_reboot.report.event_fingerprint=p.pre_reboot.report.event_fingerprint,
  "no actual reboot":p=>p.post_reboot.boot_fingerprint=p.pre_reboot.boot_fingerprint,
  "too few RF samples":p=>p.post_reboot.samples.pop(),
  "window missing":p=>p.post_reboot.samples[2].windows.pop(),
  "window lost across reboot":p=>p.post_reboot.samples.forEach(s=>s.windows.pop()),
  "stalled window":p=>p.post_reboot.samples[2].windows[1].sweeps=10,
  "stale window time":p=>p.post_reboot.samples[2].windows[1].sampled_at=at(329),
  "no captures":p=>p.post_reboot.samples.forEach(s=>s.accepted_captures=10),
  "receiver error":p=>p.post_reboot.samples[2].errors.usb_disconnects=1,
  "receiver counter reset":p=>{p.post_reboot.samples[0].errors.failed_sweeps=1;},
  "private field leak":p=>p.lab.node_uuid="do-not-publish",
};
for (const [name,change] of Object.entries(cases)) test("rejects "+name,()=>{const p=payload();change(p);assert.throws(()=>validate(p),/pi_live_qualification_/);});
test("rejects unsigned, altered and unknown-signer attestations",()=>{
  const good=sign(payload());
  assert.throws(()=>validateEvidence({...good,signature:Buffer.alloc(64).toString("base64")},expected,policy),/signature/);
  assert.throws(()=>validateEvidence({...good,key_id:"untrusted"},expected,policy),/untrusted_signer/);
  assert.throws(()=>validateEvidence({...good,payload:Buffer.from(good.payload,"base64").toString("base64").slice(1)},expected,policy));
});
test("existing published records pass; altered historical and new unqualified records fail",()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"apollo-public-gate-"));
  try {
    baselineRepository(root);
    assert.equal(validateRepository(root).records,5);
    const record=JSON.parse(fs.readFileSync(path.join(root,"installers/apollo-pi-installer-v2.3.79-build.292-updater.1.0.83.json")));
    record.qualification={pass:true};fs.writeFileSync(path.join(root,"installers/new.json"),JSON.stringify(record));
    assert.throws(()=>validateRepository(root),/installer_contract/);fs.unlinkSync(path.join(root,"installers/new.json"));
    fs.writeFileSync(path.join(root,"installers/apollo-pi-installer-v2.3.79-build.292-updater.1.0.83.json"),JSON.stringify(record));
    assert.throws(()=>validateRepository(root),/installer_contract/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
test("new stable target without a matching qualified installer is blocked",()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"apollo-stable-gate-"));
  try {
    baselineRepository(root);
    const file=path.join(root,"stable/apollo-passive-receive-linux-arm64.json"),stable=JSON.parse(fs.readFileSync(file));
    stable.build=293;fs.writeFileSync(file,JSON.stringify(stable));assert.throws(()=>validateRepository(root),/stable_requires_matching_qualified_installer/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});

function qualifiedRepository(root) {
  baselineRepository(root);
  const trust=JSON.parse(fs.readFileSync(path.join(root,"policy/pi-live-qualification.json")));
  trust.trusted_keys=policy.trusted_keys;
  fs.writeFileSync(path.join(root,"policy/pi-live-qualification.json"),JSON.stringify(trust));
  const tag="apollo-pi-installer-v2.3.80-build.293-updater.1.0.83",archive=Buffer.alloc(100,42);
  const p=payload();p.release.installer_sha256=hash(archive);
  const proof=Buffer.from(JSON.stringify(sign(p))),proofPath=`qualifications/${tag}.live.json`;
  fs.mkdirSync(path.join(root,"qualifications"));fs.writeFileSync(path.join(root,proofPath),proof);
  const record={schema_version:"apollo-pi-installer-distribution-v2",publication_status:"qualified",release_tag:tag,
    target:{version:expected.version,build:expected.build,source_commit:expected.source_commit,sha256:expected.application_sha256},
    updater:{version:expected.updater_version,unchanged_asset_hashes:{"ApolloUniversalPiUpdater-1.0.83-linux-arm64.zip":{sha256:expected.updater_sha256}}},
    installer:{filename:"Apollo-Pi-Installer-2.3.80-build.293-updater.1.0.83-linux-arm64.zip",bytes:100,sha256:hash(archive)},
    live_qualification:{path:proofPath,sha256:hash(proof)}};
  fs.writeFileSync(path.join(root,"installers",tag+".json"),JSON.stringify(record));
  fs.writeFileSync(path.join(root,"provenance/apollo-passive-v2.3.80-build.293.json"),JSON.stringify({source:{commit:expected.source_commit},package:{sha256:expected.application_sha256}}));
  const file=path.join(root,record.installer.filename);fs.writeFileSync(file,archive);
  return {tag,record,file,proofPath};
}
test("signed exact-artifact record permits promotion and publication preparation",()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"apollo-qualified-"));
  try {
    const {tag,record,file}=qualifiedRepository(root);
    const stable=JSON.parse(fs.readFileSync(path.join(root,"stable/apollo-passive-receive-linux-arm64.json")));
    Object.assign(stable,{...record.target,minimum_pi_updater_version:record.updater.version});
    fs.writeFileSync(path.join(root,"stable/apollo-passive-receive-linux-arm64.json"),JSON.stringify(stable));
    assert.equal(validateRepository(root).signed,1);
    assert.equal(prepare(root,tag,file).record.target.build,293);
    fs.writeFileSync(file,Buffer.alloc(100,43));assert.throws(()=>prepare(root,tag,file),/qualified_installer_bytes_mismatch/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test("publisher rejects invalid evidence before any external command or mutation",t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"apollo-publish-held-"));
  try {
    const {tag,record,file,proofPath}=qualifiedRepository(root);
    const command=t.mock.method(cp,"execFileSync",()=>{throw Error("unexpected external command");});
    const envelope=JSON.parse(fs.readFileSync(path.join(root,proofPath)));envelope.signature=Buffer.alloc(64).toString("base64");
    const bytes=Buffer.from(JSON.stringify(envelope));fs.writeFileSync(path.join(root,proofPath),bytes);
    record.live_qualification.sha256=hash(bytes);fs.writeFileSync(path.join(root,"installers",tag+".json"),JSON.stringify(record));
    assert.throws(()=>publish(root,tag,file),/signature/);assert.equal(command.mock.callCount(),0);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test("installer revisions retain exact signed evidence and require matching immutable names",()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"apollo-revised-installer-"));
  try {
    const {tag,record,file,proofPath}=qualifiedRepository(root);
    const revisedTag=tag+"-revision.2";
    record.installer_revision=2;record.release_tag=revisedTag;
    record.installer.filename=record.installer.filename.replace("-linux-arm64.zip","-revision.2-linux-arm64.zip");
    const revisedFile=path.join(root,record.installer.filename);fs.renameSync(file,revisedFile);
    const revisedProof=`qualifications/${revisedTag}.live.json`;
    fs.renameSync(path.join(root,proofPath),path.join(root,revisedProof));record.live_qualification.path=revisedProof;
    const recordFile=path.join(root,"installers",revisedTag+".json");
    fs.unlinkSync(path.join(root,"installers",tag+".json"));fs.writeFileSync(recordFile,JSON.stringify(record));
    assert.equal(prepare(root,revisedTag,revisedFile).record.installer_revision,2);
    for(const revision of [0,1,-2,"2",2.5]) {
      record.installer_revision=revision;fs.writeFileSync(recordFile,JSON.stringify(record));
      assert.throws(()=>prepare(root,revisedTag,revisedFile),/installer_revision/);
    }
    record.installer_revision=3;fs.writeFileSync(recordFile,JSON.stringify(record));
    assert.throws(()=>prepare(root,revisedTag,revisedFile),/installer_tag/);
    record.installer_revision=2;record.installer.sha256=h("different installer");fs.writeFileSync(recordFile,JSON.stringify(record));
    assert.throws(()=>prepare(root,revisedTag,revisedFile),/artifact_mismatch_installer_sha256/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test("removing a historical record fails closed",()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"apollo-history-held-"));
  try {
    qualifiedRepository(root);
    fs.unlinkSync(path.join(root,"installers/apollo-pi-installer-v2.3.79-build.292-updater.1.0.83.json"));
    assert.throws(()=>validateRepository(root),/historical_record_missing/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

const onboardingPolicy = {...policy,allowed_qualification_scopes:["live_rf","installer_onboarding"]};
function onboardingPayload() {
  const p=payload();p.schema_version="apollo-pi-onboarding-qualification-v1";
  p.pre_reboot.report=null;p.post_reboot.report=null;
  p.live_rf_reporting={qualified:false,reason:"separate_live_rf_qualification_required"};
  p.onboarding={application_source_commit:expected.source_commit,website_test_source_commit:"c".repeat(40),
    website_test_sha256:h("test"),runtime_modules_sha256:h("modules"),test_log_sha256:h("logs"),
    server_checks:51,runtime_tests:12,production_records_mutated:false};
  return p;
}
function signOnboarding(p) {
  const bytes=Buffer.from(JSON.stringify(p));
  return {schema_version:"apollo-pi-onboarding-qualification-attestation-v1",key_id:"fixture",payload:bytes.toString("base64"),
    signature:crypto.sign(null,Buffer.concat([ONBOARDING_DOMAIN,bytes]),privateKey).toString("base64")};
}
function validateOnboarding(p) {return validateOnboardingEvidence(signOnboarding(p),expected,onboardingPolicy,Date.UTC(2026,9,15,13));}
test("quiet owned bench can qualify onboarding with RF reporting explicitly pending",()=>{
  const envelope=signOnboarding(onboardingPayload());
  assert.equal(validateOnboardingEvidence(envelope,expected,onboardingPolicy,Date.UTC(2026,9,15,13)).live_rf_reporting.qualified,false);
  assert.throws(()=>validateEvidence(envelope,expected,onboardingPolicy),/attestation/);
  assert.throws(()=>validateOnboardingEvidence(envelope,expected,policy),/scope_not_authorized/);
  const p=payload();p.post_reboot.report=null;assert.throws(()=>validate(p),/report/);
});
for (const name of ["customer node","unregistered bench","wrong hardware","unverified binding","source changed","installer changed",
  "private state changed","retry damages settings","old agent remains active","activation transaction absent",
  "missing pre-reboot checkin","replayed heartbeat","no actual reboot","too few RF samples","window missing",
  "window lost across reboot","stalled window","stale window time","no captures","receiver error","private field leak"]) {
  test("onboarding still rejects "+name,()=>{const p=onboardingPayload();cases[name](p);assert.throws(()=>validateOnboarding(p),/pi_live_qualification_/);});
}
for (const [name,change] of Object.entries({
  "RF claim":p=>p.live_rf_reporting.qualified=true,
  "missing onboarding tests":p=>delete p.onboarding,
  "wrong application under test":p=>p.onboarding.application_source_commit="d".repeat(40),
  "missing test logs":p=>p.onboarding.test_log_sha256="",
  "no server checks":p=>p.onboarding.server_checks=0,
  "no runtime checks":p=>p.onboarding.runtime_tests=0,
  "production test mutation":p=>p.onboarding.production_records_mutated=true,
  "RF report relabel":p=>p.pre_reboot.report=phase(0,"first").report,
})) test("onboarding rejects "+name,()=>{const p=onboardingPayload();change(p);assert.throws(()=>validateOnboarding(p),/pi_live_qualification_/);});
test("onboarding signature cannot be relabeled as live qualification",()=>{
  const envelope=signOnboarding(onboardingPayload());
  assert.throws(()=>validateEvidence({...envelope,schema_version:"apollo-pi-live-qualification-attestation-v1"},expected,onboardingPolicy),/signature/);
});
test("scoped v3 record permits installer and stable publication without claiming RF delivery",()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"apollo-onboarding-"));
  try {
    const {tag,record,file,proofPath}=qualifiedRepository(root);
    const p=onboardingPayload();p.release.installer_sha256=record.installer.sha256;
    const bytes=Buffer.from(JSON.stringify(signOnboarding(p))),relative=`qualifications/${tag}.onboarding.json`;
    fs.writeFileSync(path.join(root,relative),bytes);fs.unlinkSync(path.join(root,proofPath));
    Object.assign(record,{schema_version:"apollo-pi-installer-distribution-v3",qualification_scope:"installer_onboarding",
      live_rf_reporting:p.live_rf_reporting,onboarding_qualification:{path:relative,sha256:hash(bytes)}});
    delete record.live_qualification;
    const recordFile=path.join(root,"installers",tag+".json");fs.writeFileSync(recordFile,JSON.stringify(record));
    assert.equal(prepare(root,tag,file).record.live_rf_reporting.qualified,false);
    fs.writeFileSync(path.join(root,"stable/apollo-passive-receive-linux-arm64.json"),JSON.stringify({...record.target,minimum_pi_updater_version:record.updater.version}));
    assert.equal(validateRepository(root).signed,1);
    record.live_rf_reporting.qualified=true;fs.writeFileSync(recordFile,JSON.stringify(record));
    assert.throws(()=>prepare(root,tag,file),/installer_scope/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
