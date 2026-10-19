// Run with: node prototype/check-financial-rules.cjs
// Checks the financial entry rules without browser dependencies.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/lease-form.js','utf8');
const checks=`
const valid={...clone(leaseDefaults),name:'示例办公室',lessor:'示例出租方',rent:'30000'};
function check(overrides){leaseDraft={...clone(valid),...overrides};return validateLeaseDraft(true);}
assert.equal(check({}).length,0);
assert(check({start:'2027-10-01',end:'2027-09-30'}).some(e=>e.includes('不得早于')));
assert(check({freeEnabled:true,freePeriods:[{start:'2026-10-01',end:'2026-11-30'},{start:'2026-11-01',end:'2026-12-31'}]}).some(e=>e.includes('重叠')));
assert(check({freeEnabled:true,freePeriods:[{start:'2026-09-01',end:'2026-09-30'}]}).some(e=>e.includes('核算租赁期')));
assert.equal(check({exemption:'short',end:'2027-09-30'}).length,0);
assert(check({exemption:'short',end:'2027-10-01'}).some(e=>e.includes('超过 12 个月')));
assert(check({exemption:'short',end:'2027-09-30',purchaseEnabled:true,purchaseDecision:'no',purchaseDate:'2027-09-30',purchaseReason:'无优惠购买价'}).some(e=>e.includes('包含购买选择权')));
assert(check({residualEnabled:true,residualAmount:'20000',residualCap:'10000'}).some(e=>e.includes('担保上限')));
assert(check({prepaid:'90000',prepaidDate:'2026-10-02',prepaidAllocation:'首季租金'}).some(e=>e.includes('付款日不能晚于')));
assert(check({renewalEnabled:true}).some(e=>e.includes('需要完成财务判断')));
leaseDraft={...clone(valid),renewalEnabled:true};assert.equal(validateLeaseDraft(false).length,0);
assert.equal(leaseEffectiveEnd({...valid,renewalEnabled:true,renewalDecision:'yes',renewalMonths:'12'}),'2030-09-30');
assert.equal(leaseEffectiveEnd({...valid,terminationEnabled:true,terminationDecision:'yes',terminationDate:'2028-09-30'}),'2028-09-30');
const variable=leaseChecklist({...valid,variableType:'both',indexBase:'CPI=102',indexMonthly:'1000',otherEstimate:'5000'});
assert.equal(variable.find(r=>r.name.includes('指数 /')).state,'纳入');
assert.equal(variable.find(r=>r.name.includes('销售额 /')).state,'排除');
assert.equal(leaseChecklist({...valid,timing:'advance',prepaid:'0'}).find(r=>r.name==='开始日及之前已付租金').state,'无');
assert.doesNotThrow(()=>check({start:'',exemption:'short'}));
assert.doesNotThrow(()=>check({renewalEnabled:true,renewalDecision:'yes',renewalMonths:'1e300',exemption:'short'}));
console.log('18 financial-entry checks passed');
`;
vm.runInNewContext(source+'\n'+checks,{assert,console,money:n=>Number(n).toFixed(2)});
