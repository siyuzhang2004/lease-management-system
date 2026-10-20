/* Liability disclosures use the contract amortization schedule, never reference balances. */
const liabilityRows=[
 ['movement','一、租赁负债变动'],['opening','期初余额'],['additions','新增租赁'],['interest','利息增加'],
 ['payments','租赁付款减少'],['fx','外币报表折算差额'],['closing','期末余额'],
 ['classification','二、列报与重分类'],['total','租赁负债合计'],['current','减：一年内到期部分'],['noncurrent','非流动租赁负债']
];
const liabilityKeys=['opening','additions','interest','payments','fx','closing','current','noncurrent','currentOpening','noncurrentOpening'];
const liabilityRound=n=>disclosureMinor(n)/100;
function liabilityBalanceSign(key){return key==='payments'?1:-1;}
function liabilityEliminationSides(value,key){
 const signed=-disclosureMinor(value)*liabilityBalanceSign(key);
 return {debit:Math.max(signed,0)/100,credit:Math.max(-signed,0)/100};
}
function liabilityPosition(record,month){
 const p=record.result.params,rows=record.result.rows;
 if(p.start.slice(0,7)>month)return {balance:0,current:0,noncurrent:0,future:[],payments:0,interest:0};
 const elapsed=rows.filter(r=>r.end.slice(0,7)<=month);
 const balance=elapsed.length?elapsed.at(-1).closingLiability:record.result.initial.liability;
 const horizon=(Number(month.slice(0,4))+1)+month.slice(4);
 const future=rows.filter(r=>r.end.slice(0,7)>month&&r.end.slice(0,7)<=horizon);
 const sum=key=>future.reduce((n,r)=>n+disclosureMinor(r[key]),0)/100;
 // Unaccrued future interest is excluded. Clamp separately for each contract.
 const current=liabilityRound(Math.min(Math.max(0,balance),Math.max(0,sum('principal'))));
 return {balance,current,noncurrent:liabilityRound(balance-current),future,payments:sum('payment'),interest:sum('interest'),horizon};
}
function buildLiabilityDisclosure(records,company,month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('请选择有效的报告期间。');
 const currencyCode=disclosureCurrency(company,records),prior=(Number(month.slice(0,4))-1)+'-12',sources=[];
 for(const record of Object.values(records)){
  if(record.params?.company!==company)continue;
  const result=record.result,p=result?.params;
  if(!p||record.params.revision!==p.revision||p.recordId!==record.id||p.company!==company)throw new Error('本公司合同计算表尚未同步，请先更新计算参数。');
  if(p.start.slice(0,7)>month)continue;
  const start=liabilityPosition(record,prior),end=liabilityPosition(record,month);
  const rows=result.rows.filter(r=>r.end.slice(0,7)>prior&&r.end.slice(0,7)<=month);
  const sum=key=>rows.reduce((n,r)=>n+disclosureMinor(r[key]),0)/100;
  const v={opening:start.balance,additions:p.start.slice(0,7)>prior?result.initial.liability:0,
   interest:sum('interest'),payments:sum('payment'),fx:0,closing:end.balance,
   current:end.current,noncurrent:end.noncurrent,currentOpening:start.current,noncurrentOpening:start.noncurrent};
  if(Math.abs(liabilityRound(v.opening+v.additions+v.interest-v.payments-v.closing))>.01)throw new Error(record.id+' 租赁负债变动未勾稽，请检查计算表。');
  sources.push({id:record.id,name:p.name,revision:p.revision,values:v,params:JSON.parse(JSON.stringify(p)),result:JSON.parse(JSON.stringify(result)),positions:{opening:start,closing:end}});
 }
 const values=Object.fromEntries(liabilityKeys.map(k=>[k,sources.reduce((n,s)=>n+disclosureMinor(s.values[k]),0)/100]));
 return {company,month,currencyCode,currency:disclosureCurrencyNames[currencyCode]||currencyCode,values,sources,basis:'单体',generatedAt:new Date().toISOString()};
}
function translateLiabilityDisclosure(original,rates=null){
 if(original.currencyCode==='CNY')return JSON.parse(JSON.stringify(original));
 rates=rates||disclosureRates(original.currencyCode,original.month);
 const sources=original.sources.map(s=>{
  const v={};
  for(const k of liabilityKeys){
   const rate=['opening','currentOpening','noncurrentOpening'].includes(k)?rates.opening:['closing','current','noncurrent'].includes(k)?rates.closing:rates.average;
   v[k]=liabilityRound(s.values[k]*rate);
  }
  v.noncurrent=liabilityRound(v.closing-v.current);
  v.noncurrentOpening=liabilityRound(v.opening-v.currentOpening);
  v.fx=liabilityRound(v.closing-v.opening-v.additions-v.interest+v.payments);
  return {...s,originalValues:{...s.values},values:v};
 });
 const values=Object.fromEntries(liabilityKeys.map(k=>[k,sources.reduce((n,s)=>n+disclosureMinor(s.values[k]),0)/100]));
 return {...original,values,sources,rates:JSON.parse(JSON.stringify(rates)),originalCurrency:original.currencyCode,currencyCode:'CNY',currency:'人民币元',translated:true};
}
function buildGroupLiability(records,month){
 const names=[...new Set(Object.values(records).map(r=>r.params.company))].filter(n=>!groupExcludedCompanies.includes(n));
 const order=Object.keys(groupCompanyLabels);names.sort((a,b)=>order.indexOf(a)-order.indexOf(b));
 const companies=names.map(company=>{
  let report;
  try{report=translateLiabilityDisclosure(buildLiabilityDisclosure(records,company,month));}
  catch(e){throw new Error((groupCompanyLabels[company]||company)+'：'+e.message);}
  return {company,label:groupCompanyLabels[company]||company,report,eliminated:groupEliminatedCompanies.includes(company)};
 });
 const eliminations=companies.filter(c=>c.eliminated);
 const before={},debit={},credit={},values={};
 for(const key of liabilityKeys){
  const sum=companies.reduce((n,c)=>n+disclosureMinor(c.report.values[key]),0);
  const adjustments=eliminations.map(c=>liabilityEliminationSides(c.report.values[key],key));
  // Balances/increases are credit-normal; repayments are debit-normal movements.
  before[key]=sum/100;debit[key]=adjustments.reduce((n,v)=>n+disclosureMinor(v.debit),0)/100;
  credit[key]=adjustments.reduce((n,v)=>n+disclosureMinor(v.credit),0)/100;
  values[key]=liabilityRound(before[key]+liabilityBalanceSign(key)*(debit[key]-credit[key]));
 }
 return {company:'普源集团',month,currencyCode:'CNY',currency:'人民币元',translated:true,basis:'合并',companies,eliminations,before,debit,credit,values};
}
function liabilityFormula(data,key,opening=false){
 const v=data.values;
 const definitions={
  closing:[['opening',1,'期初余额'],['additions',1,'新增租赁'],['interest',1,'利息增加'],['payments',-1,'租赁付款减少'],['fx',1,'外币报表折算差额']],
  fx:[['closing',1,'期末余额'],['opening',-1,'期初余额'],['additions',-1,'新增租赁'],['interest',-1,'利息增加'],['payments',1,'租赁付款减少']],
  noncurrent:[['closing',1,'期末余额'],['current',-1,'一年内到期部分']],
  noncurrentOpening:[['opening',1,'期初余额'],['currentOpening',-1,'期初一年内到期部分']]
 };
 if(key==='total')key=opening?'opening':'closing';
 const terms=definitions[key];
 return terms?{terms:terms.map(([k,sign,label])=>({key:k,sign,label,value:v[k]})),value:v[key]}:null;
}
function compareLiabilityReference(data,reference){
 if(!reference)return {label:'按合同计算表生成',state:'generated',differences:[]};
 const differences=Object.entries(reference.values).map(([key,value])=>({key,actual:data.values[key],reference:value,difference:liabilityRound(data.values[key]-value)})).filter(x=>x.difference!==0);
 const material=differences.filter(x=>Math.abs(x.difference)>1);
 return {label:material.length?'存在核对差异':differences.length?'核对通过 · 分位尾差已忽略':'核对通过',state:material.length?'review':'matched',differences,material};
}
