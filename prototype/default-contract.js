/* Seed only a browser that has never had a contract workspace. */
async function seedDefaultLease(storage,records,loadDefault){
 const key='leaseContracts.v1',marker='leaseDefaultContract.v1';
 if(Object.keys(records).length||storage.getItem(key)!==null||storage.getItem('leaseDeletedContracts.v1')!==null||storage.getItem(marker)!==null){storage.setItem(marker,'1');return null;}
 const record=await loadDefault();
 if(!record||typeof record.id!=='string'||record.params?.recordId!==record.id||record.result?.params?.recordId!==record.id)throw new Error('默认合同数据不完整。');
 records[record.id]=record;
 storage.setItem(key,JSON.stringify(records));storage.setItem(marker,'1');return record.id;
}
