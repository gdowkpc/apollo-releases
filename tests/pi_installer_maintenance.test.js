"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const main=require('../scripts/validate_pi_live_qualification'),m=require('../scripts/validate_pi_installer_maintenance');
const {prepare}=require('../scripts/publish_pi_installer');
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const hash=m.hash,h=s=>hash(Buffer.from(s)),clone=v=>JSON.parse(JSON.stringify(v));
const source=path.join(__dirname,'..'),oldPath='installers/apollo-pi-installer-v2.3.185-build.398-updater.1.0.102-revision.2.json';
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'apollo-maintenance-'));
 for(const d of ['policy','provenance','installers','qualifications'])fs.cpSync(path.join(source,d),path.join(root,d),{recursive:true});
 const prior=JSON.parse(fs.readFileSync(path.join(root,oldPath))),record=clone(prior);
 delete record.onboarding_qualification;
 record.schema_version='apollo-pi-installer-distribution-v4';record.qualification_scope=m.SCOPE;record.installer_revision=3;
 record.release_tag=prior.release_tag.replace('revision.2','revision.3');
 record.launcher_source.commit='a'.repeat(40);
 record.installer.filename=prior.installer.filename.replace('revision.2','revision.3');
 const archive=path.join(root,record.installer.filename),archiveBytes=Buffer.from('exact fixture installer');fs.writeFileSync(archive,archiveBytes);
 record.installer.sha256=hash(archiveBytes);record.installer.bytes=archiveBytes.length;
 const relative='installers/'+record.release_tag+'.json';
 record.inherited_qualification={record_path:oldPath,record_sha256_lf:hash(fs.readFileSync(path.join(root,oldPath)).toString().replace(/\r\n/g,'\n'))};
 record.maintenance_qualification={path:'qualifications/'+record.release_tag+'.maintenance.json',sha256:'0'.repeat(64)};
 const policy=JSON.parse(fs.readFileSync(path.join(root,'policy/pi-live-qualification.json')));
 policy.allowed_qualification_scopes=[...new Set([...policy.allowed_qualification_scopes,m.SCOPE])];policy.trusted_keys.fixture=publicKey.export({type:'spki',format:'pem'});
 policy.installer_maintenance_revisions={[relative]:{installer_sha256:record.installer.sha256,installer_bytes:record.installer.bytes,launcher_source_commit:record.launcher_source.commit,prior_record_path:oldPath,prior_record_sha256_lf:record.inherited_qualification.record_sha256_lf}};
 const now=Date.now(),start=now-120000,at=n=>new Date(start+n).toISOString();
 const state=(n,boot)=>({collected_at:at(n),version:record.target.version,build:record.target.build,updater_version:record.updater.version,configuration_sha256:h('config'),boot_fingerprint:h(boot),setup_required:true,registered_credential_present:false,node_agent_state:'registration_required',units:Object.fromEntries(m.UNITS.map(n=>[n,'active']))});
 const payload={schema_version:m.SCHEMA,scope:m.SCOPE,release:main.expectedRelease(record),baseline:clone(record.inherited_qualification),started_at:at(0),completed_at:at(110000),lab:{role:'owned-unenrolled-pi',registered:false,receiver_attached:false},states:{before:state(1000,'old'),after_retry:state(30000,'old'),after_reboot:state(90000,'new')},checks:{install_exit_code:0,retry_exit_code:0,invalid_argument_exit_code:1,ssh_support_summary:true,browser_after_reboot:true,post_boot_service_errors:0},comparison:{sha256:h('comparison'),activation_logic_unchanged:true,target_metadata_identical:true,updater_payloads_identical:true},evidence:Object.fromEntries(['before','after_retry','after_reboot','install_log','retry_log','diagnostic_log','journal','physical_report','target_comparison','browser_log','report_file'].map(n=>[n,h(n)])),limitations:{fresh_card_tested:false,registered_node_tested:false,receiver_rf_tested:false,backend_checkins_tested:false}};
 return {root,record,relative,archive,policy,payload,now};
}
function sign(payload,domain=m.DOMAIN){const bytes=Buffer.from(JSON.stringify(payload));return {schema_version:m.SCHEMA.replace('-v1','-attestation-v1'),key_id:'fixture',payload:bytes.toString('base64'),signature:crypto.sign(null,Buffer.concat([domain,bytes]),privateKey).toString('base64')};}
function save(f){const receipt=JSON.stringify(sign(f.payload),null,2)+'\n';f.record.maintenance_qualification.sha256=hash(receipt);fs.writeFileSync(path.join(f.root,f.record.maintenance_qualification.path),receipt);fs.writeFileSync(path.join(f.root,f.relative),JSON.stringify(f.record));fs.writeFileSync(path.join(f.root,'policy/pi-live-qualification.json'),JSON.stringify(f.policy));}
function withFixture(fn){const f=fixture();try{return fn(f);}finally{fs.rmSync(f.root,{recursive:true,force:true});}}
test('exact installer-only record inherits unchanged fully signed baseline and prepares for publication',()=>withFixture(f=>{save(f);const r=main.validateRecord(f.record,f.relative,f.root,f.policy);assert.equal(r.scope,m.SCOPE);assert.equal(prepare(f.root,f.record.release_tag,f.archive).record.qualification_scope,m.SCOPE);}));
const invalid={
 'not a physical owned lab':p=>p.lab.role='simulator',
 'registered node relabeled':p=>p.lab.registered=true,
 'receiver attached':p=>p.lab.receiver_attached=true,
 'credential created':p=>p.states.after_reboot.registered_credential_present=true,
 'pending enrollment cannot be called unenrolled':p=>p.states.before.node_agent_state='approval_pending',
 'wrong installed build':p=>p.states.after_retry.build++,
 'wrong updater':p=>p.states.after_reboot.updater_version='9.9.9',
 'configuration changed':p=>p.states.after_retry.configuration_sha256=h('changed'),
 'no actual reboot':p=>p.states.after_reboot.boot_fingerprint=p.states.before.boot_fingerprint,
 'failed service':p=>p.states.after_reboot.units['nginx.service']='failed',
 'failed install':p=>p.checks.install_exit_code=1,
 'failed retry':p=>p.checks.retry_exit_code=1,
 'missing browser check':p=>p.checks.browser_after_reboot=false,
 'journal error':p=>p.checks.post_boot_service_errors=1,
 'changed activation':p=>p.comparison.activation_logic_unchanged=false,
 'new target metadata':p=>p.comparison.target_metadata_identical=false,
 'new payload':p=>p.comparison.updater_payloads_identical=false,
 'fresh-card claim':p=>p.limitations.fresh_card_tested=true,
 'new RF claim':p=>p.limitations.receiver_rf_tested=true,
 'backend checkin claim':p=>p.limitations.backend_checkins_tested=true,
 'new registration claim':p=>p.limitations.registered_node_tested=true,
 'private extra data':p=>p.states.before.password='never export this',
 'missing evidence digest':p=>delete p.evidence.install_log
};
for(const [name,mutate]of Object.entries(invalid))test('reject '+name,()=>withFixture(f=>{mutate(f.payload);assert.throws(()=>m.validateEvidence(sign(f.payload),main.expectedRelease(f.record),f.record.inherited_qualification,f.policy,f.now),/pi_installer_maintenance_/);}));
test('reject wrong signing domain, untrusted signer and tampering',()=>withFixture(f=>{assert.throws(()=>m.validateEvidence(sign(f.payload,main.ONBOARDING_DOMAIN),f.payload.release,f.payload.baseline,f.policy),/signature/);const e=sign(f.payload);e.key_id='unknown';assert.throws(()=>m.validateEvidence(e,f.payload.release,f.payload.baseline,f.policy),/signer/);e.key_id='fixture';e.payload=Buffer.from(JSON.stringify({...f.payload,scope:'live_rf'})).toString('base64');assert.throws(()=>m.validateEvidence(e,f.payload.release,f.payload.baseline,f.policy),/signature/);}));
for(const [name,mutate]of Object.entries({
 'application payload':f=>f.record.target.sha256=h('new app'),
 'application source':f=>f.record.target.source_commit='b'.repeat(40),
 'updater capsule':f=>f.record.updater.unchanged_asset_hashes['ApolloUniversalPiUpdater-1.0.102.controller-capsule.json'].sha256=h('new capsule'),
 'installer bytes':f=>f.record.installer.sha256=h('different'),
 'unreviewed launcher':f=>f.record.launcher_source.commit='c'.repeat(40),
 'missing exact authorization':f=>delete f.policy.installer_maintenance_revisions[f.relative],
 'baseline edit':f=>fs.appendFileSync(path.join(f.root,oldPath),' '),
 'mixed onboarding proof':f=>f.record.onboarding_qualification={path:'wrong',sha256:h('wrong')},
 'unscoped extra claim':f=>f.record.rf_qualified=true
}))test('record rejects '+name,()=>withFixture(f=>{save(f);mutate(f);fs.writeFileSync(path.join(f.root,f.relative),JSON.stringify(f.record));assert.throws(()=>main.validateRecord(f.record,f.relative,f.root,f.policy),/pi_installer_maintenance_/);}));
test('unrelated installer or altered archive cannot be published under this scope',()=>withFixture(f=>{save(f);fs.appendFileSync(f.archive,'changed');assert.throws(()=>prepare(f.root,f.record.release_tag,f.archive),/bytes_mismatch/);}));
