"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const MINIMUM = "1.0.82";
// Exact held v1 advertisement at the start of the v2 rollout. Formatting and
// key order may vary; no identity, URL, notes or other content may be changed.
const HELD_V1 = "b18d4d95059c0ed94a3defee634edc8484e55701302bc3f500e319b25cec558e";
const FIELDS = ["schema_version", "product_id", "platform", "architecture", "version", "build", "source_commit", "published_at", "release_page_url", "artifact_download_url", "artifact_filename", "byte_size", "sha256", "short_release_notes", "minimum_pi_updater_version"];
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
function fail() { throw new Error("Pi promotion requires v2, a qualified minimum updater and matching immutable provenance; use the complete installer for the held legacy target"); }
function version(v) { return typeof v === "string" && v.length <= 64 && VERSION.test(v) && v.split(".").every(n => Number.isSafeInteger(Number(n))); }
function compare(a,b) { const aa=a.split(".").map(Number),bb=b.split(".").map(Number);for(let i=0;i<3;i++)if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1;return 0; }
function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])))).digest("hex");
}
function validate(value, readProvenance = tag => JSON.parse(fs.readFileSync(path.join(ROOT,"provenance",tag+".json"),"utf8"))) {
  if (!value || typeof value!=="object" || Array.isArray(value)) fail();
  if (value.schema_version==="apollo-stable-release-v1" && fingerprint(value)===HELD_V1) return {held_legacy:true};
  if (value.schema_version!=="apollo-stable-release-v2" || Object.keys(value).length!==FIELDS.length
      || Object.keys(value).some(k=>!FIELDS.includes(k)) || value.product_id!=="apollo-passive-receive"
      || value.platform!=="linux" || value.architecture!=="arm64" || !version(value.version)
      || !version(value.minimum_pi_updater_version) || compare(value.minimum_pi_updater_version,MINIMUM)<0
      || !Number.isSafeInteger(value.build) || value.build<1 || !/^[a-f0-9]{40}$/.test(value.source_commit||"")
      || !/^[a-f0-9]{64}$/.test(value.sha256||"") || !Number.isSafeInteger(value.byte_size) || value.byte_size<1
      || typeof value.published_at!=="string" || !Number.isFinite(Date.parse(value.published_at))
      || typeof value.short_release_notes!=="string" || !value.short_release_notes.trim() || value.short_release_notes.length>1200
      || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value.short_release_notes)) fail();
  const tag=`apollo-passive-v${value.version}-build.${value.build}`;
  const filename=`ApolloPassiveReceive-${value.version}-build.${value.build}-linux-arm64.zip`;
  if(value.artifact_filename!==filename || value.release_page_url!==`https://github.com/gdowkpc/apollo-releases/releases/tag/${tag}`
      || value.artifact_download_url!==`https://github.com/gdowkpc/apollo-releases/releases/download/${tag}/${filename}`)fail();
  const p=readProvenance(tag);
  if(p.release_tag!==tag || p.release_repository?.full_name!=="gdowkpc/apollo-releases" || p.source?.repository!=="gdowkpc/apollo"
      || p.source?.commit!==value.source_commit || p.release?.version!==value.version || p.release?.build!==value.build
      || p.release?.platform!=="linux" || p.release?.architecture!=="arm64" || p.package?.filename!==filename
      || p.package?.sha256!==value.sha256 || p.package?.byte_size!==value.byte_size || p.qualification?.status!=="qualified")fail();
  return {held_legacy:false,minimum_pi_updater_version:value.minimum_pi_updater_version};
}
if(require.main===module) {
  try { const result=validate(JSON.parse(fs.readFileSync(path.join(ROOT,"stable/apollo-passive-receive-linux-arm64.json"),"utf8")));console.log("pi-updater-requirement: PASS "+(result.held_legacy?"unchanged held v1 target":"v2 minimum "+result.minimum_pi_updater_version)); }
  catch(error) { console.error(error.message);process.exitCode=1; }
}
module.exports={validate,fingerprint,MINIMUM};
