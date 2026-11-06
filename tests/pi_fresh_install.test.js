"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const main=require('../scripts/validate_pi_live_qualification'),fresh=require('../scripts/validate_pi_fresh_install'),{prepare}=require('../scripts/publish_pi_installer');
const source=path.resolve(__dirname,'..'),tag='apollo-pi-installer-v2.3.198-build.411-updater.1.0.116',relative='installers/'+tag+'.json',clone=v=>JSON.parse(JSON.stringify(v));
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'apollo-fresh-install-'));
 for(const dir of ['policy','provenance','installers','qualifications'])fs.cpSync(path.join(source,dir),path.join(root,dir),{recursive:true});
 const record=JSON.parse(fs.readFileSync(path.join(root,relative))),policy=JSON.parse(fs.readFileSync(path.join(root,'policy/pi-live-qualification.json'))),old=JSON.parse(fs.readFileSync(path.join(root,record.fresh_install_qualification.path)));
 const payload=JSON.parse(Buffer.from(old.payload,'base64'));policy.trusted_keys.fixture=publicKey.export({type:'spki',format:'pem'});
 const archive=path.join(root,record.installer.filename),bytes=Buffer.from('fixture exact installer');fs.writeFileSync(archive,bytes);record.installer.sha256=fresh.hash(bytes);record.installer.bytes=bytes.length;
 payload.release=main.expectedRelease(record);policy.fresh_install_releases[relative].release=clone(payload.release);
 return {root,record,policy,payload,archive};
}
function save(f,domain=fresh.DOMAIN){
 const bytes=Buffer.from(JSON.stringify(f.payload)),envelope={schema_version:'apollo-pi-fresh-install-qualification-attestation-v1',key_id:'fixture',payload:bytes.toString('base64'),signature:crypto.sign(null,Buffer.concat([domain,bytes]),privateKey).toString('base64')},text=JSON.stringify(envelope,null,2)+'\n';
 f.record.fresh_install_qualification.sha256=fresh.hash(text);f.policy.fresh_install_releases[relative].evidence_sha256=fresh.hash(text);
 fs.writeFileSync(path.join(f.root,f.record.fresh_install_qualification.path),text);fs.writeFileSync(path.join(f.root,relative),JSON.stringify(f.record));fs.writeFileSync(path.join(f.root,'policy/pi-live-qualification.json'),JSON.stringify(f.policy));return envelope;
}
function check(f){return main.validateRecord(f.record,relative,f.root,f.policy);}
function withFixture(fn){const f=fixture();try{return fn(f);}finally{const resolved=path.resolve(f.root);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.match(path.basename(resolved),/^apollo-fresh-install-/);fs.rmSync(resolved,{recursive:true,force:true});}}
test('the real repository accepts the exact signed fresh-card record without claiming stable eligibility',()=>{const result=main.validateRepository();assert.ok(result.records>0);const record=JSON.parse(fs.readFileSync(path.join(source,relative)));const policy=JSON.parse(fs.readFileSync(path.join(source,'policy/pi-live-qualification.json')));const checked=main.validateRecord(record,relative,source,policy);assert.equal(checked.scope,'fresh_install');assert.equal(main.stableInstallerEligible(checked),false);});
test('exact signed fresh install prepares publication and preserves qualified updater reference',()=>withFixture(f=>{save(f);assert.equal(check(f).scope,'fresh_install');assert.equal(prepare(f.root,tag,f.archive).record.qualification_scope,'fresh_install');}));
const invalid={
 'populated Apollo baseline':p=>p.baseline.apollo_paths_present=['/opt/apollo-passive-receive'],
 'installed Node prerequisite':p=>p.baseline.packages.nodejs='installed',
 'preexisting Apollo unit':p=>p.baseline.apollo_units=['apollo-node-agent.service'],
 'simulated physical card':p=>p.lab.physical_fresh_card=false,
 'attached receiver':p=>p.lab.receiver_attached=true,
 'wrong release':p=>p.release.build=410,
 'missing retry':p=>delete p.states.after_retry,
 'retry changes configuration bytes':p=>p.states.after_retry.configuration.sha256='a'.repeat(64),
 'retry changes owner':p=>p.states.after_retry.configuration.uid=1234,
 'reboot changes permissions':p=>p.states.after_reboot.configuration.mode=0o644,
 'no actual reboot':p=>p.states.after_reboot.boot_fingerprint=p.baseline.boot_fingerprint,
 'credential created':p=>p.states.after_reboot.registered_credentials=true,
 'missing service':p=>p.states.after_reboot.units['nginx.service']='failed',
 'install failure':p=>p.checks.install_retry_exit_code=1,
 'private grant as public authority':p=>p.checks.normal_public_authority_verified=false,
 'wrong Windows build':p=>p.checks.windows_http.build=404,
 'default nginx page':p=>p.checks.windows_http.default_nginx_page=true,
 'missing evidence':p=>delete p.evidence.install_log,
 'registered recovery claim':p=>p.limitations.registered_node_recovery=true,
 'RF claim':p=>p.limitations.live_rf_reporting=true,
 'cooling issue relabeled resolved':p=>p.limitations.builder_cooling_resolved=true,
 'extra unrestricted readiness claim':p=>p.limitations.production_ready=true,
 'invalid time interval':p=>p.completed_at=p.started_at
};
for(const [name,mutate]of Object.entries(invalid))test('rejects '+name,()=>withFixture(f=>{mutate(f.payload);save(f);assert.throws(()=>check(f),/pi_fresh_install_/);}));
test('rejects missing exact-release authorization',()=>withFixture(f=>{save(f);delete f.policy.fresh_install_releases[relative];assert.throws(()=>check(f),/exact_release_not_authorized/);}));
test('rejects a changed archive after qualification',()=>withFixture(f=>{save(f);fs.appendFileSync(f.archive,'changed');assert.throws(()=>prepare(f.root,tag,f.archive),/qualified_installer_bytes_mismatch/);}));
test('rejects a changed record digest or source outside its exact allowlist',()=>withFixture(f=>{save(f);f.record.launcher_source.commit='a'.repeat(40);assert.throws(()=>check(f),/reviewed_identity/);}));
test('rejects signature domain replay from another qualification family',()=>withFixture(f=>{save(f,Buffer.from('apollo-pi-onboarding-qualification-v1\n'));assert.throws(()=>check(f),/signature/);}));
test('rejects a receipt signed by an untrusted key',()=>withFixture(f=>{save(f);delete f.policy.trusted_keys.fixture;assert.throws(()=>check(f),/signer/);}));
test('does not allow a fresh-only installer to satisfy stable promotion',()=>withFixture(f=>{save(f);const file=path.join(f.root,'stable');fs.cpSync(path.join(source,'stable'),file,{recursive:true});const stablePath=path.join(file,'apollo-passive-receive-linux-arm64.json'),stable=JSON.parse(fs.readFileSync(stablePath));Object.assign(stable,{version:f.record.target.version,build:f.record.target.build,source_commit:f.record.target.source_commit,sha256:f.record.target.sha256,minimum_pi_updater_version:f.record.updater.version});fs.writeFileSync(stablePath,JSON.stringify(stable));assert.throws(()=>main.validateRepository(f.root),/stable_requires_matching_qualified_installer/);}));

test('rejects a changed application release tag',()=>withFixture(f=>{save(f);f.record.target.release_tag='apollo-passive-v2.3.191-build.404';assert.throws(()=>check(f),/application_tag/);}));
test('rejects extra nested readiness claims',()=>withFixture(f=>{save(f);f.record.target.production_ready=true;assert.throws(()=>check(f),/nested_record_fields/);}));
