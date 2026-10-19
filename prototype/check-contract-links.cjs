const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(__dirname+'/contract-workspace.js','utf8').replace(/initContractWorkspace\(\)\.catch[\s\S]*$/,'');
const stub=`
const clone=x=>JSON.parse(JSON.stringify(x)),esc=x=>String(x);
let calcParams=null,calcResult=null,calcReverseReport=null;
let calcChanged=false;
function markCalcChanged(){calcChanged=true;calcParams.revision++;}
function saveCalcRecord(){}function restoreCalcRecord(){}function syncCalcLinkStatus(){}
function renderCalcResults(){}function openCalcSource(){}function showLeaseCalculation(){}
function showCalcError(){}
function reviewRecoveredCalc(){}function openLeaseEditor(){}function saveLeaseDraft(){}
function closeLeaseEditor(){}function requestCloseLease(){}
const nodes={};const $=s=>nodes[s]||(nodes[s]={hidden:false,innerHTML:'',onclick:null});
const saved={};const localStorage={setItem(k,v){saved[k]=v;},getItem(k){return saved[k]||null;}};function toast(){}
let testDeleteAction=null,calcAutoTimer=null,calcPendingRefresh=false;
const historyCalls=[];const location={hash:'#contracts'};const history={pushState(a,b,url){historyCalls.push(url);location.hash=url;},replaceState(a,b,url){location.hash=url;}};const routeEvents={};const window={addEventListener(name,fn){routeEvents[name]=fn;}};
function clearTimeout(){}function openDrawer(title,body,label,action){testDeleteAction=action;}
`;
const checks=`
syncCalcLinkStatus=()=>{};
leaseRecords={A:{id:'A',params:{recordId:'A',revision:1}},B:{id:'B',params:{recordId:'B',revision:9}}};
activeLeaseId='A';calcParams={recordId:'A',revision:1,annualRate:0.043};
markCalcChanged();assert.equal(leaseRecords.A.params.revision,2);assert.equal(leaseRecords.B.params.revision,9);
calcParams.annualRate=0.05;assert.equal(leaseRecords.A.params.annualRate,0.043);
// A request finishing after navigation to another contract must only save A's result.
activeLeaseId='B';leaseRoute='overview';calcResult={params:{recordId:'A',revision:2},initial:{liability:100}};
saveCalcRecord();assert.equal(leaseRecords.A.result.initial.liability,100);assert.equal(leaseRecords.B.result,undefined);
calcResult.initial.liability=200;assert.equal(leaseRecords.A.result.initial.liability,100);
// Editing B cannot overwrite A; result and parameter versions remain tied to B.
calcParams={recordId:'B',revision:9,annualRate:0.02};markCalcChanged();
assert.equal(leaseRecords.B.params.revision,10);assert.equal(leaseRecords.A.params.revision,2);
assert.equal(routeUrl('LS-XA-2023-001','parameters'),'#contract/LS-XA-2023-001/parameters');
navigateContractUrl('#contract/A/overview');assert.equal(historyCalls.length,1);navigateContractUrl('#contract/A/overview');assert.equal(historyCalls.length,1);navigateContractUrl('#contracts');assert.equal(historyCalls.length,2);assert.equal(typeof routeEvents.popstate,'function');
const header=contextHeader({id:'A',params:{name:'Office',company:'Tenant'}},'overview');assert.ok(header.includes('返回合同台账'));
showContractList=()=>{};deleteLeaseContract('A');testDeleteAction();
assert.equal(leaseRecords.A,undefined);assert.equal(leaseRecords.B.params.revision,10);
assert.equal(JSON.parse(saved['leaseDeletedContracts.v1']).A.id,'A');
assert.equal(JSON.parse(saved[contractStorageKey]).A,undefined);
assert.equal(calcParams,null);assert.equal(calcResult,null);
console.log('Contract ownership, snapshot isolation and routing checks passed');
`;
vm.runInNewContext(stub+'\n'+source+'\n'+checks,{assert,console});
