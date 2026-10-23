/* Contract is the aggregate root. Parameters and calculation are separate routes. */
let leaseRecords={},activeLeaseId=null,leaseRoute='contracts',contractListScroll=0;
function navigateContractUrl(url){if(location.hash!==url)history[location.hash?'pushState':'replaceState'](null,'',url);}
const contractStorageKey='leaseContracts.v1';
function persistContracts(){try{localStorage.setItem(contractStorageKey,JSON.stringify(leaseRecords));}catch{toast('浏览器保存失败，请检查浏览器的本地存储设置。');}}
function activeLease(){return leaseRecords[activeLeaseId];}
function contractInfo(record){const p=record.params||record.financialParameters||{};return {name:p.name||'未命名合同',company:p.company||'',lessor:p.lessor||'',start:p.availableDate||p.start||'',end:p.end||''};}
function hideLeaseViews(){document.querySelectorAll('main').forEach(m=>m.hidden=true);closeDrawer();}
function routeUrl(id,page){return '#contract/'+encodeURIComponent(id)+'/'+page;}
function contextHeader(record,page){const i=contractInfo(record);return `<div class="contract-back-bar"><button class="ghost contract-back-button" data-contract-list>← 返回合同台账</button>${typeof disclosureBackLink==='function'?disclosureBackLink(record.id):''}${typeof liabilityBackLink==='function'?liabilityBackLink(record.id):''}<span>合同台账 / ${esc(record.id)}</span></div><div class="contract-context"><div><h1>${esc(i.name)}</h1><p>${esc(i.company)} · ${esc(i.lessor)} · ${esc(i.start)} 至 ${esc(i.end)}</p></div><span class="badge yellow">合同档案</span></div><div class="contract-steps">${[['overview','01','合同概览'],['parameters','02','计算参数'],['calculation','03','计算表']].map(([key,num,label])=>`<button data-contract-route="${key}" class="${page===key?'active':''}"><span>${num}</span>${label}</button>`).join('<i>→</i>')}</div>`;}
function bindContractContext(root){root.querySelectorAll('[data-disclosure-return]').forEach(b=>b.onclick=()=>showDisclosureDetail(disclosureSelection.company,true));root.querySelectorAll('[data-contract-list]').forEach(b=>b.onclick=showContractList);root.querySelectorAll('[data-contract-route]').forEach(b=>b.onclick=()=>showContractPage(activeLeaseId,b.dataset.contractRoute));}
function showContractList(){
 hideLeaseViews();leaseRoute='contracts';navigateContractUrl('#contracts');$('#contractListView').hidden=false;document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page==='contracts'));
 14→ const rows=Object.values(leaseRecords);$('#contractListBody').innerHTML=rows.map(record=>{const i=contractInfo(record),p=record.params,ready=p&&record.result?.params.revision===p.revision;return `<tr><td class="contract-company"><strong>${esc(i.company)}</strong></td><td><strong>${esc(i.name)}</strong><small>${esc(record.id)}</small></td><td>${esc(i.start)}<small>至 ${esc(i.end)}</small></td><td>${p?'V'+p.revision:'待完善'}<small>${p?(p.calendarTerms?'自然季度预付':p.paymentSchedule?p.paymentSchedule.rents.length+' 个租金所属月份':(p.rentPhases||p.stages).length+' 个租金阶段'):'填写合同财务参数'}</small></td><td>${ready?'<span class="badge green">已自动生成</span>':p?'<span class="badge yellow">待更新</span>':'待生成'}<small>${record.result?'计算表 V'+record.result.params.revision:'根据本合同参数生成'}</small></td><td><button class="link" data-open-contract="${esc(record.id)}" data-destination="overview">合同概览</button><button class="link" data-open-contract="${esc(record.id)}" data-destination="parameters">参数</button><button class="link" data-open-contract="${esc(record.id)}" data-destination="calculation">计算表</button><button class="link" data-copy-contract="${esc(record.id)}">复制</button><button class="link" data-delete-contract="${esc(record.id)}">删除</button></td></tr>`;}).join('');
 15→ if(!rows.length)$('#contractListBody').innerHTML='<tr><td colspan=6 class=contract-empty>暂无合同，请新增合同后填写计算参数。</td></tr>';$('#contractListBody').querySelectorAll('[data-delete-contract]').forEach(b=>b.onclick=()=>deleteLeaseContract(b.dataset.deleteContract));$('#contractListBody').querySelectorAll('[data-copy-contract]').forEach(b=>b.onclick=()=>copyLeaseContract(b.dataset.copyContract));$('#contractListCount').textContent=rows.length+' 份合同';$('#contractListBody').querySelectorAll('[data-open-contract]').forEach(b=>b.onclick=()=>showContractPage(b.dataset.openContract,b.dataset.destination));window.scrollTo(0,contractListScroll);
}
async function showContractPage(id,page='overview'){
 const record=leaseRecords[id];if(!record)return showContractList();
 if(leaseRoute==='contracts')contractListScroll=window.scrollY;
 activeLeaseId=id;leaseRoute=page;hideLeaseViews();navigateContractUrl(routeUrl(id,page));localStorage.setItem('leaseSelectedContract',id);
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page==='contracts'));
 if(page==='overview'){
  const i=contractInfo(record),view=$('#contractDetailView');view.hidden=false;
  view.innerHTML=contextHeader(record,page)+`<section class="content contract-overview"><h2>合同档案</h2><div class="contract-info-grid">${[['合同编号',id],['承租公司',i.company],...(record.params?.contractCompany?[['合同签署时名称',record.params.contractCompany]]:[]),['出租方',i.lessor],['合同期间',i.start+' 至 '+i.end]].map(([k,v])=>`<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div></section><section class="contract-flow-cards"><article class="content"><span>02 / 合同专属参数</span><h2>${record.params?'计算参数 V'+record.params.revision:'待完善计算参数'}</h2><p>租赁期限、分阶段付款额、支付期和年利率均保存在本合同下。</p><button class="primary" data-contract-route="parameters">查看／修改参数 →</button></article><article class="content"><span>03 / 合同专属计算表</span><h2>${record.result?'计算表 V'+record.result.params.revision:'等待参数生成'}</h2><p>参数更新后自动生成本合同的新计算表；表内可回看对应参数。</p><button class="ghost" data-contract-route="calculation">查看计算表 →</button></article></section>`;
  bindContractContext(view);window.scrollTo(0,0);return;
 }
 if(!record.params){openContractEntry(record);return;}
 buildCalcView();const switched=calcParams?.recordId!==id;
 if(switched){clearTimeout(calcAutoTimer);calcParams=clone(record.params);calcResult=record.result||null;calcReverseReport=record.reverseReport||null;calcChanged=!calcResult||calcResult.params.revision!==calcParams.revision;}
 calcFromContract=true;const view=$('#calculationView');view.hidden=false;view.dataset.contractPage=page;
 let context=$('#calcContractContext');if(!context){context=document.createElement('div');context.id='calcContractContext';view.prepend(context);}context.innerHTML=contextHeader(record,page);bindContractContext(context);
 view.querySelector('.page-heading').hidden=true;view.querySelector('.calc-policy').hidden=page!=='parameters';
 view.querySelector('.calc-params').hidden=page!=='parameters';view.querySelector('.calc-rent').hidden=page!=='parameters';
 $('#calcLoadSample').hidden=true;$('#calcReturn').hidden=true;
 $('#calcGenerate').className='ghost';$('#calcGenerate').textContent='重新计算';
 renderCalcParams();$('#calcReturn').hidden=true;
 renderContractAdvanced();if(typeof renderParameterLock==='function')renderParameterLock();$('#contractAdvancedSection').hidden=page!=='parameters';
 $('#calcOutput').hidden=page!=='calculation'||!calcResult;
 if(calcResult)renderCalcResults();
 let empty=$('#contractCalcPending');if(!empty){empty=document.createElement('div');empty.id='contractCalcPending';empty.className='content contract-empty';$('#calcOutput').before(empty);}empty.hidden=page!=='calculation'||!!calcResult;
 empty.innerHTML='<h2>正在根据本合同参数生成计算表</h2><p>若参数尚未填写完整，请返回参数页补充。参数更新后会自动重算。</p><button class="ghost" id="contractFixParameters">返回本合同参数</button>';$('#contractFixParameters').onclick=()=>showContractPage(id,'parameters');
  syncCalcLinkStatus();if(calcChanged||!calcResult)await runLeaseCalculation();$('#calcGenerate').textContent='重新计算';window.scrollTo(0,0);
}

// Persist the contract's parameter record as soon as it changes, retaining old results until new ones succeed.
const originalMarkCalcChanged=markCalcChanged;
markCalcChanged=function(){originalMarkCalcChanged();const record=activeLease();if(record&&calcParams.recordId===record.id){record.params=clone(calcParams);persistContracts();}syncCalcLinkStatus();};
saveCalcRecord=function(){const record=leaseRecords[calcResult?.params.recordId];if(!record)return;record.params=clone(calcResult.params);record.result=clone(calcResult);record.reverseReport=calcReverseReport;record.updatedAt=new Date().toISOString();persistContracts();if(leaseRoute==='parameters')$('#calcOutput').hidden=true;else if(leaseRoute==='calculation'){$('#calcOutput').hidden=false;$('#contractCalcPending').hidden=true;}syncCalcLinkStatus();};
restoreCalcRecord=function(){return false;};
syncCalcLinkStatus=function(){
 if(!calcParams||!$('#calcLinkStatus'))return;const same=calcResult?.params.recordId===calcParams.recordId,ready=same&&!calcChanged;
 const needsReview=$('#calcError')&&!$('#calcError').hidden;
 $('#calcLinkStatus').innerHTML=`<span><b>所属合同 ${esc(activeLeaseId||calcParams.recordId)}</b>　参数 V${calcParams.revision} → 计算表 V${same?calcResult.params.revision:'—'}</span><strong class="${ready?'calc-link-synced':'calc-link-pending'}">${ready?'已按当前参数自动生成':needsReview?'参数需复核 · 尚未生成新版':'参数更新中 · 自动生成计算表'}</strong><button class="link" id="contractSwitchPage">${leaseRoute==='calculation'?'查看／修改本合同参数 →':'查看本合同计算表 →'}</button>`;
 $('#contractSwitchPage').onclick=()=>showContractPage(activeLeaseId,leaseRoute==='calculation'?'parameters':'calculation');
};
const originalShowCalcError=showCalcError;
showCalcError=function(message){originalShowCalcError(message);syncCalcLinkStatus();};
const originalRenderCalcResults=renderCalcResults;
renderCalcResults=function(){originalRenderCalcResults();if(leaseRoute==='parameters')$('#calcOutput').hidden=true;};
openCalcSource=function(period,key){
 if(!calcResult)return;
 if(calcResult.params.calendarTerms)return openCalendarSource(period);
 if(calcResult.params.paymentSchedule)return openScheduledSource(period);const p=calcResult.params,r=calcResult.rows.find(x=>x.period===period),stage=calcResult.stages.findIndex(s=>r&&s.fromPeriod<=period&&s.toPeriod>=period);
 const coveredStage=calcResult.stages[stage],phaseIndex=coveredStage?.sourcePhase??stage;
 const paying=[...new Set(calcResult.stages.map((s,i)=>s.paymentPeriod===period?(s.sourcePhase??i):-1).filter(i=>i>=0))];
 openDrawer(period?`第${period}期 · 本合同参数来源`:'本计算表的合同参数',`<div class="detail-banner"><small>所属合同 ${esc(p.recordId)} · 参数 V${p.revision}</small><strong>${esc(p.company)}</strong><small>${esc(p.name)}</small></div><div class="detail-grid">${[['租赁开始日',p.start],['租赁结束日',p.end],['计算期数',p.months+'期'],['年利率',(p.annualRate*100).toFixed(2)+'%'],['税率',(p.taxRate*100).toFixed(2)+'%'],['本期约定付款来源',paying.length?paying.map(i=>'第'+(i+1)+'阶段').join('、'):'本期没有约定付款']].map(([label,v])=>`<div><label>${label}</label><p>${esc(v)}</p></div>`).join('')}</div>${period?`<p class="helper">第${period}期 ${esc(r.start)} 至 ${esc(r.end)}。本期月租金对应第${phaseIndex+1}阶段；付款可能对应下一阶段，按合同约定支付期确定。</p>`:''}<p class="helper">本页展示生成这张计算表所使用的参数。请前往本合同的参数页调整，更新后自动生成新的计算表。</p>`, '前往本合同参数页',()=>{closeDrawer();showContractPage(p.recordId,'parameters').then(()=>{const input=phaseIndex>=0?$(`#calcStages [data-phase="${phaseIndex}"][data-phase-field="gross"]`):$('[data-calc=annualRate]');input?.scrollIntoView({behavior:'smooth',block:'center'});input?.focus({preventScroll:true});});},'合同 → 参数 → 计算表');
};
showLeaseCalculation=async function(params=null){
 if(!params)return showContractPage(activeLeaseId||localStorage.getItem('leaseSelectedContract')||Object.keys(leaseRecords)[0],'calculation');
 const id=leaseEditingId||'LS-'+new Date().getFullYear()+'-'+crypto.randomUUID().slice(0,8).toUpperCase(),existing=leaseRecords[id];
 params.recordId=id;params.contractId=id;params.revision=(existing?.params?.revision||0)+1;
 leaseRecords[id]={...existing,id,params,financialParameters:leaseDraft?clone(leaseDraft):existing?.financialParameters,result:existing?.result||null};leaseDirty=false;persistContracts();calcParams=null;
 await showContractPage(id,'calculation');
};

const originalOpenLeaseEditor=openLeaseEditor;
function openContractEntry(record){hideLeaseViews();originalOpenLeaseEditor(record?.financialParameters?{id:record.id,financialParameters:record.financialParameters}:undefined);leaseEditingId=record?.id||null;activeLeaseId=record?.id||null;leaseRoute='entry';history.replaceState(null,'',record?routeUrl(record.id,'parameters'):'#contract/new');$('#lfGenerate').textContent='保存参数并查看计算表';$('#leaseEditor .lf-actions span').textContent='保存合同参数后，系统自动生成本合同计算表。';}
saveLeaseDraft=function(){const errors=validateLeaseDraft(false);showLeaseErrors(errors);if(errors.length)return;const id=leaseEditingId||'LS-'+new Date().getFullYear()+'-'+crypto.randomUUID().slice(0,8).toUpperCase();leaseEditingId=id;leaseRecords[id]={...leaseRecords[id],id,financialParameters:clone(leaseDraft)};persistContracts();prepareCalculationFromContract();};
closeLeaseEditor=function(){if($('#leaseEditor'))$('#leaseEditor').hidden=true;};
const originalRequestCloseLease=requestCloseLease;
requestCloseLease=function(afterClose){originalRequestCloseLease(()=>{if(afterClose)afterClose();else activeLeaseId?showContractPage(activeLeaseId,'overview'):showContractList();});};
function createManualLease(){
  const id='LS-'+new Date().getFullYear()+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
  leaseRecords[id]={id,parametersLocked:false,params:{recordId:id,contractId:id,revision:1,company:'',name:'',lessor:'',availableDate:'',freeStart:'',freeEnd:'',start:'',end:'',months:0,annualRate:'',taxRate:'',area:0,deposit:0,assetAdjustment:0,displayMode:'auto',policy:'按合同约定及公司核算口径计量。',stages:[],rentPhases:[{months:'',gross:'',frequency:0,timing:'advance',monthlyNet:0,monthlyTail:0}]},result:null};persistContracts();calcParams=null;showContractPage(id,'parameters');
  }
+function copyLeaseContract(id){
+  const source=leaseRecords[id];
+  if(!source)return toast('来源合同不存在');
+  const nid='LS-'+new Date().getFullYear()+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
+  // Deep clone params but keep a new recordId/contractId and reset revision
+  const params=clone(source.params||source.financialParameters||{});
+  params.recordId=nid;params.contractId=nid;params.revision=(params.revision||0)+1;params.name=(params.name||'复制合同')+' (复制)';
+  leaseRecords[nid]={id:nid,parametersLocked:false,params,financialParameters:clone(source.financialParameters||null),result:null};
+  persistContracts();toast('已复制合同 '+id+' → '+nid);
+  showContractPage(nid,'parameters');
+}function deleteLeaseContract(id){
 const record=leaseRecords[id];if(!record)return;
 openDrawer('删除合同',`<p class="helper">删除合同 ${esc(id)} 及其参数、计算表。删除后可在“已删除合同”中恢复。</p>`,'删除合同',()=>{const deleted=JSON.parse(localStorage.getItem('leaseDeletedContracts.v1')||'{}');deleted[id]=record;localStorage.setItem('leaseDeletedContracts.v1',JSON.stringify(deleted));delete leaseRecords[id];clearTimeout(calcAutoTimer);calcPendingRefresh=false;calcParams=null;calcResult=null;activeLeaseId=null;persistContracts();showContractList();toast('合同已删除。');},'合同管理');
}
function showDeletedLeases(){
 const deleted=JSON.parse(localStorage.getItem('leaseDeletedContracts.v1')||'{}');
 openDrawer('已删除合同',Object.values(deleted).map(record=>`<div class="calc-trace-stage"><h3>${esc(contractInfo(record).name)}</h3><p>${esc(record.id)}</p><button class="ghost" data-restore-contract="${esc(record.id)}">恢复合同</button></div>`).join('')||'<p class="helper">暂无已删除合同。</p>');
 $('#drawerBody').querySelectorAll('[data-restore-contract]').forEach(button=>button.onclick=()=>{const id=button.dataset.restoreContract;leaseRecords[id]=deleted[id];delete deleted[id];localStorage.setItem('leaseDeletedContracts.v1',JSON.stringify(deleted));persistContracts();showContractList();});
}
async function initContractWorkspace(){
 const list=document.createElement('main');list.id='contractListView';list.hidden=true;list.innerHTML=`<div class="page-heading"><div><div class="breadcrumb">财务管理 / 合同台账</div><h1>租赁合同台账</h1><p>以合同为单位管理财务参数与计算表，每份合同独立计算、相互隔离。</p></div><div class="calc-heading-actions"><button class="ghost" id="workspaceDeletedContracts">已删除合同</button><button class="primary" id="workspaceNewContract">＋ 新增合同</button></div></div><div class="contract-workflow-hint"><b>合同档案</b><span>→</span><b>计算参数</b><span>→</span><b>计算表</b><small>参数更新，自动生成该合同的新计算表；在计算表中可回看本合同参数。</small></div><section class="content"><div class="section-caption"><b>合同列表</b><small id="contractListCount"></small></div><div class="table-wrap"><table><thead><tr><th>承租公司</th><th>租赁项目 / 合同编号</th><th>合同期间</th><th>计算参数</th><th>计算表</th><th>操作</th></tr></thead><tbody id="contractListBody"></tbody></table></div></section>`;document.body.append(list);const detail=document.createElement('main');detail.id='contractDetailView';detail.hidden=true;document.body.append(detail);
 $('#workspaceNewContract').onclick=createManualLease;$('#workspaceDeletedContracts').onclick=showDeletedLeases;
 $('.demo').textContent='合同核算';$('.drawer-foot span').textContent='参数按合同保存';
 const menu=$('aside');menu.querySelectorAll('[data-page]').forEach(b=>b.remove());const menuButton=document.createElement('button');menuButton.dataset.page='contracts';menuButton.innerHTML='<span>▤</span>合同台账';menu.querySelector('.menu-label').after(menuButton);menuButton.onclick=()=>{if(leaseRoute==='entry'&&leaseDirty)requestCloseLease(showContractList);else showContractList();};
 document.querySelectorAll('[data-top]').forEach(b=>b.onclick=showContractList);
 $('#primary').onclick=()=>openContractEntry();
 try{leaseRecords=JSON.parse(localStorage.getItem(contractStorageKey)||'{}');}catch{leaseRecords={};}
 await seedDefaultLease(localStorage,leaseRecords,async()=>await(await calcApi('/api/default-contract')).json());
 try{const response=await calcApi('/api/workspace-contracts');if(response.ok){const localRecords=await response.json(),deleted=JSON.parse(localStorage.getItem('leaseDeletedContracts.v1')||'{}');for(const record of localRecords){if(!leaseRecords[record.id]&&!deleted[record.id])leaseRecords[record.id]=record;}persistContracts();}}catch(error){toast('本地合同加载失败：'+error.message);}
 await normalizeWorkspaceCompanyNames(leaseRecords,async params=>{const response=await calcApi('/api/calculate',params);if(!response.ok)throw new Error((await response.json()).error);return response.json();});persistContracts();
 await initDisclosures();
 const match=location.hash.match(/^#contract\/([^/]+)\/(overview|parameters|calculation)$/);if(routeDisclosures()){}else if(match)await showContractPage(decodeURIComponent(match[1]),match[2]);else showContractList();
}
window.addEventListener('popstate',()=>{const match=location.hash.match(/^#contract\/([^/]+)\/(overview|parameters|calculation)$/);if(routeDisclosures()){}else if(match)showContractPage(decodeURIComponent(match[1]),match[2]);else showContractList();});
initContractWorkspace().catch(e=>{toast('合同工作台加载失败：'+e.message);});
