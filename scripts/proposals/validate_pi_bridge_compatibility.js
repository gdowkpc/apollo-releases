"use strict";
// Review prototype only. Deliberately not imported by publication tooling.
const crypto = require("node:crypto");
const DOMAIN = Buffer.from("apollo-pi-dashboard-bridge-compatibility-v1\n");
const hash = b => crypto.createHash("sha256").update(b).digest("hex");
const hex = x => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const version = x => typeof x === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(x)
  && x.length < 64 && x.split(".").every(n => Number.isSafeInteger(Number(n)));
const compare = (a,b) => { const aa=a.split(".").map(Number),bb=b.split(".").map(Number); for(let i=0;i<3;i++)if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1;return 0; };
const exact = (v,keys) => v && typeof v === "object" && !Array.isArray(v)
  && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v,k));
function gate(ok,code) { if(!ok)throw Error("pi_bridge_compatibility_"+code); }
function same(v,expected,code) { gate(exact(v,Object.keys(expected)) && Object.keys(expected).every(k=>v[k]===expected[k]),code); }
function time(v) { gate(typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v) && Number.isFinite(Date.parse(v)),"timestamp");return Date.parse(v); }
function decode(v,max) {
  gate(typeof v === "string" && v.length<=max*2 && /^[A-Za-z0-9+/]*={0,2}$/.test(v),"base64");
  const b=Buffer.from(v,"base64");gate(b.length<=max && b.toString("base64")===v,"base64");return b;
}
function progress(p,start,end) {
  gate(exact(p,["started_at","completed_at","samples"]),"progress_fields");
  const a=time(p.started_at),b=time(p.completed_at);gate(a>=start && b<=end && b>a,"progress_interval");
  gate(Array.isArray(p.samples) && p.samples.length>=3 && p.samples.length<=20,"progress_samples");
  let prior=null,indexes=null;
  for(const s of p.samples) {
    gate(exact(s,["at","accepted_captures","errors_sha256","windows"]) && time(s.at)>=a && time(s.at)<=b
      && Number.isSafeInteger(s.accepted_captures) && s.accepted_captures>=0 && hex(s.errors_sha256),"progress_sample");
    gate(Array.isArray(s.windows) && s.windows.length>0 && s.windows.length<=128,"progress_windows");
    const found=s.windows.map(w=>{
      gate(exact(w,["index","sweeps","sampled_at"]) && Number.isSafeInteger(w.index) && w.index>=0
        && Number.isSafeInteger(w.sweeps) && w.sweeps>0 && time(w.sampled_at)>=a && time(w.sampled_at)<=time(s.at),"progress_window");
      return w.index;
    }).sort((x,y)=>x-y);
    gate(new Set(found).size===found.length && (!indexes || JSON.stringify(found)===JSON.stringify(indexes)),"window_set");indexes=found;
    if(prior)gate(time(s.at)>time(prior.at) && s.accepted_captures>=prior.accepted_captures && s.errors_sha256===prior.errors_sha256,"receiver_error_or_reset");
    prior=s;
  }
  const first=p.samples[0],last=p.samples.at(-1);
  gate(time(last.at)-time(first.at)>=120000 && last.accepted_captures>first.accepted_captures,"sustained_receiver_progress");
  for(const w of last.windows) {const old=first.windows.find(o=>o.index===w.index);gate(w.sweeps>old.sweeps && time(w.sampled_at)>time(old.sampled_at),"stalled_window");}
  return indexes;
}
function validateBridgeEvidence(envelope, expected, policy, now=Date.now()) {
  gate(policy.allowed_qualification_scopes?.includes("dashboard_bridge_compatibility"),"scope_not_authorized");
  // Caller must derive these from independently verified repository evidence and
  // the complete immutable signed-updater inventory, never from this receipt.
  gate(exact(expected,["release","installer_evidence_sha256","minimum_updater_version","updater_inventory_sha256","required_updaters"]),"expectation_fields");
  const r=expected.release;
  gate(exact(r,["version","build","source_commit","application_sha256","updater_version","updater_sha256","installer_sha256","installer_bytes"])
    && version(r.version) && Number.isSafeInteger(r.build) && r.build>0 && /^[a-f0-9]{40}$/.test(r.source_commit||"")
    && [r.application_sha256,r.updater_sha256,r.installer_sha256,expected.installer_evidence_sha256,expected.updater_inventory_sha256].every(hex)
    && Number.isSafeInteger(r.installer_bytes) && r.installer_bytes>0 && version(r.updater_version)
    && version(expected.minimum_updater_version) && compare(expected.minimum_updater_version,r.updater_version)<0,"expectation_identity");
  gate(Array.isArray(expected.required_updaters) && expected.required_updaters.length>0 && expected.required_updaters.length<=32,"updater_inventory");
  const versions=new Set();
  for(const u of expected.required_updaters) {
    gate(exact(u,["version","package_sha256","capsule_sha256"]) && version(u.version) && hex(u.package_sha256) && hex(u.capsule_sha256)
      && compare(u.version,expected.minimum_updater_version)>=0 && compare(u.version,r.updater_version)<0 && !versions.has(u.version),"updater_inventory");versions.add(u.version);
  }
  gate(versions.has(expected.minimum_updater_version),"minimum_not_covered");
  gate(exact(envelope,["schema_version","key_id","payload","signature"])
    && envelope.schema_version==="apollo-pi-dashboard-bridge-compatibility-attestation-v1","attestation");
  const key=policy.trusted_keys?.[envelope.key_id];gate(typeof key==="string","untrusted_signer");
  const bytes=decode(envelope.payload,256*1024),signature=decode(envelope.signature,64);
  gate(signature.length===64 && crypto.verify(null,Buffer.concat([DOMAIN,bytes]),key,signature),"signature");
  const p=JSON.parse(bytes.toString("utf8"));gate(JSON.stringify(p)===bytes.toString("utf8"),"canonical_json");
  gate(exact(p,["schema_version","release","installer_evidence_sha256","minimum_updater_version","updater_inventory_sha256","lab","started_at","completed_at","live_rf_reporting","cases"])
    && p.schema_version==="apollo-pi-dashboard-bridge-compatibility-v1","payload");
  same(p.release,r,"release_identity");
  for(const k of ["installer_evidence_sha256","minimum_updater_version","updater_inventory_sha256"])gate(p[k]===expected[k],"binding_"+k);
  same(p.lab,{role:"owned-rtl-bench",receiver_kind:"rtl_sdr",production_credentials_used:false,production_records_mutated:false},"lab");
  same(p.live_rf_reporting,{qualified:false,reason:"separate_live_rf_qualification_required"},"rf_scope");
  const start=time(p.started_at),end=time(p.completed_at);gate(end>start && end<=now+300000 && end-start<=86400000,"run_interval");
  gate(Array.isArray(p.cases) && p.cases.length===versions.size,"coverage");
  const seen=new Set();
  for(const c of p.cases) {
    gate(exact(c,["updater","baseline","advertisement","native","preservation","activation","rollback","retry","logs_sha256"]),"case_fields");
    const wanted=expected.required_updaters.find(u=>u.version===c.updater?.version);
    gate(wanted && !seen.has(wanted.version),"coverage");seen.add(wanted.version);same(c.updater,wanted,"updater_identity");
    gate(exact(c.baseline,["kind","application_sha256","installer_sha256","manifest_sha256","reporting_enabled"])
      && c.baseline.kind==="fixture_existing_install" && [c.baseline.application_sha256,c.baseline.installer_sha256,c.baseline.manifest_sha256].every(hex)
      && c.baseline.reporting_enabled===false,"baseline_scope");
    gate(exact(c.advertisement,["kind","sha256","target_application_sha256"])
      && c.advertisement.kind==="private_descriptor_fixture" && hex(c.advertisement.sha256)
      && c.advertisement.target_application_sha256===r.application_sha256,"advertisement_scope");
    same(c.native,{systemd:true,real_root_worker:true,physical_usb:true,tls_verification:true,signature_verification:true,
      service_adapters:false,process_adapters:false,hardware_adapters:false,health_adapters:false,authority_adapters:false},"native_boundaries");
    gate(exact(c.preservation,["before_sha256","activated_sha256","rollback_sha256","retry_sha256","manifest_sha256"])
      && hex(c.preservation.before_sha256) && hex(c.preservation.manifest_sha256)
      && [c.preservation.activated_sha256,c.preservation.rollback_sha256,c.preservation.retry_sha256].every(v=>v===c.preservation.before_sha256),"preservation");
    gate(exact(c.activation,["application_sha256","agent_sha256","updater_version","transaction_sha256","before_restart","after_restart","before_boot_sha256","after_boot_sha256"])
      && c.activation.application_sha256===r.application_sha256 && c.activation.updater_version===r.updater_version
      && [c.activation.agent_sha256,c.activation.transaction_sha256,c.activation.before_boot_sha256,c.activation.after_boot_sha256].every(hex)
      && c.activation.before_boot_sha256!==c.activation.after_boot_sha256,"activation");
    const pre=progress(c.activation.before_restart,start,end),post=progress(c.activation.after_restart,start,end);
    gate(JSON.stringify(pre)===JSON.stringify(post) && time(c.activation.after_restart.started_at)>time(c.activation.before_restart.completed_at),"restart");
    gate(exact(c.rollback,["forced_failure","restored_application_sha256","restored_updater_version","transaction_sha256","services_recovered"])
      && c.rollback.forced_failure===true && c.rollback.restored_application_sha256===c.baseline.application_sha256
      && c.rollback.restored_updater_version===wanted.version && hex(c.rollback.transaction_sha256) && c.rollback.services_recovered===true,"rollback");
    gate(exact(c.retry,["application_sha256","updater_version","transaction_sha256"])
      && c.retry.application_sha256===r.application_sha256 && c.retry.updater_version===r.updater_version
      && hex(c.retry.transaction_sha256) && new Set([c.activation.transaction_sha256,c.rollback.transaction_sha256,c.retry.transaction_sha256]).size===3
      && hex(c.logs_sha256),"retry");
  }
  return p;
}
module.exports={DOMAIN,hash,validateBridgeEvidence};
