"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {releaseRange}=require("../scripts/collect_pi_updater_inventory");
function release(v,id=1){return {id,tag_name:`apollo-universal-pi-updater-v${v}`,draft:false,prerelease:false,immutable:true,
  assets:["-linux-arm64.zip",".authority.json",".controller-capsule.json"].map((s,i)=>({name:`ApolloUniversalPiUpdater-${v}${s}`,id:id*10+i,size:100}))};}
function pages(){return [[release("1.0.85",1),release("1.0.86",2),release("1.0.87",3),release("1.0.89",4),release("1.0.90",5),release("1.0.91",6)]];}
test("collector enumerates every published immutable updater in the advertised range",()=>assert.deepEqual(releaseRange(pages(),"1.0.85","1.0.91").map(r=>r.version),["1.0.85","1.0.86","1.0.87","1.0.89","1.0.90","1.0.91"]));
const changes={"nonimmutable updater":p=>p[0][1].immutable=false,"duplicate release":p=>p[0].push(p[0][0]),"duplicate version":p=>p[0].push(release("1.0.86",7)),
  "missing minimum":p=>p[0].shift(),"missing newest updater":p=>p[0].pop(),"unexpected asset":p=>p[0][0].assets.push({name:"extra",id:999,size:10}),
  "missing capsule":p=>p[0][0].assets.pop(),"oversized asset":p=>p[0][0].assets[0].size=1024*1024*1024,"missing immutability fact":p=>delete p[0][0].immutable};
for(const [name,change] of Object.entries(changes))test("collector fails closed on "+name,()=>{const p=pages();change(p);assert.throws(()=>releaseRange(p,"1.0.85","1.0.91"),/pi_updater_inventory_/);});
test("draft or prerelease cannot satisfy an endpoint",()=>{for(const field of ["draft","prerelease"]){const p=pages();p[0][0][field]=true;assert.throws(()=>releaseRange(p,"1.0.85","1.0.91"),/range_endpoints/);}});
test("incomplete final page is rejected",()=>assert.throws(()=>releaseRange([Array.from({length:100},(_,i)=>release("1.0.85",i+1))],"1.0.85","1.0.91"),/pagination_incomplete/));
test("unrelated non-updater releases do not affect coverage",()=>{const p=pages();p[0].push({id:999,tag_name:"apollo-passive-v4.0.1-build.800"});assert.equal(releaseRange(p,"1.0.85","1.0.91").length,6);});
test("collector rejects malformed semantic ranges",()=>{for(const minimum of ["01.0.85","1.0.99999999999999999999","1.0.92",null])assert.throws(()=>releaseRange(pages(),minimum,"1.0.91"),/range/);});
