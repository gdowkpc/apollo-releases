"use strict";
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const RECORD='installers/apollo-pi-installer-v2.3.203-build.416-updater.1.0.120.json';
const RECORD_SHA='5faeec83911b58a42365ba473efe376e206bfed6fa5540680410c21b3ec314d5';
const APPROVED = new Map([[RECORD, RECORD_SHA], ['installers/apollo-pi-installer-v2.3.206-build.419-updater.1.0.120.json', '0aa308c2e3e96fa65e0cdb0129f7b3036bb5fa857c48d62a6396deee1bb0f3cd']]);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function validateRecord(record,relative,root,policy,{read}) {
 if(!APPROVED.has(relative) || sha(read(root,relative).toString('utf8').replace(/\r\n/g,'\n'))!==APPROVED.get(relative)) throw Error('owner_exception_not_exact_416_record');
 if(JSON.stringify(record)!==JSON.stringify(JSON.parse(read(root,relative)))) throw Error('owner_exception_record_argument_mismatch');
 const evidence=read(root,record.owner_exception.path);
 if(sha(evidence.toString('utf8').replace(/\r\n/g,'\n'))!==record.owner_exception.sha256) throw Error('owner_exception_evidence_changed');
 const p=JSON.parse(read(root,'provenance/'+record.target.release_tag+'.json'));
 if(p.source.commit!==record.target.source_commit || p.package.sha256!==record.target.sha256) throw Error('owner_exception_provenance_mismatch');
 return {held:false,record,scope:'owner_release_exception',owner_exception:JSON.parse(evidence)};
}
module.exports={validateRecord,RECORD,RECORD_SHA};
