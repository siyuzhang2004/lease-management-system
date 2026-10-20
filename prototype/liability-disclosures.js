let liabilityGroupId='rigol';
let liabilityData=null,liabilityMode='gallery',liabilityCompany='',liabilityTranslated=false;
let liabilityCompanies=[],liabilityCompaniesExpanded=false,liabilityEliminationsExpanded=false,liabilityVersion='current',liabilityTrace=null;
const liabilityLabels={...Object.fromEntries(liabilityRows),currentOpening:'期初一年内到期部分',noncurrentOpening:'期初非流动租赁负债'};
function liabilityVersions(){try{return JSON.parse(localStorage.getItem('leaseLiabilityVersions.v1')||'[]');}catch{return [];}}
function liabilityAmount(key,value,company=''){
 return `<button class="group-amount" data-liability-key="${key}" ${company?`data-liability-company="${esc(company)}"`:''}>${disclosureMoney(value)}<span aria-hidden="true">↗</span></button>`;
}
async function initLiabilityDisclosures(){
 liabilityCompanies=[...disclosureCompanies];
 const nav=document.createElement('button');nav.dataset.page='liabilities';nav.innerHTML='<span>▤</span>租赁负债附注';nav.onclick=()=>showLiabilities();document.querySelector('aside [data-page="disclosures"]').after(nav);
 const view=document.createElement('main');view.id='liabilityView';view.hidden=true;
 view.innerHTML=`
 <div class="page-heading"><div><div class="breadcrumb">财务管理 / 租赁负债附注</div><h1 id="liabilityHeading">租赁负债附注</h1></div></div>
 <section class="content disclosure-filters liability-filters"><label>报告期末<input type="month" id="liabilityMonth"></label><div class="disclosure-control-field" id="liabilityMulti"><span>公司</span><div id="liabilityMultiPicker"></div></div><div class="disclosure-control-field" id="liabilitySingle"><span>公司</span><div id="liabilitySinglePicker"></div></div><label id="liabilityVersionField">查看版本<select id="liabilityVersion"></select></label><button class="ghost" id="liabilitySave">保存本期版本</button></section>
 <div id="liabilityGallery" class="disclosure-gallery-grid"></div>
 <div id="liabilityReport"><div class="disclosure-status" id="liabilityStatus" role="status"></div><section class="metrics disclosure-metrics" id="liabilityMetrics"></section>
 <section class="content group-report"><div class="section-caption"><div><b id="liabilityTitle"></b><small id="liabilityPeriod"></small></div><div class="disclosure-currency-actions"><span id="liabilityUnit"></span><button class="ghost" id="liabilityTranslate">折算人民币</button><div class="group-expand-controls" id="liabilityExpand"><button class="ghost" id="liabilityCompaniesExpand" aria-expanded="false">＋ 公司明细</button><button class="ghost" id="liabilityEliminationsExpand" aria-expanded="false">＋ 抵消明细</button></div></div></div><div class="group-table-scroll"><table class="group-table" id="liabilityTable"></table></div></section>
 </div>`;
 document.body.append(view);
 mountDisclosureMonth($('#liabilityMonth'));
 mountDisclosureCompany($('#liabilityMultiPicker'),{id:'liabilityCompanyMulti',multiple:true,getValue:()=>liabilityCompanies,onChange:v=>{liabilityCompanies=v;renderLiabilities();}});
 mountDisclosureCompany($('#liabilitySinglePicker'),{id:'liabilityCompanySingle',multiple:false,getValue:()=>liabilityCompany,onChange:v=>showLiabilities(v)});
 $('#liabilityMonth').onchange=e=>{disclosureSelection.month=e.target.value;liabilityVersion='current';renderLiabilities();};
 $('#liabilityTranslate').onclick=()=>{liabilityTranslated=!liabilityTranslated;renderLiabilities();};
 $('#liabilityCompaniesExpand').onclick=()=>{liabilityCompaniesExpanded=!liabilityCompaniesExpanded;renderLiabilities();};
 $('#liabilityEliminationsExpand').onclick=()=>{liabilityEliminationsExpanded=!liabilityEliminationsExpanded;renderLiabilities();};
 $('#liabilityVersion').onchange=e=>{liabilityVersion=e.target.value;renderLiabilities();};
 $('#liabilitySave').onclick=saveLiabilityVersion;
 view.onclick=e=>{
  const card=e.target.closest('[data-liability-card]');if(card)return showLiabilities(card.dataset.liabilityCard);
  const amount=e.target.closest('[data-liability-key]');if(!amount||!liabilityData)return;
  if(amount.dataset.liabilityCompany)return showLiabilities(amount.dataset.liabilityCompany);
  openLiabilitySources(amount.dataset.liabilityKey);
 };
 document.addEventListener('click',e=>{if(e.target.closest('[data-liability-return]')&&liabilityTrace){const t=liabilityTrace;showLiabilities(t.company,true);}});
}
function liabilityBackLink(id){return liabilityTrace?.id===id?'<button class="ghost" data-liability-return>← 返回租赁负债附注</button>':'';}
function showLiabilities(target='',keep=false,groupId='rigol'){
 if(target==='group'){disclosureGroup(groupId);liabilityGroupId=groupId;liabilityCompaniesExpanded=false;liabilityEliminationsExpanded=false;}
 closeDisclosurePickers();hideLeaseViews();leaseRoute='liabilities';
 liabilityMode=target==='group'?'group':target?'detail':'gallery';
 if(target&&target!=='group')liabilityCompany=target;
 if(!keep){liabilityTranslated=false;liabilityVersion='current';}
 navigateContractUrl(target==='group'?groupDetailRoute('liability',liabilityGroupId):'#liabilities'+(target?'/'+encodeURIComponent(target):''));
 $('#liabilityView').hidden=false;$('#liabilityView').classList.toggle('liability-detail',liabilityMode==='detail');
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page==='liabilities'));
 syncDisclosureScope('liability',liabilityMode==='group'?'group':'single',liabilityMode==='detail'?liabilityCompany:'',liabilityMode==='group');
 renderLiabilities();window.scrollTo(0,0);
}
function liabilityMini(d){
 const v=d.values,mini=(label,n)=>`<div class="liability-mini-row"><span>${label}</span><span>${disclosureMoney(n)}</span></div>`;
 return `<div class="disclosure-paper liability-paper"><div class="disclosure-paper-title">租赁负债</div><div class="disclosure-paper-company">${esc(d.company)}</div><div class="disclosure-paper-period">${esc(d.month)} · ${esc(d.currency)}</div><div class="disclosure-mini-section">一、租赁负债变动</div>${liabilityRows.slice(1,7).filter(([k])=>k!=='fx'||d.translated).map(([k,label])=>mini(label,v[k])).join('')}<div class="disclosure-mini-section">二、列报与重分类</div>${[['租赁负债合计','closing'],['一年内到期部分','current'],['非流动租赁负债','noncurrent']].map(([label,k])=>mini(label,v[k])).join('')}<div class="disclosure-paper-footer">${d.basis==='合并'?'合并附注':'单体附注'}</div></div>`;
}
function renderLiabilities(){
 const gallery=liabilityMode==='gallery',group=liabilityMode==='group',month=disclosureSelection.month;
 const allSelected=liabilityCompanies.length===disclosureCompanies.length;
 configureDisclosures(disclosureInternational,leaseRecords);
 liabilityCompanies=allSelected?[...disclosureCompanies]:liabilityCompanies.filter(c=>disclosureCompanies.includes(c));
 $('#liabilityMonth').value=month;syncDisclosurePickers();
 $('#liabilityMulti').hidden=!gallery;$('#liabilitySingle').hidden=gallery||group;
 $('#liabilityVersionField').hidden=gallery||group;$('#liabilitySave').hidden=gallery||group;
 $('#liabilityGallery').hidden=!gallery;$('#liabilityReport').hidden=gallery;
 $('#liabilityHeading').textContent='租赁负债附注';
 localStorage.setItem('leaseDisclosureSelection.v1',JSON.stringify(disclosureSelection));
 if(gallery){
  liabilityData=null;
  $('#liabilityGallery').innerHTML=liabilityCompanies.map(company=>{
   let d,error;try{d=buildLiabilityDisclosure(leaseRecords,company,month);}catch(e){error=e.message;}
   return `<button class="disclosure-card" data-liability-card="${esc(company)}"><div class="disclosure-card-heading"><h2>${esc(company)}</h2></div><div class="disclosure-preview-wrap">${error?`<div class="disclosure-paper disclosure-paper-empty">${esc(error)}</div>`:liabilityMini(d)}<span class="disclosure-card-open">查看附注 →</span></div><div class="disclosure-card-info"><div class="disclosure-card-meta"><span>${month} · ${d?.sources.length||0} 份合同</span><span>${esc(d?.currency||'')}</span></div><div class="disclosure-card-balance"><span>租赁负债合计</span><strong>${error?'待生成':disclosureMoney(d.values.closing)}</strong></div></div></button>`;
  }).join('')||'<div class="disclosure-gallery-empty">请选择公司</div>';
  return;
 }
 try{
  const saved=liabilityVersions().filter(v=>v.report.company===liabilityCompany&&v.report.month===month);
  if(!saved.some(v=>v.id===liabilityVersion))liabilityVersion='current';
  $('#liabilityVersion').innerHTML='<option value="current">当前计算表</option>'+saved.map(v=>`<option value="${esc(v.id)}">${esc(v.savedAt)} · 保存版本</option>`).join('');
  $('#liabilityVersion').value=liabilityVersion;$('#liabilitySave').disabled=liabilityVersion!=='current';
  let d;
  if(group)d=buildGroupLiability(leaseRecords,month,liabilityGroupId);
  else if(liabilityVersion!=='current'){
   const entry=saved.find(v=>v.id===liabilityVersion);
   if(liabilityTranslated&&!entry.translation)throw new Error('此保存版本没有人民币折算结果。');
   d=JSON.parse(JSON.stringify(liabilityTranslated?entry.translation:entry.report));
  }else{
   d=buildLiabilityDisclosure(leaseRecords,liabilityCompany,month);
   if(liabilityTranslated)d=translateLiabilityDisclosure(d);
  }
  liabilityData=d;
  $('#liabilityStatus').className='disclosure-status';
  $('#liabilityStatus').textContent=group?`${d.companies.length} 家公司 · ${d.eliminations.length?d.eliminations.length+' 家内部租赁全额抵消':'无合并抵消'} · ${d.scope.caption}`:`${d.sources.length} 份合同 · ${liabilityVersion==='current'?'随合同参数更新':'已保存版本'}`;
  $('#liabilityMetrics').innerHTML=[['租赁负债合计','closing'],['一年内到期部分','current'],['非流动租赁负债','noncurrent']].map(([label,key])=>metric(label,disclosureMoney(d.values[key]),d.currency,'','')).join('');
  $('#liabilityTitle').textContent=d.company;$('#liabilityPeriod').textContent=month.slice(0,4)+'-01-01 至 '+month+'月末 · 年初累计';
  $('#liabilityUnit').textContent='金额单位：'+d.currency;
  $('#liabilityTranslate').hidden=group||(!d.translated&&d.currencyCode==='CNY');
  $('#liabilityTranslate').textContent=d.translated?'查看原始货币':'折算人民币';
  $('#liabilityExpand').hidden=!group;
  for(const [id,on,label] of [['liabilityCompaniesExpand',liabilityCompaniesExpanded,'公司明细'],['liabilityEliminationsExpand',liabilityEliminationsExpanded,'抵消明细']]){
   $('#'+id).textContent=(on?'− ':'＋ ')+label;$('#'+id).setAttribute('aria-expanded',String(on));
  }
  $('#liabilityEliminationsExpand').hidden=false;
  renderLiabilityTable(d,group);
 }catch(e){
  liabilityData=null;$('#liabilityStatus').className='disclosure-status review';$('#liabilityStatus').textContent=e.message;
  $('#liabilityMetrics').innerHTML='';$('#liabilityTable').innerHTML='';
  $('#liabilityTitle').textContent=group?disclosureGroup(liabilityGroupId).name:liabilityCompany;$('#liabilityPeriod').textContent=month;
 }
}
function renderLiabilityTable(d,group){
 const rows=liabilityRows.filter(([k])=>d.translated||k!=='fx'),table=$('#liabilityTable');
 table.classList.toggle('is-expanded',group&&(liabilityCompaniesExpanded||liabilityEliminationsExpanded));
 if(!group){
  table.innerHTML='<thead><tr><th class="group-row-title">项目</th><th>本期金额</th><th>期初金额</th></tr></thead><tbody>'+rows.map(([key,label])=>{
   if(key==='movement')return '<tr class="group-section"><th colspan="3">一、租赁负债变动</th></tr>';
   if(key==='classification')return '<tr class="group-section"><th>二、列报与重分类</th><th>期末余额</th><th>期初余额</th></tr>';
   const k=key==='total'?'closing':key,openingKey={total:'opening',current:'currentOpening',noncurrent:'noncurrentOpening'}[key];
   return `<tr class="${['closing','noncurrent'].includes(k)?'group-total':''}"><th class="group-row-title" scope="row">${label}</th><td>${liabilityAmount(k,d.values[k])}</td><td>${openingKey?liabilityAmount(openingKey,d.values[openingKey]):''}</td></tr>`;
  }).join('')+'</tbody>';
  return;
 }
 const companyHeaders=liabilityCompaniesExpanded?d.companies.map(c=>`<th title="${esc(c.company)}">${esc(c.label)}</th>`).join(''):'';
 const elimHeaders=liabilityEliminationsExpanded?d.eliminations.map(c=>`<th>${esc(c.label)}<small>抵消借方</small></th><th>${esc(c.label)}<small>抵消贷方</small></th>`).join(''):'';
 const count=3+(liabilityCompaniesExpanded?d.companies.length:0)+(liabilityEliminationsExpanded?2+d.eliminations.length*2:0);
 const display=[...rows,['openingClassification','三、期初列报'],['currentOpening','一年内到期部分'],['noncurrentOpening','非流动租赁负债']];
 table.innerHTML=`<thead><tr><th rowspan="2" class="group-row-title">项目</th><th colspan="${1+(liabilityCompaniesExpanded?d.companies.length:0)}">公司汇总</th>${liabilityEliminationsExpanded?`<th colspan="${2+(liabilityEliminationsExpanded?d.eliminations.length*2:0)}">合并抵消</th>`:""}<th rowspan="2" class="group-final">合并金额</th></tr><tr>${companyHeaders}<th>抵消前合计</th>${liabilityEliminationsExpanded?`${elimHeaders}<th>抵消借方</th><th>抵消贷方</th>`:""}</tr></thead><tbody>`+display.map(([key,label])=>{
  if(['movement','classification','openingClassification'].includes(key))return `<tr class="group-section"><th colspan="${count}">${label}</th></tr>`;
  const k=key==='total'?'closing':key;
  return `<tr class="${['closing','noncurrent','noncurrentOpening'].includes(k)?'group-total':''}"><th class="group-row-title">${label}</th>${liabilityCompaniesExpanded?d.companies.map(c=>`<td>${liabilityAmount(k,c.report.values[k],c.company)}</td>`).join(''):''}<td>${liabilityAmount(k,d.before[k])}</td>${liabilityEliminationsExpanded?d.eliminations.map(c=>`<td class="group-elimination">${liabilityAmount(k,liabilityEliminationSides(c.report.values[k],k).debit)}</td><td class="group-elimination">${liabilityAmount(k,liabilityEliminationSides(c.report.values[k],k).credit)}</td>`).join(''):''}${liabilityEliminationsExpanded?`<td class="group-elimination">${liabilityAmount(k,d.debit[k])}</td><td class="group-elimination">${liabilityAmount(k,d.credit[k])}</td>`:""}<td class="group-final">${liabilityAmount(k,d.values[k])}</td></tr>`;
 }).join('')+'</tbody>';
}
function liabilityFormulaHTML(d,key){
 const f=liabilityFormula(d,key);
 if(!f)return '';
 const expression=f.terms.map((t,i)=>(i?(t.sign>0?'＋':'－'):'')+t.label).join('');
 const numeric=f.terms.map((t,i)=>(i?(t.sign>0?' + ':' − '):'')+money(t.value)).join('');
 return `<section class="disclosure-formula"><b>计算公式</b><p>${expression}</p><div>${numeric} = <strong>${money(f.value)}</strong></div></section>`;
}
function openLiabilitySources(key){
 const d=liabilityData;
 if(d.basis==='合并'){
  const increase=liabilityBalanceSign(key)===1;
  openDrawer(liabilityLabels[key]+' · 合并来源',`<div class="detail-banner"><strong>${esc(d.company)} · ${d.month}</strong><small>人民币元 · ${esc(d.scope.caption)}</small></div><section class="disclosure-formula"><b>${increase?'抵消前合计＋抵消借方－抵消贷方':'抵消前合计－抵消借方＋抵消贷方'}</b><p>${money(d.before[key])} ${increase?'+':'−'} ${money(d.debit[key])} ${increase?'−':'+'} ${money(d.credit[key])} = ${money(d.values[key])}</p></section>${liabilityFormulaHTML(d,key)}<div class="group-trace-table"><table><thead><tr><th>公司</th><th>单体金额</th><th>抵消影响</th><th>合并金额</th></tr></thead><tbody>${d.companies.map(c=>`<tr><th><button class="link" data-liability-open="${esc(c.company)}">${esc(c.label)} ↗</button></th><td>${disclosureMoney(c.report.values[key])}</td><td>${disclosureMoney(c.eliminated?-c.report.values[key]:0)}</td><td>${disclosureMoney(c.eliminated?0:c.report.values[key])}</td></tr>`).join('')}</tbody></table></div>`);
  $('#drawerBody').querySelectorAll('[data-liability-open]').forEach(b=>b.onclick=()=>showLiabilities(b.dataset.liabilityOpen));
  return;
 }
 const current=['current','currentOpening'].includes(key),opening=key==='currentOpening';
 openDrawer(liabilityLabels[key]+' · 计算来源',`<div class="detail-banner"><strong>${esc(d.company)}</strong><small>${d.month} · ${esc(d.currency)}</small></div>${liabilityFormulaHTML(d,key)}${current?'<section class="disclosure-formula"><b>一年内到期部分</b><p>逐合同计算：未来十二个月约定付款 − 同期利息；最低为零，最高为该合同报告日负债余额。</p><p>非流动租赁负债 = 租赁负债合计 − 一年内到期部分。</p></section>':''}${d.translated?`<div class="disclosure-fx-audit">原币：${esc(d.originalCurrency)} · 期初汇率 ${d.rates.opening} · 平均汇率 ${d.rates.average} · 期末汇率 ${d.rates.closing}<br>期初余额及期初重分类使用期初汇率；本期变动使用平均汇率；期末余额及期末重分类使用期末汇率。</div>`:''}<div class="disclosure-source-list">${d.sources.map((s,i)=>{
  const pos=s.positions[opening?'opening':'closing'];
  return `<article><b>${esc(s.name)}</b><small>${esc(s.id)} · V${s.revision}</small><div><strong>${disclosureMoney(s.values[key])} ${esc(d.currency)}</strong><button class="ghost" data-liability-contract="${i}">合同计算表 →</button></div>${current?`<p>原币：${esc(s.params.currency||'CNY')} · 十二个月内付款 ${money(pos.payments)} − 利息 ${money(pos.interest)}；重分类 ${money(pos.current)}。</p><details><summary>查看逐期本金明细</summary><div class="group-trace-table"><table><thead><tr><th>期间</th><th>约定付款</th><th>利息</th><th>本金减少</th></tr></thead><tbody>${pos.future.map(r=>`<tr><th>${esc(r.end)}</th><td>${disclosureMoney(r.payment)}</td><td>${disclosureMoney(r.interest)}</td><td>${disclosureMoney(r.principal)}</td></tr>`).join('')}</tbody></table></div></details>`:''}</article>`;
 }).join('')}</div>`);
 $('#drawerBody').querySelectorAll('[data-liability-contract]').forEach(b=>b.onclick=()=>{
  const s=d.sources[Number(b.dataset.liabilityContract)];
  if(liabilityVersion!=='current'){
   openDrawer('已保存计算表 · V'+s.revision,`<div class="detail-banner"><strong>${esc(s.name)}</strong></div><div class="group-trace-table"><table><thead><tr><th>期间</th><th>约定付款</th><th>利息</th><th>本金减少</th><th>负债余额</th></tr></thead><tbody>${s.result.rows.map(r=>`<tr><th>${r.end}</th>${['payment','interest','principal','closingLiability'].map(k=>`<td>${disclosureMoney(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
  }else{liabilityTrace={id:s.id,company:d.company};showContractPage(s.id,'calculation');}
 });
}
function saveLiabilityVersion(){
 if(!liabilityData||liabilityMode!=='detail'||liabilityVersion!=='current')return;
 const report=buildLiabilityDisclosure(leaseRecords,liabilityCompany,disclosureSelection.month);
 let translation=null;try{translation=translateLiabilityDisclosure(report);}catch{}
 const id='ll-'+Date.now(),versions=liabilityVersions();
 versions.push({id,savedAt:new Date().toLocaleString('zh-CN'),report,translation});
 try{localStorage.setItem('leaseLiabilityVersions.v1',JSON.stringify(versions));liabilityVersion=id;renderLiabilities();}
 catch{openDrawer('保存失败','<p>浏览器存储空间不足，本期版本未保存。</p>');}
}
