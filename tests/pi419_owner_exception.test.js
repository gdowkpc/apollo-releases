"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {validateRecord,stableInstallerEligible}=require('../scripts/validate_pi_live_qualification');
const root=path.resolve(__dirname,'..'),rel='installers/apollo-pi-installer-v2.3.206-build.419-updater.1.0.120.json';
const record=JSON.parse(fs.readFileSync(path.join(root,rel)));
const policy=JSON.parse(fs.readFileSync(path.join(root,'policy/pi-live-qualification.json')));
test('exact owner exception is explicit and stable eligible without fabricated qualification',()=>{const r=validateRecord(record,rel,root,policy);assert.equal(r.scope,'owner_release_exception');assert.equal(r.owner_exception.qualification_complete,false);assert.equal(stableInstallerEligible(r),true);});
test('changed installer identity or substituted evidence is refused',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'apollo419-exception-'));try{fs.cpSync(path.join(root,'installers'),path.join(dir,'installers'),{recursive:true});fs.cpSync(path.join(root,'qualifications'),path.join(dir,'qualifications'),{recursive:true});const changed=structuredClone(record);changed.installer.sha256='0'.repeat(64);fs.writeFileSync(path.join(dir,rel),JSON.stringify(changed));assert.throws(()=>validateRecord(changed,rel,dir,policy),/not_exact/);fs.copyFileSync(path.join(root,rel),path.join(dir,rel));fs.appendFileSync(path.join(dir,record.owner_exception.path),' ');assert.throws(()=>validateRecord(record,rel,dir,policy),/evidence_changed/);}finally{fs.rmSync(dir,{recursive:true,force:true});}});

test("Build 404 sees the compatible wire fields while qualification stays an owner exception", () => {
  assert.equal(record.schema_version, "apollo-pi-installer-distribution-v3");
  assert.equal(record.publication_status, "qualified");
  assert.equal(record.qualification_scope, "owner_release_exception");
});
