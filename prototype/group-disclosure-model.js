/* Consolidation uses the same company disclosures, translated to CNY before elimination. */
const groupExcludedCompanies=['RIGOL TECHNOLOGIES（MALAYSIA）SDN.BHD.'];
const groupEliminatedCompanies=['北京普源耐数电子有限公司','北京耐数信息有限公司'];
const groupCompanyLabels={
 '西安普源精电科技有限公司':'西安普源','深圳普源精电科技有限公司':'深圳普源',
 '北京普源耐数电子有限公司':'耐数电子','北京耐数信息有限公司':'耐数信息',
 'ディー・エイチ・エル・ジャパン株式会社':'日本公司','RIGOL TECHNOLOGIES, USA INC.':'美国公司',
 'RIGOL KOREA CO,. LTD.':'韩国公司','RIGOL TECHNOLOGIES EU GmbH':'欧洲公司'
};
const disclosureGroups={
 rigol:{id:'rigol',name:'普源集团',members:null,excluded:groupExcludedCompanies,eliminated:groupEliminatedCompanies,
  caption:'暂不含马来西亚',description:'耐数电子、耐数信息的租赁全额抵消；马来西亚暂不纳入。海外公司折算人民币后汇总。'},
 naishu:{id:'naishu',name:'耐数集团',members:['北京普源耐数电子有限公司','北京耐数信息有限公司'],excluded:[],eliminated:[],
  caption:'耐数电子 · 耐数信息',description:'耐数电子持有耐数信息 100% 股权。出租方不在耐数集团合并范围内，两家公司的租赁均不抵消。'}
};
function disclosureGroup(id='rigol'){
 if(!Object.hasOwn(disclosureGroups,id))throw new Error('未知的合并范围');
 return disclosureGroups[id];
}
function groupMembers(records,scope){
 const names=[...new Set(Object.values(records).map(r=>r.params.company))]
  .filter(n=>scope.members?scope.members.includes(n):!scope.excluded.includes(n));
 const order=Object.keys(groupCompanyLabels),rank=n=>order.includes(n)?order.indexOf(n):999;
 return names.sort((a,b)=>rank(a)-rank(b));
}
function groupDetailRoute(type,id='rigol'){
 disclosureGroup(id);
 return '#'+(type==='asset'?'disclosures':'liabilities')+'/group/'+(id==='rigol'?'':id+'/')+'detail';
}
function groupBalanceSign(key){return /^(dep|imp)/.test(key)?-1:1;}
function groupEliminationSides(entry,key){
 // Net book value retains gross debit/credit eliminations, as in the trial balance.
 const keys=key.startsWith('net')?['cost','dep','imp'].map(p=>p+key.slice(3)):[key];
 let debit=0,credit=0;
 for(const field of keys){
  const signed=disclosureMinor(entry.values[field])*groupBalanceSign(field);
  debit+=Math.max(signed,0);credit+=Math.max(-signed,0);
 }
 return {debit:debit/100,credit:credit/100};
}
function buildGroupDisclosure(records,month,groupId='rigol'){
 const scope=disclosureGroup(groupId),names=groupMembers(records,scope);
 const companies=names.map(company=>{
  let report;
  try{report=buildDisclosure(records,company,month);if(report.currencyCode!=='CNY')report=translateDisclosure(report);}
  catch(e){throw new Error((groupCompanyLabels[company]||company)+'：'+e.message);}
  return {company,label:groupCompanyLabels[company]||company,report,eliminated:scope.eliminated.includes(company)};
 });
 const keys=disclosureRows.filter(r=>r.length===3).map(r=>r[0]);
 const eliminations=companies.filter(c=>c.eliminated).map(c=>({company:c.company,label:c.label,
  reason:'集团内部租赁，全额抵消',values:Object.fromEntries(keys.map(key=>[key,-c.report.values[key]]))}));
 const values={},before={},debit={},credit={};
 for(const key of keys){
  const sum=companies.reduce((n,c)=>n+disclosureMinor(c.report.values[key]),0),sign=groupBalanceSign(key);
  const dr=eliminations.reduce((n,e)=>n+disclosureMinor(groupEliminationSides(e,key).debit),0);
  const cr=eliminations.reduce((n,e)=>n+disclosureMinor(groupEliminationSides(e,key).credit),0);
  before[key]=sum/100;debit[key]=dr/100;credit[key]=cr/100;values[key]=(sum+sign*(dr-cr))/100;
 }
 return {month,groupId,scope,company:scope.name,basis:'合并',currency:'人民币元',currencyCode:'CNY',translated:true,
  companies,eliminations,before,debit,credit,values,excluded:[...scope.excluded]};
}
function compareGroupReference(data,reference){
 if(!reference)return {state:'generated',label:'按当前数据生成',differences:[]};
 const differences=Object.entries(reference.expected).map(([key,value])=>({key,actual:data.values[key],reference:value,
  difference:(disclosureMinor(data.values[key])-disclosureMinor(value))/100})).filter(r=>r.difference!==0);
 const material=differences.filter(r=>Math.abs(r.difference)>1);
 return {state:material.length?'review':'matched',label:material.length?'存在待核对差异':'核对通过',differences,material};
}
