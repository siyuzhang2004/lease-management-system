/* Seed only a browser that has never had a contract workspace. */
async function seedDefaultLease(storage,records,loadDefault){
 const key='leaseContracts.v1',marker='leaseDefaultContract.v1';
 if(Object.keys(records).length||storage.getItem(key)!==null||storage.getItem('leaseDeletedContracts.v1')!==null||storage.getItem(marker)!==null){storage.setItem(marker,'1');return null;}
 const record=await loadDefault();
 if(!record||typeof record.id!=='string'||record.params?.recordId!==record.id||record.result?.params?.recordId!==record.id)throw new Error('默认合同数据不完整。');
 records[record.id]=record;
 storage.setItem(key,JSON.stringify(records));storage.setItem(marker,'1');return record.id;
}

async function normalizeWorkspaceCompanyNames(records,recalculate){
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
