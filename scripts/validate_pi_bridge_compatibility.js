"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs"), path = require("node:path");
const DOMAIN = Buffer.from("apollo-pi-dashboard-bridge-compatibility-v1\n");
const INVENTORY_DOMAIN = Buffer.from("apollo-pi-updater-inventory-v1\n");
const hash = b => crypto.createHash("sha256").update(b).digest("hex");
const ERROR_KEYS=["failed_sweeps","helper_crashes","sample_stream_stalls","usb_disconnects","unrecovered_timeout_sweeps","scheduled_sweep_failures"];
const EMPTY_ERRORS_SHA256=hash(JSON.stringify(Object.fromEntries(ERROR_KEYS.map(k=>[k,0]))));
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
function signedPayload(envelope,policy,prefix,domain,maximum) {
  gate(exact(envelope,["schema_version","key_id","payload","signature"]) && envelope.schema_version===prefix+"-attestation-v1","attestation");
  const key=policy.trusted_keys?.[envelope.key_id];gate(typeof key==="string","untrusted_signer");
  const bytes=decode(envelope.payload,maximum),signature=decode(envelope.signature,64);
  gate(signature.length===64 && crypto.verify(null,Buffer.concat([domain,bytes]),key,signature),"signature");
  const p=JSON.parse(bytes.toString("utf8"));gate(JSON.stringify(p)===bytes.toString("utf8"),"canonical_json");return p;
}
function validateUpdaterInventory(envelope,policy,minimum,target,now=Date.now()) {
  gate(policy.allowed_qualification_scopes?.includes("dashboard_bridge_compatibility"),"scope_not_authorized");
  gate(version(minimum) && version(target) && compare(minimum,target)<0,"inventory_range");
  const p=signedPayload(envelope,policy,"apollo-pi-updater-inventory",INVENTORY_DOMAIN,256*1024);
  gate(exact(p,["schema_version","repository","collected_at","complete","minimum_updater_version","maximum_updater_version","collector_source_commit","manifest_sha256","log_sha256","updaters"])
    && p.schema_version==="apollo-pi-updater-inventory-v1" && p.repository==="gdowkpc/apollo" && p.complete===true
    && p.minimum_updater_version===minimum && p.maximum_updater_version===target
    && /^[a-f0-9]{40}$/.test(p.collector_source_commit||"") && hex(p.manifest_sha256) && hex(p.log_sha256)
    && time(p.collected_at)<=now+300000,"inventory_authority");
  gate(Array.isArray(p.updaters) && p.updaters.length>0 && p.updaters.length<=512,"updater_inventory");
  const seen=new Set();
  for(const u of p.updaters) {
    gate(exact(u,["version","package_sha256","capsule_sha256"]) && version(u.version) && compare(u.version,minimum)>=0 && compare(u.version,target)<=0 && hex(u.package_sha256) && hex(u.capsule_sha256) && !seen.has(u.version),"updater_inventory");seen.add(u.version);
  }
  gate(seen.has(minimum) && seen.has(target),"inventory_endpoints");
  return {payload:p,required_updaters:p.updaters.filter(u=>compare(u.version,minimum)>=0 && compare(u.version,target)<0).sort((a,b)=>compare(a.version,b.version))};
}
function readRecord(root,relative) {
  gate(typeof relative==="string" && /^[A-Za-z0-9_.\/-]+\.json$/.test(relative) && !relative.split("/").some(v=>v===".." || v==="." || v===""),"record_path");
  const base=path.resolve(root),resolved=path.resolve(base,relative);gate(resolved.startsWith(base+path.sep),"record_path");
  let cursor=base;
  const parts=relative.split("/");
  for(let i=0;i<parts.length;i++) {cursor=path.join(cursor,parts[i]);const s=fs.lstatSync(cursor);gate(!s.isSymbolicLink() && (i===parts.length-1 ? s.isFile() && s.size<=512*1024 : s.isDirectory()),"record_file");}
  return fs.readFileSync(resolved);
}
function referenced(root,ref,expectedPath) {
  gate(exact(ref,["path","sha256"]) && ref.path===expectedPath && hex(ref.sha256),"record_reference");
  const bytes=readRecord(root,ref.path);gate(hash(bytes)===ref.sha256,"record_digest");return JSON.parse(bytes);
}
function progress(p,start,end,configuredWindows) {
  gate(Array.isArray(configuredWindows) && configuredWindows.length>0 && configuredWindows.length<=128
    && configuredWindows.every(v=>Number.isSafeInteger(v) && v>=0) && new Set(configuredWindows).size===configuredWindows.length,"configured_windows");
  const required=[...configuredWindows].sort((a,b)=>a-b);
  gate(exact(p,["started_at","completed_at","samples"]),"progress_fields");
  const a=time(p.started_at),b=time(p.completed_at);gate(a>=start && b<=end && b>a,"progress_interval");
  gate(Array.isArray(p.samples) && p.samples.length>=3 && p.samples.length<=20,"progress_samples");
  let prior=null,indexes=null;
  for(const s of p.samples) {
    gate(exact(s,["at","accepted_captures","errors_sha256","windows"]) && time(s.at)>=a && time(s.at)<=b
      && Number.isSafeInteger(s.accepted_captures) && s.accepted_captures>=0 && s.errors_sha256===EMPTY_ERRORS_SHA256,"progress_sample");
    gate(Array.isArray(s.windows) && s.windows.length>0 && s.windows.length<=128,"progress_windows");
    const found=s.windows.map(w=>{
      gate(exact(w,["index","sweeps","sampled_at"]) && Number.isSafeInteger(w.index) && w.index>=0
        && Number.isSafeInteger(w.sweeps) && w.sweeps>0 && time(w.sampled_at)>=a && time(w.sampled_at)<=time(s.at),"progress_window");
      return w.index;
    }).sort((x,y)=>x-y);
    gate(new Set(found).size===found.length && JSON.stringify(found)===JSON.stringify(required) && (!indexes || JSON.stringify(found)===JSON.stringify(indexes)),"window_set");indexes=found;
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
  gate(exact(expected,["release","agent_sha256","installer_evidence_sha256","minimum_updater_version","updater_inventory_sha256","required_updaters"]),"expectation_fields");
  const r=expected.release;
  gate(exact(r,["version","build","source_commit","application_sha256","updater_version","updater_sha256","installer_sha256","installer_bytes"])
    && version(r.version) && Number.isSafeInteger(r.build) && r.build>0 && /^[a-f0-9]{40}$/.test(r.source_commit||"")
    && [r.application_sha256,r.updater_sha256,r.installer_sha256,expected.agent_sha256,expected.installer_evidence_sha256,expected.updater_inventory_sha256].every(hex)
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
  gate(exact(p,["schema_version","release","installer_evidence_sha256","minimum_updater_version","updater_inventory_sha256","lab","started_at","completed_at","live_rf_reporting","initial_setup","cases"])
    && p.schema_version==="apollo-pi-dashboard-bridge-compatibility-v1","payload");
  same(p.release,r,"release_identity");
  for(const k of ["installer_evidence_sha256","minimum_updater_version","updater_inventory_sha256"])gate(p[k]===expected[k],"binding_"+k);
  same(p.lab,{role:"owned-rtl-bench",receiver_kind:"rtl_sdr",production_credentials_used:false,production_records_mutated:false},"lab");
  same(p.live_rf_reporting,{qualified:false,reason:"separate_live_rf_qualification_required"},"rf_scope");
  const start=time(p.started_at),end=time(p.completed_at);gate(end>start && end<=now+300000 && end-start<=86400000,"run_interval");
  gate(Array.isArray(p.cases) && p.cases.length===versions.size,"coverage");
  const seen=new Set();
  for(const c of p.cases) {
    gate(exact(c,["updater","baseline","advertisement","native","preservation","configured_windows","activation","rollback","retry","unbound_upgrade","logs_sha256"]),"case_fields");
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
      && c.activation.application_sha256===r.application_sha256 && c.activation.updater_version===r.updater_version && c.activation.agent_sha256===expected.agent_sha256
      && [c.activation.agent_sha256,c.activation.transaction_sha256,c.activation.before_boot_sha256,c.activation.after_boot_sha256].every(hex)
      && c.activation.before_boot_sha256!==c.activation.after_boot_sha256,"activation");
    const pre=progress(c.activation.before_restart,start,end,c.configured_windows),post=progress(c.activation.after_restart,start,end,c.configured_windows);
    gate(JSON.stringify(pre)===JSON.stringify(post) && time(c.activation.after_restart.started_at)>time(c.activation.before_restart.completed_at),"restart");
    gate(exact(c.rollback,["forced_failure","restored_application_sha256","restored_updater_version","transaction_sha256","services_recovered"])
      && c.rollback.forced_failure===true && c.rollback.restored_application_sha256===c.baseline.application_sha256
      && c.rollback.restored_updater_version===wanted.version && hex(c.rollback.transaction_sha256) && c.rollback.services_recovered===true,"rollback");
    gate(exact(c.retry,["application_sha256","updater_version","transaction_sha256"])
      && c.retry.application_sha256===r.application_sha256 && c.retry.updater_version===r.updater_version
      && hex(c.retry.transaction_sha256) && new Set([c.activation.transaction_sha256,c.rollback.transaction_sha256,c.retry.transaction_sha256]).size===3
      && hex(c.logs_sha256),"retry");
    const u=c.unbound_upgrade;
    gate(exact(u,["initial_state","final_state","application_sha256","updater_version","transaction_sha256","before_state_sha256","upgraded_state_sha256",
      "before_configuration_sha256","upgraded_configuration_sha256","log_sha256"])
      && u.initial_state==="setup_required" && u.final_state==="setup_required" && u.application_sha256===r.application_sha256 && u.updater_version===r.updater_version
      && [u.transaction_sha256,u.before_state_sha256,u.before_configuration_sha256,u.log_sha256].every(hex)
      && u.upgraded_state_sha256===u.before_state_sha256 && u.upgraded_configuration_sha256===u.before_configuration_sha256
      && u.transaction_sha256!==c.activation.transaction_sha256,"unbound_upgrade_preservation");
  }
  const s=p.initial_setup;
  gate(exact(s,["baseline_updater_version","initial_state","final_state","application_sha256","updater_version","before_configuration_sha256","saved_configuration_sha256",
    "registration_before_sha256","registration_after_save_sha256","neutral_choices_before_sha256","neutral_choices_after_save_sha256","location_before_sha256","location_after_save_sha256",
    "receiver_selection","receiver_identity_sha256","save_transaction_sha256","native_observations_sha256","packaged_safeguards","native_no_device_refusal","configured_windows","post_save_progress","log_sha256"]),"initial_setup_fields");
  const from=p.cases.find(c=>c.updater.version===s.baseline_updater_version);
  gate(from && s.initial_state==="setup_required" && s.final_state==="receiver_ready" && s.application_sha256===r.application_sha256 && s.updater_version===r.updater_version
    && s.before_configuration_sha256===from.unbound_upgrade.upgraded_configuration_sha256 && s.receiver_selection==="exactly_one_serial_identified_rtl"
    && [s.saved_configuration_sha256,s.registration_before_sha256,s.neutral_choices_before_sha256,s.location_before_sha256,s.receiver_identity_sha256,
      s.save_transaction_sha256,s.native_observations_sha256,s.log_sha256].every(hex)
    && s.saved_configuration_sha256!==s.before_configuration_sha256 && s.registration_after_save_sha256===s.registration_before_sha256
    && s.neutral_choices_after_save_sha256===s.neutral_choices_before_sha256 && s.location_after_save_sha256===s.location_before_sha256
    && s.save_transaction_sha256!==from.unbound_upgrade.transaction_sha256,"initial_setup_preservation");
  const guards=["missing_receiver","ambiguous_receiver","receiver_swap","calibration","manual_gain","unknown_bound_fields"],g=s.packaged_safeguards;
  gate(exact(g,["scope","application_sha256","source_commit","receiver_config_sha256","watcher_sha256","log_sha256","checks"])
    && g.scope==="exact_packaged_application_tests" && g.application_sha256===r.application_sha256 && g.source_commit===r.source_commit
    && [g.receiver_config_sha256,g.watcher_sha256,g.log_sha256].every(hex) && exact(g.checks,guards) && guards.every(k=>g.checks[k]===true),"packaged_receiver_guards");
  const n=s.native_no_device_refusal;
  gate(exact(n,["scope","updater_version","application_sha256","code","log_sha256"]) && n.scope==="direct_verified_package_component"
    && versions.has(n.updater_version) && n.application_sha256===r.application_sha256 && n.code==="generic_target_receiver_selection_required" && hex(n.log_sha256),"native_no_device_refusal");
  progress(s.post_save_progress,start,end,s.configured_windows);
  return p;
}
function validateBridgeRecord(record,relative,root,policy,installers,now=Date.now()) {
  gate(exact(record,["schema_version","release","installer_record","minimum_updater_version","updater_inventory","compatibility_evidence","live_rf_reporting"])
    && record.schema_version==="apollo-pi-dashboard-bridge-record-v1","bridge_record");
  const release=record.release;
  gate(release && version(release.version) && Number.isSafeInteger(release.build) && release.build>0,"bridge_identity");
  const appTag=`apollo-passive-v${release.version}-build.${release.build}`;
  gate(relative===`bridges/${appTag}.json`,"bridge_path");
  const installerTag=`apollo-pi-installer-v${release.version}-build.${release.build}-updater.${release.updater_version}`;
  const installerPath=`installers/${installerTag}.json`;
  const installer=referenced(root,record.installer_record,installerPath);
  const qualified=installers.find(v=>!v.held && v.relative===installerPath && v.scope==="installer_onboarding");
  gate(qualified && JSON.stringify(qualified.record)===JSON.stringify(installer),"normal_onboarding_required");
  const updater=installer.updater?.unchanged_asset_hashes?.[`ApolloUniversalPiUpdater-${installer.updater?.version}-linux-arm64.zip`];
  const expected={version:installer.target?.version,build:installer.target?.build,source_commit:installer.target?.source_commit,
    application_sha256:installer.target?.sha256,updater_version:installer.updater?.version,updater_sha256:updater?.sha256,
    installer_sha256:installer.installer?.sha256,installer_bytes:installer.installer?.bytes};
  same(release,expected,"normal_installer_identity");
  const normalEnvelope=referenced(root,installer.onboarding_qualification,`qualifications/${installerTag}.onboarding.json`);
  // The caller already validated this exact normal installer and signature.
  const normalPayload=JSON.parse(decode(normalEnvelope.payload,128*1024).toString("utf8"));
  const evidencePath=`qualifications/${appTag}.bridge.json`;
  gate(exact(record.updater_inventory,["path","sha256"]) && hex(record.updater_inventory.sha256),"inventory_reference");
  const inventoryPath=`qualifications/pi-updater-inventory-${record.updater_inventory.sha256}.json`;
  const inventory=validateUpdaterInventory(referenced(root,record.updater_inventory,inventoryPath),policy,record.minimum_updater_version,release.updater_version,now);
  const current=inventory.payload.updaters.find(u=>u.version===release.updater_version);
  gate(current.package_sha256===release.updater_sha256,"inventory_installer_updater");
  const proof=validateBridgeEvidence(referenced(root,record.compatibility_evidence,evidencePath),{
    release,agent_sha256:normalPayload.release.agent_sha256,installer_evidence_sha256:installer.onboarding_qualification.sha256,
    minimum_updater_version:record.minimum_updater_version,updater_inventory_sha256:record.updater_inventory.sha256,
    required_updaters:inventory.required_updaters},policy,now);
  gate(time(inventory.payload.collected_at)<=time(proof.started_at),"inventory_after_run");
  same(record.live_rf_reporting,{qualified:false,reason:"separate_live_rf_qualification_required"},"rf_scope");
  return {record,relative};
}
function validateBridgeRepository(root,policy,installers,now=Date.now()) {
  const directory=path.join(root,"bridges");if(!fs.existsSync(directory))return [];
  const stat=fs.lstatSync(directory);gate(stat.isDirectory() && !stat.isSymbolicLink(),"bridge_directory");
  return fs.readdirSync(directory).filter(n=>n.endsWith(".json")).map(n=>{
    const relative=`bridges/${n}`;return validateBridgeRecord(JSON.parse(readRecord(root,relative)),relative,root,policy,installers,now);
  });
}
module.exports={DOMAIN,INVENTORY_DOMAIN,EMPTY_ERRORS_SHA256,hash,validateBridgeEvidence,validateUpdaterInventory,validateBridgeRecord,validateBridgeRepository};
