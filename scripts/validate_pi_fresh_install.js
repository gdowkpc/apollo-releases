"use strict";
const crypto=require('node:crypto'),{isDeepStrictEqual:equal}=require('node:util');
const DOMAIN=Buffer.from('apollo-pi-fresh-install-qualification-v1\n'),SCOPE='fresh_install',SCHEMA='apollo-pi-fresh-install-qualification-v1';
const UNITS=['apollo-passive-receive.service','apollo-node-agent.service','apollo-receiver-watch.service','nginx.service','apollo-dashboard-update.path'];
const LIMITATIONS=['registered_node_recovery','backend_checkins','live_rf_reporting','uncoached_beginner_usability','builder_cooling_resolved'];
const EVIDENCE=['canonical_result','install_retry_completion','post_reboot_completion','install_log','retry_log','post_reboot_log','windows_http','normal_authority','canonical_harness'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
function gate(ok,code){if(!ok)throw Error('pi_fresh_install_'+code);}
function decode(v,max){gate(typeof v==='string'&&v.length<=max*2,'encoded_size');const b=Buffer.from(v,'base64');gate(b.length<=max&&b.toString('base64')===v,'base64');return b;}
function validateEvidence(envelope,expected,policy,now=Date.now()){
 gate(exact(envelope,['schema_version','key_id','payload','signature'])&&envelope.schema_version==='apollo-pi-fresh-install-qualification-attestation-v1','envelope');
 const key=policy.trusted_keys?.[envelope.key_id];gate(typeof key==='string','signer');
 const bytes=decode(envelope.payload,128*1024),signature=decode(envelope.signature,64);
 gate(signature.length===64&&crypto.verify(null,Buffer.concat([DOMAIN,bytes]),key,signature),'signature');
 const p=JSON.parse(bytes);gate(JSON.stringify(p)===bytes.toString(),'canonical_json');
 gate(exact(p,['schema_version','scope','release','started_at','completed_at','lab','baseline','states','checks','evidence','limitations'])&&p.schema_version===SCHEMA&&p.scope===SCOPE,'payload');
 gate(equal(p.release,expected),'release_identity');
 const times=[p.started_at,p.completed_at];gate(times.every(v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(v)&&Number.isFinite(Date.parse(v))),'timestamps');
 const start=Date.parse(times[0]),end=Date.parse(times[1]);gate(end>start&&end-start<=7200000&&end<=now+300000,'interval');
 gate(exact(p.lab,['role','physical_fresh_card','model','architecture','connection','receiver_attached'])&&p.lab.role==='owned-fresh-pi'&&p.lab.physical_fresh_card===true&&typeof p.lab.model==='string'&&p.lab.model.startsWith('Raspberry Pi ')&&p.lab.model.length<=128&&p.lab.architecture==='aarch64'&&['Wi-Fi','Ethernet'].includes(p.lab.connection)&&p.lab.receiver_attached===false,'lab');
 gate(exact(p.baseline,['packages','apollo_paths_present','apollo_units','boot_fingerprint'])&&equal(p.baseline.packages,{nodejs:'not installed',nginx:'not installed'})&&equal(p.baseline.apollo_paths_present,[])&&equal(p.baseline.apollo_units,[])&&hex(p.baseline.boot_fingerprint),'empty_baseline');
 gate(exact(p.states,['after_install','after_retry','after_reboot']),'states');let configuration;
 for(const phase of ['after_install','after_retry','after_reboot']){
  const s=p.states[phase];gate(exact(s,['boot_fingerprint','configuration','units','setup_required','registered_credentials']),'state_fields');
  gate(hex(s.boot_fingerprint)&&s.setup_required===true&&s.registered_credentials===false,'unenrolled_state');
  gate(exact(s.configuration,['sha256','uid','gid','mode'])&&hex(s.configuration.sha256)&&[s.configuration.uid,s.configuration.gid].every(v=>Number.isSafeInteger(v)&&v>=0)&&s.configuration.mode===0o600,'configuration');
  gate(exact(s.units,UNITS)&&UNITS.every(u=>s.units[u]==='active'),'services');
  if(!configuration)configuration=s.configuration;gate(equal(configuration,s.configuration),'configuration_preservation');
  gate(phase==='after_reboot'?s.boot_fingerprint!==p.baseline.boot_fingerprint:s.boot_fingerprint===p.baseline.boot_fingerprint,'actual_reboot');
 }
 gate(exact(p.checks,['install_retry_exit_code','after_reboot_exit_code','normal_public_authority_verified','windows_http'])&&p.checks.install_retry_exit_code===0&&p.checks.after_reboot_exit_code===0&&p.checks.normal_public_authority_verified===true,'completion');
 gate(exact(p.checks.windows_http,['http','version','build','apollo_page','default_nginx_page'])&&equal(p.checks.windows_http,{http:200,version:expected.version,build:expected.build,apollo_page:true,default_nginx_page:false}),'windows_http');
 gate(exact(p.evidence,EVIDENCE)&&EVIDENCE.every(k=>hex(p.evidence[k])),'evidence_hashes');
 gate(exact(p.limitations,LIMITATIONS)&&LIMITATIONS.every(k=>p.limitations[k]===false),'scope_inflation');return p;
}
function validateRecord(record,relative,root,policy,helpers){
 gate(policy.allowed_qualification_scopes?.includes(SCOPE),'scope_not_authorized');
 gate(exact(record,['schema_version','publication_status','launcher_source','target','installer','updater','release_tag','qualification','qualification_scope','live_rf_reporting','fresh_install_qualification'])&&record.schema_version==='apollo-pi-installer-distribution-v5'&&record.publication_status==='qualified'&&record.qualification_scope===SCOPE,'record');
 const allowed=policy.fresh_install_releases?.[relative];gate(exact(allowed,['release','launcher_source_commit','evidence_sha256','updater_record_path','updater_record_sha256_lf']),'exact_release_not_authorized');
 gate(exact(record.launcher_source,['repository','commit'])&&exact(record.target,['version','build','source_commit','release_tag','sha256'])&&exact(record.installer,['filename','bytes','sha256'])&&exact(record.qualification,['scope'])&&typeof record.qualification.scope==='string'&&record.qualification.scope.length>0&&record.qualification.scope.length<=1600,'nested_record_fields');
 const expected=helpers.expectedRelease(record);gate(record.target.release_tag==='apollo-passive-v'+expected.version+'-build.'+expected.build,'application_tag');gate(equal(expected,allowed.release)&&record.launcher_source?.repository==='gdowkpc/apollo'&&record.launcher_source.commit===allowed.launcher_source_commit&&allowed.launcher_source_commit===expected.source_commit,'reviewed_identity');
 gate(typeof expected.version==='string'&&/^\d+\.\d+\.\d+$/.test(expected.version)&&Number.isSafeInteger(expected.build)&&expected.build>0&&/^[a-f0-9]{40}$/.test(expected.source_commit||'')&&[expected.application_sha256,expected.updater_sha256,expected.installer_sha256].every(hex)&&Number.isSafeInteger(expected.installer_bytes)&&expected.installer_bytes>0&&/^\d+\.\d+\.\d+$/.test(expected.updater_version||''),'release_fields');
 const tag='apollo-pi-installer-v'+expected.version+'-build.'+expected.build+'-updater.'+expected.updater_version;
 gate(record.release_tag===tag&&relative==='installers/'+tag+'.json'&&record.installer.filename==='Apollo-Pi-Installer-'+expected.version+'-build.'+expected.build+'-updater.'+expected.updater_version+'-linux-arm64.zip','tag');
 gate(equal(record.live_rf_reporting,{qualified:false,reason:'separate_live_rf_qualification_required'}),'rf_scope');
 const provenance=JSON.parse(helpers.read(root,'provenance/apollo-passive-v'+expected.version+'-build.'+expected.build+'.json'));
 gate(provenance.qualification?.status==='qualified'&&provenance.source?.commit===expected.source_commit&&provenance.package?.sha256===expected.application_sha256,'application_provenance');
 const priorBytes=helpers.read(root,allowed.updater_record_path);gate(hash(priorBytes.toString().replace(/\r\n/g,'\n'))===allowed.updater_record_sha256_lf,'updater_reference_digest');
 const prior=JSON.parse(priorBytes);gate(['apollo-pi-installer-distribution-v2','apollo-pi-installer-distribution-v3'].includes(prior.schema_version),'updater_reference_scope');
 const checked=helpers.validateRecord(prior,allowed.updater_record_path,root,policy);gate(!checked.held&&['live_rf','installer_onboarding'].includes(checked.scope)&&equal(record.updater,prior.updater),'unchanged_qualified_updater');
 const ref=record.fresh_install_qualification;gate(exact(ref,['path','sha256'])&&ref.path==='qualifications/'+tag+'.fresh-install.json'&&hex(ref.sha256)&&ref.sha256===allowed.evidence_sha256,'receipt_reference');
 const evidence=helpers.read(root,ref.path);gate(hash(evidence)===ref.sha256,'receipt_digest');validateEvidence(JSON.parse(evidence),expected,policy);
 return {held:false,record,scope:SCOPE};
}
module.exports={DOMAIN,SCOPE,SCHEMA,UNITS,LIMITATIONS,EVIDENCE,hash,validateEvidence,validateRecord};
