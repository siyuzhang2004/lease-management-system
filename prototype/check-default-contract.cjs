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
 console.log('Default contract checks passed: first visit, repeat visit, existing data, deletion and invalid response');
})().catch(error=>{console.error(error);process.exitCode=1;});
`;
vm.runInNewContext(source+'\n'+checks,{assert,console,process});
