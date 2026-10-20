let groupDisclosureId='rigol';
let groupDisclosureData=null,groupDisclosureReferences={},groupCompanyExpanded=false,groupEliminationExpanded=false;
async function initGroupDisclosures(){
 try{const r=await calcApi('/api/disclosure-group-reference');if(r.ok)groupDisclosureReferences=await r.json();}catch{}
 const view=document.createElement('main');view.id='groupDisclosureView';view.hidden=true;
 view.innerHTML=`<div class="page-heading"><div><div class="breadcrumb">财务管理 / 使用权资产附注</div><h1>使用权资产附注</h1></div><span class="badge yellow">合并 · 人民币元</span></div>
 <section class="content disclosure-filters group-filters"><label>报告期末<input id="groupDisclosureMonth" type="month"></label><div class="group-scope"><b>普源集团</b><span>暂不含马来西亚</span></div></section>
 <div id="groupDisclosureStatus" class="disclosure-status" role="status"></div>
 <section class="metrics disclosure-metrics" id="groupDisclosureMetrics"></section>
 <section class="content group-report"><div class="section-caption"><div><b>合并试算明细</b><small id="groupDisclosurePeriod"></small></div><div class="group-expand-controls"><button class="ghost" id="groupExpandCompanies" aria-expanded="false">＋ 公司明细</button><button class="ghost" id="groupExpandEliminations" aria-expanded="false">＋ 抵消明细</button></div></div><div class="group-table-scroll"><table class="group-table" id="groupDisclosureTable"></table></div></section>
 <details class="group-reconciliation"><summary>期间核对与合并范围</summary><div id="groupDisclosureReconciliation"></div></details>`;
 document.body.append(view);
 $('#groupDisclosureMonth').onchange=e=>{disclosureSelection.month=e.target.value;renderGroupDisclosure();};
 mountDisclosureMonth($('#groupDisclosureMonth'));
 $('#groupExpandCompanies').onclick=()=>{groupCompanyExpanded=!groupCompanyExpanded;renderGroupDisclosure();};
 $('#groupExpandEliminations').onclick=()=>{groupEliminationExpanded=!groupEliminationExpanded;renderGroupDisclosure();};
 $('#groupDisclosureTable').onclick=e=>{
  const amount=e.target.closest('[data-group-key]');if(!amount||!groupDisclosureData)return;
  if(amount.dataset.groupCompany!==undefined)return openGroupCompany(Number(amount.dataset.groupCompany));
  openGroupDisclosureSources(amount.dataset.groupKey,amount.dataset.groupKind);
 };

}
function showGroupDisclosures(groupId='rigol'){
 disclosureGroup(groupId);groupDisclosureId=groupId;groupCompanyExpanded=false;groupEliminationExpanded=false;
 closeDisclosurePickers();hideLeaseViews();leaseRoute='group-disclosures';navigateContractUrl(groupDetailRoute('asset',groupId));
 $('#groupDisclosureView').hidden=false;
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page==='disclosures'));
 syncDisclosureScope('asset','group','',true);
 renderGroupDisclosure();window.scrollTo(0,0);
}
function openGroupCompany(index){
 const company=groupDisclosureData.companies[index].company;
 closeDrawer();showDisclosureDetail(company);
}
function groupAmount(key,value,kind,index){
 return `<button class="group-amount" data-group-key="${key}" data-group-kind="${kind}" ${index!==undefined?`data-group-company="${index}"`:''}>${disclosureMoney(value)}<span aria-hidden="true">↗</span></button>`;
}
function renderGroupDisclosure(){
 $('#groupDisclosureMonth').value=disclosureSelection.month;syncDisclosurePickers();
 localStorage.setItem('leaseDisclosureSelection.v1',JSON.stringify(disclosureSelection));
 try{
  const scope=disclosureGroup(groupDisclosureId);
  $('#groupDisclosureView .group-scope').innerHTML=`<b>${scope.name}</b><span>${scope.caption}</span>`;
  const d=buildGroupDisclosure(leaseRecords,disclosureSelection.month,groupDisclosureId);groupDisclosureData=d;
  if(!d.companies.length)throw new Error('当前没有可纳入合并的合同。');
  const ref=d.groupId==='rigol'?groupDisclosureReferences[d.month]:null,check=compareGroupReference(d,ref);
  $('#groupDisclosureStatus').className='disclosure-status '+(check.state==='review'?'review':'');
  $('#groupDisclosureStatus').textContent=`${d.companies.length} 家公司 · ${d.eliminations.length?d.eliminations.length+' 家内部租赁全额抵消':'无合并抵消'} · ${check.label}`;
  $('#groupDisclosureMetrics').innerHTML=[['期初账面价值','netOpening'],['本期计提折旧','depCharge'],['期末账面价值','netClosing']].map(([title,key])=>metric(title,disclosureMoney(d.values[key]),'元','','')).join('');
  $('#groupDisclosurePeriod').textContent=`${d.month.slice(0,4)}-01-01 至 ${d.month}月末 · 年初累计`;
  for(const [id,expanded,label]of [['groupExpandCompanies',groupCompanyExpanded,'公司明细'],['groupExpandEliminations',groupEliminationExpanded,'抵消明细']]){
   $('#'+id).setAttribute('aria-expanded',String(expanded));$('#'+id).textContent=(expanded?'− ':'＋ ')+label;
  }
  $('#groupExpandEliminations').hidden=false;
  const companyHeaders=groupCompanyExpanded?d.companies.map(c=>`<th title="${esc(c.company)}">${esc(c.label)}${c.eliminated?'<small>内部租赁</small>':''}</th>`).join(''):'';
  const elimHeaders=groupEliminationExpanded?d.eliminations.map(e=>`<th class="group-elimination">${esc(e.label)}<small>抵消借方</small></th><th class="group-elimination">${esc(e.label)}<small>抵消贷方</small></th>`).join(''):'';
  const cols=3+(groupCompanyExpanded?d.companies.length:0)+(groupEliminationExpanded?2+d.eliminations.length*2:0);
  $('#groupDisclosureTable').classList.toggle('is-expanded',groupCompanyExpanded||groupEliminationExpanded);
  $('#groupDisclosureTable').innerHTML=`<thead><tr><th rowspan="2" class="group-row-title">项目</th><th colspan="${1+(groupCompanyExpanded?d.companies.length:0)}">公司汇总</th>${groupEliminationExpanded?`<th colspan="${2+(groupEliminationExpanded?d.eliminations.length*2:0)}" class="group-elimination">合并抵消</th>`:""}<th rowspan="2" class="group-final">合并金额</th></tr><tr>${companyHeaders}<th>抵消前合计</th>${groupEliminationExpanded?`${elimHeaders}<th class="group-elimination">抵消借方</th><th class="group-elimination">抵消贷方</th>`:""}</tr></thead><tbody>`+
  disclosureRows.map(([key,label,cell])=>{
   if(!cell)return `<tr class="group-section"><th colspan="${cols}">${label}</th></tr>`;
   const companyCells=groupCompanyExpanded?d.companies.map((c,i)=>`<td>${groupAmount(key,c.report.values[key],'company',i)}</td>`).join(''):'';
   const elimCells=groupEliminationExpanded?d.eliminations.map((e,i)=>{const v=groupEliminationSides(e,key);return `<td class="group-elimination">${groupAmount(key,v.debit,'elimination:'+i+':debit')}</td><td class="group-elimination">${groupAmount(key,v.credit,'elimination:'+i+':credit')}</td>`;}).join(''):'';
   return `<tr class="${disclosureParentRows[key]?'group-child ':''}${key.endsWith('Closing')?'group-total':''}"><th scope="row" class="group-row-title">${label}</th>${companyCells}<td>${groupAmount(key,d.before[key],'before')}</td>${groupEliminationExpanded?`${elimCells}<td class="group-elimination">${groupAmount(key,d.debit[key],'debit')}</td><td class="group-elimination">${groupAmount(key,d.credit[key],'credit')}</td>`:""}<td class="group-final">${groupAmount(key,d.values[key],'values')}</td></tr>`;
  }).join('')+'</tbody>';
  const differences=check.differences||[];
  $('#groupDisclosureReconciliation').innerHTML=`<p>${esc(d.scope.description)}</p>`+
   (ref?`<p>核对来源：${esc(ref.source)} · ${esc(ref.sheet)}，扣除马来西亚。</p><div class="group-check-values"><span>本期合并净值 <b>${disclosureMoney(d.values.netClosing)}</b></span><span>可比净值 <b>${disclosureMoney(ref.expected.netClosing)}</b></span><span>差额 <b>${disclosureMoney((disclosureMinor(d.values.netClosing)-disclosureMinor(ref.expected.netClosing))/100)}</b></span></div>${ref.trialBalance?`<p>同期合并试算表剔除马来西亚后的净值：${disclosureMoney(ref.trialBalance.expected)} 元。</p>`:''}<p>${differences.length?'分项差额：'+differences.map(r=>esc(disclosureRows.find(row=>row[0]===r.key)?.[1]||r.key)+' '+disclosureMoney(r.difference)).join('；'):'全部项目一致。'}</p>`:d.groupId==='rigol'?'<p>该期间尚无核对基准，当前显示由合同与历史数据生成的结果。</p>':'');
  $('#groupDisclosureView .group-reconciliation summary').textContent=d.groupId==='rigol'?'期间核对与合并范围':'合并范围';
 }catch(e){groupDisclosureData=null;$('#groupDisclosureStatus').className='disclosure-status review';$('#groupDisclosureStatus').textContent=e.message;$('#groupDisclosureMetrics').innerHTML='';$('#groupDisclosureTable').innerHTML='';$('#groupDisclosureReconciliation').textContent='';}
}
function openGroupDisclosureSources(key,kind){
 const d=groupDisclosureData,label=disclosureRows.find(r=>r[0]===key)[1],sign=groupBalanceSign(key);
 let selectedLabel={before:'抵消前合计',debit:'抵消借方',credit:'抵消贷方',values:'合并金额'}[kind],selectedValue=d[kind]?.[key];
 if(kind.startsWith('elimination:')){
  const [,index,side]=kind.split(':'),e=d.eliminations[Number(index)];
  selectedLabel=e.label+' · '+(side==='debit'?'抵消借方':'抵消贷方');selectedValue=groupEliminationSides(e,key)[side];
 }
 const expression=sign===1?'抵消前合计＋抵消借方－抵消贷方':'抵消前合计－抵消借方＋抵消贷方';
 const numeric=sign===1?`${money(d.before[key])} + ${money(d.debit[key])} − ${money(d.credit[key])}`:`${money(d.before[key])} − ${money(d.debit[key])} + ${money(d.credit[key])}`;
 openDrawer(label+' · 合并来源',`<div class="detail-banner"><strong>${esc(d.company)} · ${esc(d.month)}</strong><small>人民币元 · ${esc(d.scope.caption)}</small></div><p>${esc(selectedLabel)} <b>${disclosureMoney(selectedValue)} 元</b></p><section class="disclosure-formula"><b>合并计算公式</b><p>${expression}</p><div>${numeric} = <strong>${money(d.values[key])}</strong></div></section>${disclosureFormulaMarkup(d,key)}<div class="group-trace-table"><table><thead><tr><th>公司</th><th>单体金额</th><th>抵消影响</th><th>合并贡献</th></tr></thead><tbody>${d.companies.map((c,i)=>{const v=c.report.values[key];return `<tr><th><button class="link" data-group-open-company="${i}">${esc(c.label)} ↗</button></th><td>${disclosureMoney(v)}</td><td>${disclosureMoney(c.eliminated?-v:0)}</td><td>${disclosureMoney(c.eliminated?0:v)}</td></tr>`;}).join('')}</tbody></table></div><p>${esc(d.scope.description)}</p>`);
 $('#drawerBody').querySelectorAll('[data-group-open-company]').forEach(b=>b.onclick=()=>openGroupCompany(Number(b.dataset.groupOpenCompany)));
}
