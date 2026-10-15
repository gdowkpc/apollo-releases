"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("node:fs"),path=require("node:path");
const guard=require("../scripts/validate_pi_updater_requirement");
const root=path.resolve(__dirname,"..");
const held=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/pi-held-v1.json")));
const p=JSON.parse(fs.readFileSync(path.join(root,"provenance/apollo-passive-v2.3.78-build.291.json")));
function next(overrides={}) {
 const tag=p.release_tag,file=p.package.filename;
 return {schema_version:"apollo-stable-release-v2",product_id:"apollo-passive-receive",platform:"linux",architecture:"arm64",
 version:p.release.version,build:p.release.build,source_commit:p.source.commit,published_at:"2026-10-15T00:00:00Z",
 release_page_url:`https://github.com/gdowkpc/apollo-releases/releases/tag/${tag}`,
 artifact_download_url:`https://github.com/gdowkpc/apollo-releases/releases/download/${tag}/${file}`,artifact_filename:file,
 byte_size:p.package.byte_size,sha256:p.package.sha256,short_release_notes:"Qualified installer-first rollout.",minimum_pi_updater_version:"1.0.83",...overrides};
}
test("only the exact held v1 descriptor remains admitted",()=>{
 assert.equal(guard.validate(held).held_legacy,true);
 for(const mutation of [{build:held.build+1},{short_release_notes:held.short_release_notes+" changed"},{minimum_pi_updater_version:"1.0.83"}])
  assert.throws(()=>guard.validate({...held,...mutation}));
 const old=next({schema_version:"apollo-stable-release-v1"});delete old.minimum_pi_updater_version;
 assert.throws(()=>guard.validate(old));
});
test("v2 requires an exact bounded requirement at or above the preservation floor",()=>{
 for(const minimum of [undefined,null,"","1.0.81","1.0.82","1.0.9","1.0.083","1.0.83-rc.1","1.0.9007199254740992"])
  assert.throws(()=>guard.validate(next({minimum_pi_updater_version:minimum})));
 for(const minimum of ["1.0.83","1.0.100","1.1.0"])
  assert.equal(guard.validate(next({minimum_pi_updater_version:minimum})).held_legacy,false);
 assert.throws(()=>guard.validate(next({extra:true})));
});
test("v2 binds platform, artifact and qualified immutable provenance",()=>{
 for(const mutation of [{architecture:"x64"},{platform:"windows"},{artifact_filename:"other.zip"},{sha256:"0".repeat(64)},{source_commit:"0".repeat(40)},{byte_size:1},{release_page_url:"https://evil.invalid/"},{short_release_notes:""}])
  assert.throws(()=>guard.validate(next(mutation)));
 assert.throws(()=>guard.validate(next(),()=>({...p,qualification:{status:"unqualified"}})));
 assert.throws(()=>guard.validate(next(),()=>{throw Error("missing provenance");}));
});
