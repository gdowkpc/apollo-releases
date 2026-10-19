"use strict";
// Read-only GitHub collection. A signing key is optional; without it this emits
// unsigned review material that cannot satisfy the publication gate.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),cp=require("node:child_process");
const {INVENTORY_DOMAIN,hash,validateUpdaterInventory}=require("./validate_pi_bridge_compatibility");
function gate(ok,code){if(!ok)throw Error("pi_updater_inventory_"+code);}
function run(file,args,options={}){return cp.execFileSync(file,args,{maxBuffer:64*1024*1024,stdio:["ignore","pipe","pipe"],...options});}
const git=(root,...args)=>run("git",["-C",root,...args]).toString("utf8").trim();
function cleanRepository(root,repository){
  const remote=git(root,"remote","get-url","origin");gate([`https://github.com/${repository}.git`,`https://github.com/${repository}`,`git@github.com:${repository}.git`].includes(remote),"repository");
  gate(git(root,"status","--porcelain","--untracked-files=all")==="","dirty_source");return git(root,"rev-parse","HEAD");
}
function compare(a,b){const aa=a.split(".").map(Number),bb=b.split(".").map(Number);for(let i=0;i<3;i++)if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1;return 0;}
function releaseRange(pages,minimum,maximum){
  const ver=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  gate([minimum,maximum].every(v=>typeof v==="string" && v.length<64 && ver.test(v) && v.split(".").every(n=>Number.isSafeInteger(Number(n)))) && compare(minimum,maximum)<0,"range");
  gate(Array.isArray(pages) && pages.length>0 && pages.every(p=>Array.isArray(p) && p.length<=100) && pages.at(-1).length<100,"pagination_incomplete");
  const seenIds=new Set(),seenVersions=new Set(),selected=[];
  for(const r of pages.flat()){
    gate(Number.isSafeInteger(r.id) && !seenIds.has(r.id),"duplicate_release");seenIds.add(r.id);
    const m=typeof r.tag_name==="string" && /^apollo-universal-pi-updater-v(.+)$/.exec(r.tag_name);
    if(!m || r.draft===true || r.prerelease===true)continue;
    gate(ver.test(m[1]) && m[1].split(".").every(n=>Number.isSafeInteger(Number(n))),"release_version");
    if(compare(m[1],minimum)<0 || compare(m[1],maximum)>0)continue;
    gate(!seenVersions.has(m[1]) && r.draft===false && r.prerelease===false && r.immutable===true,"release_not_unique_immutable");seenVersions.add(m[1]);
    const prefix=`ApolloUniversalPiUpdater-${m[1]}`,names=[prefix+"-linux-arm64.zip",prefix+".authority.json",prefix+".controller-capsule.json"];
    gate(Array.isArray(r.assets) && r.assets.length===3 && names.every(n=>r.assets.filter(a=>a.name===n).length===1),"release_assets");
    for(const a of r.assets)gate(Number.isSafeInteger(a.id) && Number.isSafeInteger(a.size) && a.size>0 && a.size<=64*1024*1024,"asset_size");
    selected.push({release:r,version:m[1],names});
  }
  gate(seenVersions.has(minimum) && seenVersions.has(maximum),"range_endpoints");return selected.sort((a,b)=>compare(a.version,b.version));
}
function collect(plan){
  gate(plan && typeof plan.source_root==="string" && typeof plan.output_directory==="string","plan");
  const publicRoot=path.resolve(__dirname,".."),sourceRoot=path.resolve(plan.source_root);
  const collectorCommit=cleanRepository(publicRoot,"gdowkpc/apollo-releases"),sourceCommit=cleanRepository(sourceRoot,"gdowkpc/apollo");
  const output=path.resolve(plan.output_directory);gate(!fs.existsSync(output),"output_exists");
  const runtime=path.join(sourceRoot,"tools/rb_rig_agent_uniden/apollo_passive_receive");
  const verifier=require(path.join(runtime,"src/updates/universal_pi_updater.js"));
  const anchorPath=path.join(runtime,"config/universal-pi-updater-trust-anchor-v1.json"),anchorBytes=fs.readFileSync(anchorPath),anchor=JSON.parse(anchorBytes);
  const pages=JSON.parse(run("gh",["api","--hostname","github.com","repos/gdowkpc/apollo/releases?per_page=100","--paginate","--slurp"]));
  const releases=releaseRange(pages,plan.minimum_updater_version,plan.maximum_updater_version);
  // No output or signature is created until every selected release verifies.
  const manifest={source_commit:sourceCommit,anchor_sha256:hash(anchorBytes),release_listing_sha256:hash(JSON.stringify(pages)),releases:[]},logs=[],updaters=[];
  for(const {release:r,version,names} of releases){
    const assets={};
    for(const name of names){const a=r.assets.find(x=>x.name===name);const bytes=run("gh",["api","--hostname","github.com",`repos/gdowkpc/apollo/releases/assets/${a.id}`,"--header","Accept: application/octet-stream"]);gate(bytes.length===a.size,"asset_bytes");assets[name]={id:a.id,bytes,sha256:hash(bytes)};}
    const [archiveName,authorityName,capsuleName]=names;
    const authority=verifier.validateProductionAuthority(JSON.parse(assets[authorityName].bytes),anchor);
    gate(authority.updater_version===version && authority.updater_artifact.filename===archiveName,"authority_identity");
    verifier.verifyUpdaterArtifact(assets[archiveName].bytes,authority);
    const capsule=JSON.parse(assets[capsuleName].bytes);
    gate(Array.isArray(capsule.historical_states) && capsule.historical_states.length>0,"capsule_states");
    for(const state of capsule.historical_states)verifier.verifyCapsule(assets[capsuleName].bytes,authority,state);
    updaters.push({version,package_sha256:assets[archiveName].sha256,capsule_sha256:assets[capsuleName].sha256});
    manifest.releases.push({id:r.id,tag_name:r.tag_name,immutable:r.immutable,assets:names.map(name=>({name,id:assets[name].id,sha256:assets[name].sha256,bytes:assets[name].bytes.length}))});
    logs.push({version,immutable:true,authority_verified:true,artifact_verified:true,capsule_verified:true,profiles_checked:capsule.historical_states.length});
  }
  // Detect any source changes while the verifier was in use.
  gate(cleanRepository(publicRoot,"gdowkpc/apollo-releases")===collectorCommit && cleanRepository(sourceRoot,"gdowkpc/apollo")===sourceCommit,"source_changed");
  const manifestBytes=Buffer.from(JSON.stringify(manifest)),logBytes=Buffer.from(JSON.stringify(logs));
  const payload={schema_version:"apollo-pi-updater-inventory-v1",repository:"gdowkpc/apollo",collected_at:new Date().toISOString(),complete:true,
    minimum_updater_version:plan.minimum_updater_version,maximum_updater_version:plan.maximum_updater_version,collector_source_commit:collectorCommit,
    manifest_sha256:hash(manifestBytes),log_sha256:hash(logBytes),updaters};
  let signed=null;
  if(plan.qualification_signing_key){
    const key=crypto.createPrivateKey(fs.readFileSync(plan.qualification_signing_key));gate(key.asymmetricKeyType==="ed25519","signing_key");
    const publicDer=crypto.createPublicKey(key).export({type:"spki",format:"der"});
    const policy=JSON.parse(fs.readFileSync(path.join(publicRoot,"policy/pi-live-qualification.json")));
    const matches=Object.entries(policy.trusted_keys||{}).filter(([,v])=>crypto.createPublicKey(v).export({type:"spki",format:"der"}).equals(publicDer));gate(matches.length===1,"untrusted_signer");
    const bytes=Buffer.from(JSON.stringify(payload));signed={schema_version:"apollo-pi-updater-inventory-attestation-v1",key_id:matches[0][0],payload:bytes.toString("base64"),signature:crypto.sign(null,Buffer.concat([INVENTORY_DOMAIN,bytes]),key).toString("base64")};
    validateUpdaterInventory(signed,policy,plan.minimum_updater_version,plan.maximum_updater_version);
  }
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,"manifest.json"),manifestBytes,{flag:"wx"});fs.writeFileSync(path.join(output,"verification-log.json"),logBytes,{flag:"wx"});
  fs.writeFileSync(path.join(output,"inventory-payload.UNSIGNED.json"),JSON.stringify(payload),{flag:"wx"});
  if(signed){const b=Buffer.from(JSON.stringify(signed));fs.writeFileSync(path.join(output,`pi-updater-inventory-${hash(b)}.json`),b,{flag:"wx"});}
  return {versions:updaters.map(u=>u.version),signed:!!signed,output_directory:output,collector_source_commit:collectorCommit,manifest_sha256:hash(manifestBytes)};
}
if(require.main===module){try{gate(process.argv.length===3,"usage_plan_json_required");console.log(JSON.stringify(collect(JSON.parse(fs.readFileSync(process.argv[2])))));}catch(e){console.error(e.code || (e.message.startsWith("pi_updater_inventory_") ? e.message : "pi_updater_inventory_collection_failed"));process.exitCode=1;}}
module.exports={releaseRange,collect};
