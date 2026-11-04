"use strict";
// Signs only whitelisted facts from retained physical-test evidence. No node access,
// account enrollment, service control, update grants or runtime signing.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const m=require('./validate_pi_installer_maintenance');
const hash=m.hash,read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
function insist(v,c){if(!v)throw Error('maintenance_collection_'+c);}
function prepare(root,record,archive,priorArchive,evidenceRoot,python='python3'){
 const policy=json(path.join(root,'policy/pi-live-qualification.json'));
 const allow=policy.installer_maintenance_revisions?.['installers/'+record.release_tag+'.json'];insist(allow,'revision_not_authorized');
 const priorBytes=read(path.join(root,allow.prior_record_path)),prior=JSON.parse(priorBytes);
 insist(hash(read(archive))===allow.installer_sha256&&read(archive).length===allow.installer_bytes,'new_archive');
 insist(hash(read(priorArchive))===prior.installer.sha256&&read(priorArchive).length===prior.installer.bytes,'prior_archive');
 const verify=cp.spawnSync(python,['-B',path.join(root,'scripts/compare_pi_installer_maintenance.py'),priorArchive,archive],{windowsHide:true,shell:false,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 insist(verify.status===0,'source_comparison');const comparison=JSON.parse(verify.stdout);
 const filenames={before:'EXACT-HEADLESS-BEFORE.json',after_retry:'EXACT-HEADLESS-AFTER-RETRY.json',after_reboot:'EXACT-HEADLESS-AFTER-REBOOT.json',install_log:'exact-headless-install.log',retry_log:'exact-headless-retry.log',diagnostic_log:'exact-headless-diagnostic-negative.log',journal:'EXACT-HEADLESS-POST-BOOT-ERRORS.json',physical_report:'MERGED-EXACT-PHYSICAL-QUALIFICATION.json',target_comparison:'INSTALLER-MAINTENANCE-TARGET-COMPARISON.json'};
 const data={},digests={};for(const [key,name]of Object.entries(filenames)){data[key]=read(path.join(evidenceRoot,name));digests[key]=hash(data[key]);}
 const report=JSON.parse(data.physical_report),target=JSON.parse(data.target_comparison),journal=JSON.parse(data.journal);
 insist(report.artifact.sha256===record.installer.sha256&&report.artifact.bytes===record.installer.bytes&&report.launcher_source===record.launcher_source.commit,'physical_artifact');
 insist(report.scope==='existing_unenrolled_physical_Pi5_without_receiver','physical_scope');
 insist(report.checks.install_exit_code===0&&report.checks.retry_exit_code===0&&report.checks.account_enrollment_performed===false&&report.checks.ssh_safe_support_block===true&&report.checks.actual_reboot===true&&report.checks.browser_after_reboot===true,'physical_checks');
 insist(target.application_target_metadata_identical===true&&target.application_sha256===record.target.sha256&&target.updater_version===record.updater.version,'target_comparison');
 insist(journal.exit_code===0&&journal.output.trim()==='-- No entries --','journal_errors');
 for(const key of ['install_log','retry_log'])insist(data[key].toString().includes('Apollo installation completed'),'completion_log');
 insist(data.diagnostic_log.toString().includes('--- Copy these support details ---')&&data.diagnostic_log.toString().includes('Using SSH?'),'ssh_summary');
 const states={};for(const name of ['before','after_retry','after_reboot']){
  const raw=JSON.parse(data[name]);states[name]={collected_at:fs.statSync(path.join(evidenceRoot,filenames[name])).mtime.toISOString(),version:raw.version,build:raw.build,updater_version:raw.updater,configuration_sha256:raw.configuration_sha256,boot_fingerprint:hash(raw.boot_id),setup_required:raw.setup_required,registered_credential_present:raw.registered_credential_present,units:raw.units};
 }
 const baseline={record_path:allow.prior_record_path,record_sha256_lf:hash(priorBytes.toString().replace(/\r\n/g,'\n'))};
 const expected=require('./validate_pi_live_qualification').expectedRelease(record);
 const end=report.completed_at,start=states.before.collected_at;
 const result={schema_version:m.SCHEMA,scope:m.SCOPE,release:expected,baseline,started_at:start,completed_at:end,lab:{role:'owned-unenrolled-pi',registered:false,receiver_attached:false},states,checks:{install_exit_code:0,retry_exit_code:0,invalid_argument_exit_code:report.checks.controlled_invalid_argument_exit_code,ssh_support_summary:true,browser_after_reboot:true,post_boot_service_errors:0},comparison:{sha256:hash(Buffer.from(JSON.stringify(comparison))),activation_logic_unchanged:comparison.activation_logic_unchanged,target_metadata_identical:comparison.target_metadata_identical,updater_payloads_identical:comparison.updater_payloads_identical},evidence:digests,limitations:{fresh_card_tested:false,registered_node_tested:false,receiver_rf_tested:false,backend_checkins_tested:false}};
 return result;
}
function attest(payload,keyId,keyFile,policy){
 const key=crypto.createPrivateKey(read(keyFile));
 insist(crypto.createPublicKey(key).export({type:'spki',format:'pem'}).toString()===policy.trusted_keys?.[keyId],'signer');
 const bytes=Buffer.from(JSON.stringify(payload));
 return {schema_version:m.SCHEMA.replace('-v1','-attestation-v1'),key_id:keyId,payload:bytes.toString('base64'),signature:crypto.sign(null,Buffer.concat([m.DOMAIN,bytes]),key).toString('base64')};
}
if(require.main===module){try{
 const [root,recordFile,archive,priorArchive,evidenceRoot,python,keyId,keyFile,output]=process.argv.slice(2);
 insist(output,'usage_ROOT_RECORD_NEWZIP_PRIORZIP_EVIDENCE_PYTHON_KEYID_KEYFILE_OUTPUT');
 const record=json(recordFile),payload=prepare(root,record,archive,priorArchive,evidenceRoot,python),policy=json(path.join(root,'policy/pi-live-qualification.json'));
 const envelope=attest(payload,keyId,keyFile,policy);
 m.validateEvidence(envelope,payload.release,payload.baseline,policy);
 fs.writeFileSync(output,JSON.stringify(envelope,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({scope:m.SCOPE,sha256:hash(read(output)),output,claims:payload.limitations}));
}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={prepare,attest};
