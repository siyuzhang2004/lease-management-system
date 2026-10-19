const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(__dirname+'/default-contract.js','utf8');
const checks=`
(async()=>{
 const makeStorage=(initial={})=>{const data={...initial};return {getItem:key=>Object.hasOwn(data,key)?data[key]:null,setItem:(key,value)=>{data[key]=value;}};};
 const sample={id:'XIAN',params:{recordId:'XIAN'},result:{params:{recordId:'XIAN'}}};
 let loads=0;const load=async()=>{loads++;return sample;};
 const fresh=makeStorage(),records={};
 assert.equal(await seedDefaultLease(fresh,records,load),'XIAN');assert.equal(loads,1);
 assert.equal(JSON.parse(fresh.getItem('leaseContracts.v1')).XIAN.id,'XIAN');
 assert.equal(await seedDefaultLease(fresh,records,load),null);assert.equal(loads,1);
 for(const initial of [{'leaseContracts.v1':'{}'},{'leaseDeletedContracts.v1':'{}'},{'leaseDefaultContract.v1':'1'}]){
  const storage=makeStorage(initial);assert.equal(await seedDefaultLease(storage,{},load),null);
 }
 const existing={OTHER:{id:'OTHER',params:{name:'User modified contract'}}};
 assert.equal(await seedDefaultLease(makeStorage(),existing,load),null);
 assert.equal(existing.OTHER.params.name,'User modified contract');assert.equal(loads,1);
 const invalid=makeStorage();await assert.rejects(()=>seedDefaultLease(invalid,{},async()=>({id:'XIAN'})));
 assert.equal(invalid.getItem('leaseDefaultContract.v1'),null);
 const renaming={A:{id:'A',params:{company:'西安普源',revision:4,annualRate:.042},financialParameters:{company:'西安普源'}},B:{id:'B',params:{company:'深圳普源精电科技有限公司',revision:3}}};
 let recalculations=0;
 await normalizeWorkspaceCompanyNames(renaming,async params=>{recalculations++;return {params,initial:{asset:10}};});
 assert.equal(recalculations,1);assert.equal(renaming.A.params.company,'西安普源精电科技有限公司');assert.equal(renaming.A.params.revision,5);assert.equal(renaming.A.params.annualRate,.042);assert.equal(renaming.A.financialParameters.company,renaming.A.params.company);assert.equal(renaming.B.params.revision,3);
 const renamed={C:{id:'C',params:{company:'北京耐数电子有限公司',revision:3,annualRate:.0385}}};
 await normalizeWorkspaceCompanyNames(renamed,async params=>({params}));
 assert.equal(renamed.C.params.company,'北京普源耐数电子有限公司');assert.equal(renamed.C.params.contractCompany,'北京耐数电子有限公司');assert.equal(renamed.C.params.revision,4);assert.equal(renamed.C.params.annualRate,.0385);
 console.log('Default contract checks passed: first visit, repeat visit, existing data, deletion and invalid response');
})().catch(error=>{console.error(error);process.exitCode=1;});
`;
vm.runInNewContext(source+'\n'+checks,{assert,console,process});
