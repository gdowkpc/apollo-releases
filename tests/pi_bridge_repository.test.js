"use strict";
// Synthetic receipts with ephemeral test keys stay exclusively in temp roots.
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {initialSetup,unboundUpgrade}=require("../fixtures/pi_bridge_setup");
const {validateRepository,ONBOARDING_DOMAIN,ERRORS}=require("../scripts/validate_pi_live_qualification");
const {DOMAIN,INVENTORY_DOMAIN,hash}=require("../scripts/validate_pi_bridge_compatibility");
const {privateKey,publicKey}=crypto.generateKeyPairSync("ed25519"),h=v=>hash(String(v));
const at=s=>new Date(Date.now()-3600000+s*1000).toISOString();
const release={version:"4.0.9",build:900,source_commit:"a".repeat(40),application_sha256:h("app"),updater_version:"2.0.9",updater_sha256:h("updater9"),installer_sha256:h("installer"),installer_bytes:100};
const appTag="apollo-passive-v4.0.9-build.900",installerTag="apollo-pi-installer-v4.0.9-build.900-updater.2.0.9";
function envelope(p,prefix,domain){const b=Buffer.from(JSON.stringify(p));return {schema_version:prefix+"-attestation-v1",key_id:"fixture",payload:b.toString("base64"),signature:crypto.sign(null,Buffer.concat([domain,b]),privateKey).toString("base64")};}
function write(root,name,p){fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});const b=Buffer.from(JSON.stringify(p));fs.writeFileSync(path.join(root,name),b);return {path:name,sha256:hash(b)};}
function phase(offset,boot){return {started_at:at(offset),completed_at:at(offset+180),boot_fingerprint:h(boot),checkin:{received_at:at(offset+50),event_fingerprint:h("checkin"+boot)},report:null,
  samples:[30,90,150].map((s,i)=>({at:at(offset+s),accepted_captures:10+i,errors:Object.fromEntries(ERRORS.map(k=>[k,0])),windows:[0,1].map(index=>({index,sweeps:10+i,sampled_at:at(offset+s-1)}))}))};}
function fixture(root){
  const policy={allowed_qualification_scopes:["live_rf","installer_onboarding","dashboard_bridge_compatibility"],trusted_keys:{fixture:publicKey.export({type:"spki",format:"pem"})},required_lab_role:"owned-rtl-bench",held_installer_sha256_lf:{},held_stable_fingerprint:"0".repeat(64)};
  write(root,"policy/pi-live-qualification.json",policy);
  const normal={schema_version:"apollo-pi-onboarding-qualification-v1",release:{...release,agent_sha256:h("agent")},lab:{role:"owned-rtl-bench",receiver_kind:"rtl_sdr",registered_before_install:true},
    started_at:at(0),completed_at:at(600),backend:{host:"www.repeaterbook.com",authority_revision:2,client_binding_verified:true},
    install:{before_state_sha256:h("state"),after_state_sha256:h("state"),repeat_state_sha256:h("state"),activated_agent_sha256:h("agent"),updater_version:release.updater_version,transaction_recorded:true},
    pre_reboot:phase(0,"before"),post_reboot:phase(300,"after"),live_rf_reporting:{qualified:false,reason:"separate_live_rf_qualification_required"},
    onboarding:{application_source_commit:release.source_commit,website_test_source_commit:"b".repeat(40),website_test_sha256:h("website"),runtime_modules_sha256:h("modules"),test_log_sha256:h("tests"),server_checks:51,runtime_tests:12,production_records_mutated:false}};
  const installer={schema_version:"apollo-pi-installer-distribution-v3",publication_status:"qualified",qualification_scope:"installer_onboarding",release_tag:installerTag,
    target:{version:release.version,build:release.build,source_commit:release.source_commit,sha256:release.application_sha256},updater:{version:release.updater_version,unchanged_asset_hashes:{"ApolloUniversalPiUpdater-2.0.9-linux-arm64.zip":{sha256:release.updater_sha256}}},
    installer:{filename:"Apollo-Pi-Installer-4.0.9-build.900-updater.2.0.9-linux-arm64.zip",sha256:release.installer_sha256,bytes:100},live_rf_reporting:normal.live_rf_reporting,
    onboarding_qualification:write(root,`qualifications/${installerTag}.onboarding.json`,envelope(normal,"apollo-pi-onboarding-qualification",ONBOARDING_DOMAIN))};
  const installerRef=write(root,`installers/${installerTag}.json`,installer);
  write(root,`provenance/${appTag}.json`,{source:{commit:release.source_commit},package:{sha256:release.application_sha256}});
  const inventory={schema_version:"apollo-pi-updater-inventory-v1",repository:"gdowkpc/apollo",collected_at:at(-100),complete:true,minimum_updater_version:"2.0.5",maximum_updater_version:"2.0.9",collector_source_commit:"c".repeat(40),manifest_sha256:h("manifest"),log_sha256:h("log"),
    updaters:[5,6,7,9].map(n=>({version:`2.0.${n}`,package_sha256:h("updater"+n),capsule_sha256:h("capsule"+n)}))};
  function saveInventory(){const e=envelope(inventory,"apollo-pi-updater-inventory",INVENTORY_DOMAIN),b=Buffer.from(JSON.stringify(e));return write(root,`qualifications/pi-updater-inventory-${hash(b)}.json`,e);}
  const invRef=saveInventory();
  const progress=offset=>{const p=phase(offset,"x");return {started_at:p.started_at,completed_at:p.completed_at,samples:p.samples.map(s=>({at:s.at,accepted_captures:s.accepted_captures,errors_sha256:h(JSON.stringify(s.errors)),windows:s.windows}))};};
  const proof={schema_version:"apollo-pi-dashboard-bridge-compatibility-v1",release:{...release},installer_evidence_sha256:installer.onboarding_qualification.sha256,minimum_updater_version:"2.0.5",updater_inventory_sha256:invRef.sha256,
    lab:{role:"owned-rtl-bench",receiver_kind:"rtl_sdr",production_credentials_used:false,production_records_mutated:false},started_at:at(0),completed_at:at(900),live_rf_reporting:normal.live_rf_reporting,
    initial_setup:initialSetup(release,"2.0.5",progress),cases:inventory.updaters.filter(u=>u.version!=="2.0.9").map(u=>({updater:{...u},baseline:{kind:"fixture_existing_install",application_sha256:h("old app"),installer_sha256:h("old installer"),manifest_sha256:h("baseline"),reporting_enabled:false},advertisement:{kind:"private_descriptor_fixture",sha256:h("descriptor"),target_application_sha256:release.application_sha256},
      native:{systemd:true,real_root_worker:true,physical_usb:true,tls_verification:true,signature_verification:true,service_adapters:false,process_adapters:false,hardware_adapters:false,health_adapters:false,authority_adapters:false},
      preservation:{before_sha256:h("state"),activated_sha256:h("state"),rollback_sha256:h("state"),retry_sha256:h("state"),manifest_sha256:h("preservation")},
      configured_windows:[0,1],activation:{application_sha256:release.application_sha256,agent_sha256:h("agent"),updater_version:release.updater_version,transaction_sha256:h("activation"),before_restart:progress(0),after_restart:progress(300),before_boot_sha256:h("boot1"),after_boot_sha256:h("boot2")},
      rollback:{forced_failure:true,restored_application_sha256:h("old app"),restored_updater_version:u.version,transaction_sha256:h("rollback"),services_recovered:true},retry:{application_sha256:release.application_sha256,updater_version:release.updater_version,transaction_sha256:h("retry")},
      unbound_upgrade:unboundUpgrade(release),logs_sha256:h("native logs")}))};
  const record={schema_version:"apollo-pi-dashboard-bridge-record-v1",release:{...release},installer_record:installerRef,minimum_updater_version:"2.0.5",updater_inventory:invRef,compatibility_evidence:null,live_rf_reporting:normal.live_rf_reporting};
  function saveProof(){record.compatibility_evidence=write(root,`qualifications/${appTag}.bridge.json`,envelope(proof,"apollo-pi-dashboard-bridge-compatibility",DOMAIN));write(root,`bridges/${appTag}.json`,record);}
  saveProof();const stable={version:release.version,build:release.build,source_commit:release.source_commit,sha256:release.application_sha256,minimum_pi_updater_version:"2.0.5"};write(root,"stable/apollo-passive-receive-linux-arm64.json",stable);
  return {policy,normal,installer,inventory,proof,record,stable,saveInventory,saveProof};
}
function run(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),"apollo-bridge-gate-"));try{fn(root,fixture(root));}finally{fs.rmSync(root,{recursive:true,force:true});}}
test("actual repository gate accepts exact normal onboarding plus separate bridge",()=>run(root=>assert.equal(validateRepository(root).signed,1)));
const bad={
  "missing bridge":(r)=>fs.unlinkSync(path.join(r,`bridges/${appTag}.json`)),
  "missing normal installer":r=>fs.unlinkSync(path.join(r,`installers/${installerTag}.json`)),
  "unqualified normal installer":(r,f)=>{f.installer.publication_status="pending";write(r,`installers/${installerTag}.json`,f.installer);},
  "normal installer digest mismatch":(r,f)=>{f.record.installer_record.sha256=h("other");f.saveProof();},
  "normal onboarding signature invalid":(r,f)=>{write(r,f.installer.onboarding_qualification.path,{...envelope(f.normal,"apollo-pi-onboarding-qualification",ONBOARDING_DOMAIN),signature:Buffer.alloc(64).toString("base64")});},
  "bridge scope not authorized":(r,f)=>{f.policy.allowed_qualification_scopes.pop();write(r,"policy/pi-live-qualification.json",f.policy);},
  "extra public private identity field":(r,f)=>{f.record.node_uuid="private";f.saveProof();},
  "different stable source":(r,f)=>{f.stable.source_commit="d".repeat(40);write(r,"stable/apollo-passive-receive-linux-arm64.json",f.stable);},
  "different stable minimum":(r,f)=>{f.stable.minimum_pi_updater_version="2.0.6";write(r,"stable/apollo-passive-receive-linux-arm64.json",f.stable);},
  "missing intermediate updater case":(r,f)=>{f.proof.cases.splice(1,1);f.saveProof();},
  "wrong activated agent":(r,f)=>{f.proof.cases[0].activation.agent_sha256=h("other");f.saveProof();},
  "inventory unverified digest":(r,f)=>{f.record.updater_inventory.sha256=h("other");f.saveProof();},
  "inventory incomplete":(r,f)=>{f.inventory.complete=false;f.record.updater_inventory=f.saveInventory();f.proof.updater_inventory_sha256=f.record.updater_inventory.sha256;f.saveProof();},
  "inventory future":(r,f)=>{f.inventory.collected_at=new Date(Date.now()+3600000).toISOString();f.record.updater_inventory=f.saveInventory();f.proof.updater_inventory_sha256=f.record.updater_inventory.sha256;f.saveProof();},
  "inventory missing target endpoint":(r,f)=>{f.inventory.updaters.pop();f.record.updater_inventory=f.saveInventory();f.proof.updater_inventory_sha256=f.record.updater_inventory.sha256;f.saveProof();},
  "inventory disagrees with installer updater":(r,f)=>{f.inventory.updaters.at(-1).package_sha256=h("other");f.record.updater_inventory=f.saveInventory();f.proof.updater_inventory_sha256=f.record.updater_inventory.sha256;f.saveProof();},
  "receipt from different normal installer":(r,f)=>{f.proof.installer_evidence_sha256=h("borrowed");f.saveProof();},
  "inventory range substitution":(r,f)=>{f.inventory.minimum_updater_version="2.0.6";f.record.updater_inventory=f.saveInventory();f.proof.updater_inventory_sha256=f.record.updater_inventory.sha256;f.saveProof();},
  "inventory collected after native run began":(r,f)=>{f.inventory.collected_at=at(20);f.record.updater_inventory=f.saveInventory();f.proof.updater_inventory_sha256=f.record.updater_inventory.sha256;f.saveProof();},
  "duplicate inventory version":(r,f)=>{f.inventory.updaters.push(f.inventory.updaters[0]);f.record.updater_inventory=f.saveInventory();f.proof.updater_inventory_sha256=f.record.updater_inventory.sha256;f.saveProof();},
  "bound-only evidence omits unbound recovery":(r,f)=>{delete f.proof.cases[0].unbound_upgrade;f.saveProof();},
  "unbound recovery drops registration":(r,f)=>{f.proof.initial_setup.registration_after_save_sha256=h("lost");f.saveProof();},
  "receipt path traversal":(r,f)=>{f.record.compatibility_evidence.path="qualifications/../elsewhere.json";write(r,`bridges/${appTag}.json`,f.record);},
  "symlink qualification directory":(r)=>{const p=path.join(r,"qualifications");fs.renameSync(p,p+"-original");fs.symlinkSync(p+"-original",p,"junction");},
};
for(const [name,change] of Object.entries(bad))test("actual repository gate rejects "+name,()=>run((r,f)=>{change(r,f);assert.throws(()=>validateRepository(r));}));
test("actual repository gate rejects symlink qualification file",t=>run((r,f)=>{
  const p=path.join(r,f.record.compatibility_evidence.path);fs.renameSync(p,p+".original");
  try{fs.symlinkSync(p+".original",p,"file");}catch(e){if(process.platform==="win32" && e.code==="EPERM"){t.skip("Windows file symlinks require privilege; Linux CI exercises this case");return;}throw e;}
  assert.throws(()=>validateRepository(r),/record_file/);
}));
test("ordinary updater equality still succeeds without any bridge or inventory",()=>run((r,f)=>{fs.rmSync(path.join(r,"bridges"),{recursive:true});f.stable.minimum_pi_updater_version=release.updater_version;write(r,"stable/apollo-passive-receive-linux-arm64.json",f.stable);assert.equal(validateRepository(r).signed,1);}));
test("ordinary equality does not excuse an invalid committed bridge",()=>run((r,f)=>{f.stable.minimum_pi_updater_version=release.updater_version;write(r,"stable/apollo-passive-receive-linux-arm64.json",f.stable);f.proof.cases.pop();f.saveProof();assert.throws(()=>validateRepository(r));}));
