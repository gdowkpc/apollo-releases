"use strict";
const fs = require("node:fs"), path = require("node:path"), cp = require("node:child_process");
const {hash,validateRecord} = require("./validate_pi_live_qualification");
const REPOSITORY = "gdowkpc/apollo-releases";
function prepare(root, tag, archive) {
  if (!/^apollo-pi-installer-v\d+\.\d+\.\d+-build\.[1-9]\d*-updater\.\d+\.\d+\.\d+$/.test(tag)) throw Error("invalid_installer_tag");
  const relative=`installers/${tag}.json`, recordBytes=fs.readFileSync(path.join(root,relative));
  const record=JSON.parse(recordBytes), policy=JSON.parse(fs.readFileSync(path.join(root,"policy/pi-live-qualification.json")));
  const validated=validateRecord(record,relative,root,policy);
  if(validated.held) throw Error("historical_installer_cannot_be_republished");
  const resolved=path.resolve(archive), stat=fs.lstatSync(resolved);
  if(!stat.isFile()||stat.isSymbolicLink()||path.basename(resolved)!==record.installer.filename
      ||stat.size!==record.installer.bytes||hash(fs.readFileSync(resolved))!==record.installer.sha256) throw Error("qualified_installer_bytes_mismatch");
  return {record,recordBytes,relative,archive:resolved};
}
function run(args,root) { return cp.execFileSync(args[0],args.slice(1),{cwd:root,encoding:"utf8",stdio:["ignore","pipe","pipe"],maxBuffer:1024*1024}).trim(); }
function publish(root,tag,archive) {
  const prepared=prepare(root,tag,archive);
  if(run(["git","status","--porcelain"],root)!=="")throw Error("clean_reviewed_checkout_required");
  const main=run(["gh","api",`repos/${REPOSITORY}/commits/main`,"--jq",".sha"],root);
  if(run(["git","rev-parse","HEAD"],root)!==main)throw Error("reviewed_public_main_required");
  const reference=JSON.parse(run(["gh","api",`repos/${REPOSITORY}/git/ref/tags/${tag}`],root));
  if(reference.object?.type!=="commit"||reference.object.sha!==main)throw Error("reviewed_lightweight_tag_required");
  // Qualification and exact bytes are checked before any GitHub mutation.
  const onboarding = prepared.record.qualification_scope === "installer_onboarding";
  const notes = onboarding
    ? `Qualified exact installer installation, retry, preserved node state, reboot readiness, authenticated check-ins and tested one-approval onboarding. Live RF reporting qualification remains pending. Signed qualification: ${prepared.record.onboarding_qualification.path}`
    : `Qualified owned RTL bench installation, retry, authenticated check-ins, real report delivery, reboot and every configured RF window. Signed qualification: ${prepared.record.live_qualification.path}`;
  run(["gh","release","create",tag,prepared.archive,"--repo",REPOSITORY,"--draft","--verify-tag","--latest=false",
    "--title",`Apollo Pi ${prepared.record.target.version} / Build ${prepared.record.target.build}`,
    "--notes",notes],root);
  const draft=JSON.parse(run(["gh","release","view",tag,"--repo",REPOSITORY,"--json","tagName,isDraft,assets"],root));
  const asset=draft.assets?.find(v=>v.name===prepared.record.installer.filename);
  if(!draft.isDraft||draft.tagName!==tag||draft.assets.length!==1||asset?.size!==prepared.record.installer.bytes
    ||asset.digest!=="sha256:"+prepared.record.installer.sha256)throw Error("draft_asset_verification_failed_leave_held");
  run(["gh","release","edit",tag,"--repo",REPOSITORY,"--draft=false","--latest=false"],root);
  const released=JSON.parse(run(["gh","release","view",tag,"--repo",REPOSITORY,"--json","tagName,isDraft,isImmutable,assets"],root));
  if(released.isDraft||!released.isImmutable)throw Error("publication_result_requires_inspection");
  return {published:true,tag,sha256:prepared.record.installer.sha256};
}
if(require.main===module) {
  try { if(process.argv.length!==4)throw Error("usage: node scripts/publish_pi_installer.js TAG ARCHIVE");
    console.log(JSON.stringify(publish(path.resolve(__dirname,".."),process.argv[2],process.argv[3]))); }
  catch(error) { console.error(error.message);process.exitCode=1; }
}
module.exports={prepare,publish};
