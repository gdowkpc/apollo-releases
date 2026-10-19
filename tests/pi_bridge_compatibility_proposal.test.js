"use strict";
// Ephemeral test keys and synthetic payloads exercise validation only. These
// never enter qualifications/ and cannot sign production qualification evidence.
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const {DOMAIN,hash,validateBridgeEvidence}=require("../scripts/proposals/validate_pi_bridge_compatibility");
const {privateKey,publicKey}=crypto.generateKeyPairSync("ed25519"),h=v=>hash(String(v));
const policy={allowed_qualification_scopes:["dashboard_bridge_compatibility"],trusted_keys:{fixture:publicKey.export({type:"spki",format:"pem"})}};
const at=s=>new Date(Date.UTC(2026,9,19,12,0,s)).toISOString(),now=Date.UTC(2026,9,19,13);
const expected={release:{version:"4.0.9",build:900,source_commit:"a".repeat(40),application_sha256:h("app"),updater_version:"2.0.9",
  updater_sha256:h("new updater"),installer_sha256:h("installer"),installer_bytes:100},installer_evidence_sha256:h("normal onboarding receipt"),
  minimum_updater_version:"2.0.5",updater_inventory_sha256:h("independently verified full inventory"),
  required_updaters:[5,7].map(n=>({version:`2.0.${n}`,package_sha256:h("updater"+n),capsule_sha256:h("signed capsule"+n)}))};
function progress(offset){return {started_at:at(offset),completed_at:at(offset+180),samples:[30,90,150].map((s,i)=>({at:at(offset+s),accepted_captures:10+i,
  errors_sha256:h("unchanged counters"),windows:[0,1].map(index=>({index,sweeps:10+i,sampled_at:at(offset+s-1)}))}))};}
function payload(){return {schema_version:"apollo-pi-dashboard-bridge-compatibility-v1",release:{...expected.release},
  installer_evidence_sha256:expected.installer_evidence_sha256,minimum_updater_version:expected.minimum_updater_version,
  updater_inventory_sha256:expected.updater_inventory_sha256,lab:{role:"owned-rtl-bench",receiver_kind:"rtl_sdr",production_credentials_used:false,production_records_mutated:false},
  started_at:at(0),completed_at:at(900),live_rf_reporting:{qualified:false,reason:"separate_live_rf_qualification_required"},
  cases:expected.required_updaters.map(u=>({updater:{...u},baseline:{kind:"fixture_existing_install",application_sha256:h("original application"),installer_sha256:h("original installer"),manifest_sha256:h("baseline manifest"),reporting_enabled:false},
    advertisement:{kind:"private_descriptor_fixture",sha256:h("private descriptor"),target_application_sha256:expected.release.application_sha256},
    native:{systemd:true,real_root_worker:true,physical_usb:true,tls_verification:true,signature_verification:true,service_adapters:false,process_adapters:false,hardware_adapters:false,health_adapters:false,authority_adapters:false},
    preservation:{before_sha256:h("owned state bytes and metadata"),activated_sha256:h("owned state bytes and metadata"),rollback_sha256:h("owned state bytes and metadata"),retry_sha256:h("owned state bytes and metadata"),manifest_sha256:h("preservation manifest")},
    activation:{application_sha256:expected.release.application_sha256,agent_sha256:h("activated agent"),updater_version:expected.release.updater_version,transaction_sha256:h("apply"),before_restart:progress(0),after_restart:progress(300),before_boot_sha256:h("boot1"),after_boot_sha256:h("boot2")},
    rollback:{forced_failure:true,restored_application_sha256:h("original application"),restored_updater_version:u.version,transaction_sha256:h("rollback"),services_recovered:true},
    retry:{application_sha256:expected.release.application_sha256,updater_version:expected.release.updater_version,transaction_sha256:h("retry")},logs_sha256:h("logs")}))};}
function sign(p,domain=DOMAIN){const bytes=Buffer.from(JSON.stringify(p));return {schema_version:"apollo-pi-dashboard-bridge-compatibility-attestation-v1",key_id:"fixture",payload:bytes.toString("base64"),signature:crypto.sign(null,Buffer.concat([domain,bytes]),privateKey).toString("base64")};}
function validate(p){return validateBridgeEvidence(sign(p),expected,policy,now);}
test("prototype accepts separately signed exact-app complete legacy coverage",()=>assert.equal(validate(payload()).cases.length,2));
const cases={
  "changed application":p=>p.release.application_sha256=h("other"),
  "changed source":p=>p.release.source_commit="b".repeat(40),
  "changed build":p=>p.release.build++,
  "borrowed newer installer receipt":p=>p.installer_evidence_sha256=h("other receipt"),
  "changed minimum":p=>p.minimum_updater_version="2.0.4",
  "changed inventory":p=>p.updater_inventory_sha256=h("other inventory"),
  "missing legacy version":p=>p.cases.pop(),
  "duplicate version hides gap":p=>p.cases[1]=structuredClone(p.cases[0]),
  "changed legacy package":p=>p.cases[0].updater.package_sha256=h("other"),
  "changed capsule":p=>p.cases[0].updater.capsule_sha256=h("other"),
  "customer machine":p=>p.lab.role="customer",
  "production credentials":p=>p.lab.production_credentials_used=true,
  "production mutation":p=>p.lab.production_records_mutated=true,
  "RF qualification claim":p=>p.live_rf_reporting.qualified=true,
  "unlabelled fixture baseline":p=>p.cases[0].baseline.kind="physical_customer_install",
  "fixture reporting enabled":p=>p.cases[0].baseline.reporting_enabled=true,
  "unlabelled catalog fixture":p=>p.cases[0].advertisement.kind="public_catalog",
  "different advertised app":p=>p.cases[0].advertisement.target_application_sha256=h("other"),
  "no physical USB":p=>p.cases[0].native.physical_usb=false,
  "no native systemd":p=>p.cases[0].native.systemd=false,
  "direct helper replaces root queue":p=>p.cases[0].native.real_root_worker=false,
  "TLS waiver":p=>p.cases[0].native.tls_verification=false,
  "signature waiver":p=>p.cases[0].native.signature_verification=false,
  "settings lost":p=>p.cases[0].preservation.activated_sha256=h("other"),
  "rollback state lost":p=>p.cases[0].preservation.rollback_sha256=h("other"),
  "retry identity lost":p=>p.cases[0].preservation.retry_sha256=h("other"),
  "old app active":p=>p.cases[0].activation.application_sha256=h("old app"),
  "no updater upgrade":p=>p.cases[0].activation.updater_version="2.0.5",
  "no real restart":p=>p.cases[0].activation.after_boot_sha256=p.cases[0].activation.before_boot_sha256,
  "restart window lost":p=>p.cases[0].activation.after_restart.samples.forEach(s=>s.windows.pop()),
  "no receiver progress":p=>p.cases[0].activation.after_restart.samples.forEach(s=>s.accepted_captures=10),
  "receiver error":p=>p.cases[0].activation.after_restart.samples[2].errors_sha256=h("new error"),
  "stalled receiver window":p=>p.cases[0].activation.after_restart.samples[2].windows[0].sweeps=10,
  "rollback not exercised":p=>p.cases[0].rollback.forced_failure=false,
  "wrong rollback app":p=>p.cases[0].rollback.restored_application_sha256=h("wrong"),
  "wrong rollback updater":p=>p.cases[0].rollback.restored_updater_version="2.0.7",
  "rollback services failed":p=>p.cases[0].rollback.services_recovered=false,
  "retry not run":p=>p.cases[0].retry.transaction_sha256=p.cases[0].activation.transaction_sha256,
  "private field leak":p=>p.cases[0].node_credentials="private",
};
for(const field of ["service_adapters","process_adapters","hardware_adapters","health_adapters","authority_adapters"])cases[field]=p=>p.cases[0].native[field]=true;
for(const [name,change] of Object.entries(cases))test("prototype rejects "+name,()=>{const p=payload();change(p);assert.throws(()=>validate(p),/pi_bridge_compatibility_/);});
test("proposal requires explicit policy opt-in",()=>assert.throws(()=>validateBridgeEvidence(sign(payload()),expected,{...policy,allowed_qualification_scopes:["installer_onboarding"]},now),/scope_not_authorized/));
test("signature cannot cross existing onboarding or live domains",()=>{for(const d of ["apollo-pi-onboarding-qualification-v1\n","apollo-pi-live-qualification-v1\n"])assert.throws(()=>validateBridgeEvidence(sign(payload(),Buffer.from(d)),expected,policy,now),/signature/);});
test("rejects unknown signer and altered signature",()=>{const e=sign(payload());assert.throws(()=>validateBridgeEvidence({...e,key_id:"other"},expected,policy,now),/untrusted_signer/);assert.throws(()=>validateBridgeEvidence({...e,signature:Buffer.alloc(64).toString("base64")},expected,policy,now),/signature/);});
test("minimum must have an exact covered signed updater",()=>{const e=structuredClone(expected);e.minimum_updater_version="2.0.4";assert.throws(()=>validateBridgeEvidence(sign(payload()),e,policy,now),/minimum_not_covered/);});
test("prototype has no build or source exemption",()=>{const p=payload();p.release.version="4.0.10";p.release.build=901;p.release.source_commit="c".repeat(40);const e={...expected,release:p.release};assert.equal(validateBridgeEvidence(sign(p),e,policy,now).release.build,901);});
