/* Single-entity disclosures are derived from versioned contract schedules. */
const domesticDisclosureCompanies=['西安普源精电科技有限公司','深圳普源精电科技有限公司','北京普源耐数电子有限公司','北京耐数信息有限公司'];
const disclosureRows=[
 ['原值','一、账面原值'],['costOpening','1.期初余额',4],['costIncrease','2.本期增加金额',5],['newLease','其中：新增租赁',6],['acquisition','企业并购',7],['costDecrease','3.本期减少金额',9],['disposal','其中：处置',10],['costClosing','4.期末余额',13],
 ['折旧','二、累计折旧'],['depOpening','1.期初余额',15],['depIncrease','2.本期增加金额',16],['depCharge','其中：本期计提',17],['depDecrease','3.本期减少金额',18],['depDisposal','其中：处置',19],['depClosing','4.期末余额',22],
 ['减值','三、减值准备'],['impOpening','1.期初余额',24],['impIncrease','2.本期增加金额',25],['impCharge','其中：本期计提',26],['impDecrease','3.本期减少金额',27],['impDisposal','其中：处置',28],['impClosing','4.期末余额',29],
 ['净值','四、账面价值'],['netClosing','1.期末账面价值',31],['netOpening','2.期初账面价值',32],
];
function disclosureMinor(value){if(!Number.isFinite(value))throw new Error('计算表金额无效。');return Math.round(value*100);}
function buildDisclosure(records,company,month){
 if(!domesticDisclosureCompanies.includes(company))throw new Error('仅支持国内四家公司单体附注。');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('请选择有效的报告期间。');
 const opening=month.slice(0,4)+'-01-01',cutoff=month+'-31',sources=[];
 for(const record of Object.values(records)){
  if(record.params?.company!==company)continue;
  if(!record.result||record.params.revision!==record.result.params.revision||record.result.params.recordId!==record.id)throw new Error('本公司有尚未生成最新计算表的合同，请先完善合同参数。');
  if(record.result.params.company!==company)throw new Error('合同与计算表的承租公司不一致。');
  const p=record.result.params;
  if(p.start>cutoff)continue;
  const cost=disclosureMinor(record.result.initial.asset),values=Object.fromEntries(disclosureRows.filter(r=>r.length===3).map(([key])=>[key,0]));
  if(p.start<opening)values.costOpening=cost;else values.newLease=values.costIncrease=cost;
  values.costClosing=cost;
  for(const row of record.result.rows){
   if(row.end>cutoff)continue;
   const dep=disclosureMinor(row.depreciation);
   if(row.end<opening)values.depOpening+=dep;else values.depCharge+=dep;
  }
  values.depIncrease=values.depCharge;values.depClosing=values.depOpening+values.depCharge;
  values.netOpening=values.costOpening-values.depOpening;values.netClosing=values.costClosing-values.depClosing;
  sources.push({id:record.id,name:p.name,revision:p.revision,values:Object.fromEntries(Object.entries(values).map(([key,n])=>[key,n/100])),params:JSON.parse(JSON.stringify(p)),result:JSON.parse(JSON.stringify(record.result))});
 }
 const values=Object.fromEntries(disclosureRows.filter(r=>r.length===3).map(([key])=>[key,sources.reduce((n,s)=>n+disclosureMinor(s.values[key]),0)/100]));
 return {company,month,opening,values,sources,currency:'人民币元',basis:'单体',generatedAt:new Date().toISOString()};
}
function compareDisclosureReference(disclosure,reference,tolerance=1){
 if(!reference)return {state:'generated',label:'按计算表生成',differences:[]};
 const differences=disclosureRows.filter(row=>row.length===3&&reference[String(row[2])]!==undefined).map(([key,label,cell])=>({key,label,cell,actual:disclosure.values[key],reference:reference[String(cell)],difference:(disclosureMinor(disclosure.values[key])-disclosureMinor(reference[String(cell)]))/100})).filter(row=>row.difference!==0);
 const material=differences.filter(row=>Math.abs(row.difference)>tolerance);
 return {state:material.length?'review':'matched',label:material.length?'存在需复核差异':differences.length?'核对通过 · 分位尾差已忽略':'核对通过',differences,material};
}
