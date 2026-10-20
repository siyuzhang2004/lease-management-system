/* Seed only a browser that has never had a contract workspace. */
async function seedDefaultLease(storage,records,loadDefault){
 const key='leaseContracts.v1',marker='leaseDefaultContract.v1';
 if(Object.keys(records).length||storage.getItem(key)!==null||storage.getItem('leaseDeletedContracts.v1')!==null||storage.getItem(marker)!==null){storage.setItem(marker,'1');return null;}
 const record=await loadDefault();
 if(!record||typeof record.id!=='string'||record.params?.recordId!==record.id||record.result?.params?.recordId!==record.id)throw new Error('默认合同数据不完整。');
 records[record.id]=record;
 storage.setItem(key,JSON.stringify(records));storage.setItem(marker,'1');return record.id;
}

const overseasCompanyNames={
 'リゴルジャパン株式会社':'ディー・エイチ・エル・ジャパン株式会社',
 'リゴルジャパン株式会社 RIGOL JAPAN CO., LTD.':'ディー・エイチ・エル・ジャパン株式会社',
 '日本':'ディー・エイチ・エル・ジャパン株式会社',
 'Rigol US':'RIGOL TECHNOLOGIES, USA INC.',
 '美国':'RIGOL TECHNOLOGIES, USA INC.',
 '韩国':'RIGOL KOREA CO,. LTD.',
 '马来西亚':'RIGOL TECHNOLOGIES（MALAYSIA）SDN.BHD.',
 '欧洲':'RIGOL TECHNOLOGIES EU GmbH'
};
// Company-name corrections are metadata only; keep amounts and revisions intact.
function normalizeOverseasCompanyMetadata(value){
 if(!value||typeof value!=='object')return;
 for(const [key,item] of Object.entries(value)){
  if(key==='company'&&typeof item==='string'&&overseasCompanyNames[item])value[key]=overseasCompanyNames[item];
  else if(item&&typeof item==='object')normalizeOverseasCompanyMetadata(item);
 }
}
async function normalizeWorkspaceCompanyNames(records,recalculate){
 normalizeOverseasCompanyMetadata(records);
 for(const key of typeof localStorage==='undefined'?[]:['leaseDeletedContracts.v1','leaseDisclosures.v1','leaseDisclosureSelection.v1']){
  const raw=localStorage.getItem(key);if(!raw)continue;
  try{const value=JSON.parse(raw);normalizeOverseasCompanyMetadata(value);const updated=JSON.stringify(value);if(updated!==raw)localStorage.setItem(key,updated);}catch(error){console.error('公司名称更新失败',key,error);}
 }
 const names={'西安普源':'西安普源精电科技有限公司','深圳普源':'深圳普源精电科技有限公司','耐数电子':'北京普源耐数电子有限公司','北京耐数电子有限公司':'北京普源耐数电子有限公司','耐数信息':'北京耐数信息有限公司'};
 for(const record of Object.values(records)){
  if(!record.params||!names[record.params.company])continue;
  const params=JSON.parse(JSON.stringify(record.params));
  if(params.company==='北京耐数电子有限公司')params.contractCompany=params.contractCompany||params.company;
  params.company=names[params.company];params.revision++;
  try{const result=await recalculate(params);record.params=result.params;record.result=result;if(record.financialParameters)record.financialParameters.company=params.company;}
  catch(error){console.error('公司全称更新失败',record.id,error);}
 }
}
