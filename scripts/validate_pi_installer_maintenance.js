"use strict";
// A separately signed installer-only scope. Existing onboarding/RF gates stay intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {isDeepStrictEqual:equal}=require('node:util');
const DOMAIN=Buffer.from('apollo-pi-installer-maintenance-qualification-v1\n');
const SCOPE='installer_maintenance';
const SCHEMA='apollo-pi-installer-maintenance-qualification-v1';
const UNITS=['apollo-passive-receive.service','apollo-node-agent.service','apollo-receiver-watch.service','nginx.service','apollo-dashboard-update.path'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
function gate(ok,why){if(!ok)throw Error('pi_installer_maintenance_'+why);}
function time(v){gate(typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(v)&&Number.isFinite(Date.parse(v)),'timestamp');return Date.parse(v);}
function bytes(v,max){gate(typeof v==='string'&&v.length<=max*2,'encoded_size');const b=Buffer.from(v,'base64');gate(b.length<=max&&b.toString('base64')===v,'base64');return b;}
function validateEvidence(envelope,expected,baseline,policy,now=Date.now()){
 gate(exact(envelope,['schema_version','key_id','payload','signature'])&&envelope.schema_version===SCHEMA.replace('-v1','-attestation-v1'),'envelope');
 const key=policy.trusted_keys?.[envelope.key_id];gate(typeof key==='string','signer');
 const data=bytes(envelope.payload,128*1024),signature=bytes(envelope.signature,64);
 gate(signature.length===64&&crypto.verify(null,Buffer.concat([DOMAIN,data]),key,signature),'signature');
 const p=JSON.parse(data);gate(JSON.stringify(p)===data.toString(),'canonical_json');
 gate(exact(p,['schema_version','scope','release','baseline','started_at','completed_at','lab','states','checks','comparison','evidence','limitations'])&&p.schema_version===SCHEMA&&p.scope===SCOPE,'payload');
 gate(equal(p.release,expected)&&equal(p.baseline,baseline),'artifact_or_baseline');
 const start=time(p.started_at),end=time(p.completed_at);gate(end>start&&end-start<=7200000&&end<=now+300000,'interval');
 gate(exact(p.lab,['role','registered','receiver_attached'])&&p.lab.role==='owned-unenrolled-pi'&&p.lab.registered===false&&p.lab.receiver_attached===false,'lab');
 gate(exact(p.states,['before','after_retry','after_reboot']),'states');
 let config,boot;
 for(const name of ['before','after_retry','after_reboot']){
  const s=p.states[name];
  gate(exact(s,['collected_at','version','build','updater_version','configuration_sha256','boot_fingerprint','setup_required','registered_credential_present','units']),'state_fields');
  gate(time(s.collected_at)>=start&&time(s.collected_at)<=end&&s.version===expected.version&&s.build===expected.build&&s.updater_version===expected.updater_version,'state_identity');
  gate(hex(s.configuration_sha256)&&hex(s.boot_fingerprint)&&s.setup_required===true&&s.registered_credential_present===false,'unenrolled_state');
  gate(exact(s.units,UNITS)&&UNITS.every(n=>s.units[n]==='active'),'units');
  if(!config){config=s.configuration_sha256;boot=s.boot_fingerprint;}
  gate(config===s.configuration_sha256,'configuration_changed');
  gate(name==='after_reboot'?s.boot_fingerprint!==boot:s.boot_fingerprint===boot,'actual_reboot');
 }
 gate(time(p.states.before.collected_at)<time(p.states.after_retry.collected_at)&&time(p.states.after_retry.collected_at)<time(p.states.after_reboot.collected_at),'state_order');
 gate(exact(p.checks,['install_exit_code','retry_exit_code','invalid_argument_exit_code','ssh_support_summary','browser_after_reboot','post_boot_service_errors'])&&p.checks.install_exit_code===0&&p.checks.retry_exit_code===0&&p.checks.invalid_argument_exit_code===1&&p.checks.ssh_support_summary===true&&p.checks.browser_after_reboot===true&&p.checks.post_boot_service_errors===0,'checks');
 gate(exact(p.comparison,['sha256','activation_logic_unchanged','target_metadata_identical','updater_payloads_identical'])&&hex(p.comparison.sha256)&&p.comparison.activation_logic_unchanged===true&&p.comparison.target_metadata_identical===true&&p.comparison.updater_payloads_identical===true,'comparison');
 const names=['before','after_retry','after_reboot','install_log','retry_log','diagnostic_log','journal','physical_report','target_comparison','browser_log','report_file'];
 gate(exact(p.evidence,names)&&names.every(n=>hex(p.evidence[n])),'evidence_hashes');
 gate(exact(p.limitations,['fresh_card_tested','registered_node_tested','receiver_rf_tested','backend_checkins_tested'])&&Object.values(p.limitations).every(v=>v===false),'scope_inflation');
 return p;
}
function validateRecord(record,relative,root,policy,helpers){
 gate(policy.allowed_qualification_scopes?.includes(SCOPE),'scope_not_authorized');
 const allowed=policy.installer_maintenance_revisions?.[relative];gate(exact(allowed,['installer_sha256','installer_bytes','launcher_source_commit','prior_record_path','prior_record_sha256_lf'])&&hex(allowed.installer_sha256)&&Number.isSafeInteger(allowed.installer_bytes)&&allowed.installer_bytes>0&&/^[a-f0-9]{40}$/.test(allowed.launcher_source_commit||''),'revision_not_authorized');
 gate(exact(record,['schema_version','publication_status','launcher_source','target','installer','updater','release_tag','qualification','qualification_scope','live_rf_reporting','installer_revision','inherited_qualification','maintenance_qualification']),'record_fields');
 gate(record.schema_version==='apollo-pi-installer-distribution-v4'&&record.publication_status==='qualified'&&record.qualification_scope===SCOPE,'contract');
 gate(record.installer?.sha256===allowed.installer_sha256&&record.installer?.bytes===allowed.installer_bytes&&record.launcher_source?.commit===allowed.launcher_source_commit&&record.launcher_source?.repository==='gdowkpc/apollo','reviewed_revision');
 gate(!record.onboarding_qualification&&!record.live_qualification&&equal(record.live_rf_reporting,{qualified:false,reason:'separate_live_rf_qualification_required'}),'scope');
 const inherited=record.inherited_qualification;
 gate(exact(inherited,['record_path','record_sha256_lf'])&&inherited.record_path===allowed.prior_record_path&&inherited.record_sha256_lf===allowed.prior_record_sha256_lf&&hex(inherited.record_sha256_lf),'baseline_reference');
 const priorBytes=helpers.read(root,inherited.record_path);
 gate(hash(priorBytes.toString('utf8').replace(/\r\n/g,'\n'))===inherited.record_sha256_lf,'baseline_digest');
 const prior=JSON.parse(priorBytes);
 gate(['apollo-pi-installer-distribution-v2','apollo-pi-installer-distribution-v3'].includes(prior.schema_version),'no_inheritance_chain');
 const checked=helpers.validateRecord(prior,inherited.record_path,root,policy);
 gate(!checked.held&&['installer_onboarding','live_rf'].includes(checked.scope),'baseline_not_fully_qualified');
 gate(equal(record.target,prior.target)&&equal(record.updater,prior.updater),'runtime_changed');
 gate(record.installer_revision===(prior.installer_revision||1)+1,'revision');
 const e=helpers.expectedRelease(record),tag='apollo-pi-installer-v'+e.version+'-build.'+e.build+'-updater.'+e.updater_version+'-revision.'+record.installer_revision;
 gate(record.release_tag===tag&&relative==='installers/'+tag+'.json'&&record.installer.filename==='Apollo-Pi-Installer-'+e.version+'-build.'+e.build+'-updater.'+e.updater_version+'-revision.'+record.installer_revision+'-linux-arm64.zip','identity');
 const ref=record.maintenance_qualification;
 gate(exact(ref,['path','sha256'])&&ref.path==='qualifications/'+tag+'.maintenance.json'&&hex(ref.sha256),'receipt_reference');
 const receipt=helpers.read(root,ref.path);gate(hash(receipt)===ref.sha256,'receipt_digest');
 validateEvidence(JSON.parse(receipt),e,inherited,policy);
 return {held:false,record,scope:SCOPE};
}
module.exports={DOMAIN,SCHEMA,SCOPE,UNITS,hash,validateEvidence,validateRecord};
