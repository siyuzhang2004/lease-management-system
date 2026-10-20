// Accounting display: values rounded to zero display as a dash; source amounts stay numeric.
function disclosureMoney(value){return Number.isFinite(value)&&Math.abs(value)<0.005?'-':money(value);}
const disclosureParentRows={newLease:'costIncrease',acquisition:'costIncrease',disposal:'costDecrease',depCharge:'depIncrease',depDisposal:'depDecrease',impCharge:'impIncrease',impDisposal:'impDecrease'};
let disclosureCurrencyView='original',disclosureOriginalData=null,disclosurePreparedTranslation=null;
let disclosureReferences={},disclosureViewData=null,disclosureTraceId=null;
let disclosureGalleryPage=1,disclosureGalleryScroll=0;
let disclosureGalleryCompanies=[...disclosureCompanies];
let disclosureSelection={company:disclosureCompanies[0],month:'2026-06',version:'current'};
function disclosureBackLink(id){return disclosureTraceId===id?'<button class="ghost" data-disclosure-return>← 返回使用权资产附注</button>':'';}
function disclosureSavedVersions(){try{return JSON.parse(localStorage.getItem('leaseDisclosures.v1')||'[]');}catch{return [];}}
async function initDisclosures(){
 let international={};try{const response=await calcApi('/api/disclosure-international');if(response.ok)international=await response.json();}catch{}
 configureDisclosures(international,leaseRecords);disclosureGalleryCompanies=[...disclosureCompanies];
 try{const saved=JSON.parse(localStorage.getItem('leaseDisclosureSelection.v1')||'null');if(saved&&disclosureCompanies.includes(saved.company)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(saved.month))disclosureSelection={...disclosureSelection,...saved};}catch{}
 const view=document.createElement('main');view.id='disclosureView';view.hidden=true;
 view.innerHTML=`<div class="page-heading"><div><div class="breadcrumb">财务管理 / 使用权资产附注</div><h1>使用权资产附注</h1><p>按公司与报告期间生成单体附注，金额可追溯至合同计算表。</p></div><span class="badge yellow">单体 · 原币</span></div><section class="content disclosure-filters"><label>公司<select id="disclosureCompany">${disclosureCompanies.map(name=>`<option>${esc(name)}</option>`).join('')}</select></label><label>报告期末<input type="month" id="disclosureMonth"></label><label>查看版本<select id="disclosureVersion"></select></label><button class="primary" id="saveDisclosureVersion">保存本期版本</button></section><div id="disclosureStatus" role="status"></div><section class="metrics disclosure-metrics" id="disclosureMetrics"></section><section class="content"><div class="section-caption"><div><b id="disclosureTitle"></b><small id="disclosurePeriod"></small></div><div class="disclosure-currency-actions"><span id="disclosureUnit"></span><button class="ghost" id="disclosureTranslate">折算人民币</button></div></div><div class="table-wrap"><table class="disclosure-table"><thead><tr><th>项目</th><th>房屋及建筑物</th><th>合计</th></tr></thead><tbody id="disclosureBody"></tbody></table></div><div class="disclosure-foot" id="disclosureFoot"></div></section><details class="disclosure-notes"><summary>取数口径与来源版本</summary><p>期初为报告年度年初，本期为当年1月1日至报告期末。已确认租赁按初始成本归集原值，逐期折旧按计算表汇总。</p><p>合同到期当期计提完折旧后自动处置，转销原值及累计折旧；以后年度不重复列示处置。单体附注不做集团内抵消。</p><p>已核定历史基准的分位尾差在1元以内按不重大差异忽略，仅影响核对提示，不修改账面金额。</p><p id="disclosureSources"></p></details>`;
 document.body.append(view);
 initDisclosureGallery();
 initDisclosureDetailControls();
 const button=document.createElement('button');button.dataset.page='disclosures';button.innerHTML='<span>▦</span>使用权资产附注';button.onclick=showDisclosures;document.querySelector('aside [data-page="contracts"]').after(button);
 $('#disclosureCompany').onchange=e=>showDisclosureDetail(e.target.value);
 $('#disclosureMonth').onchange=e=>{disclosureSelection.month=e.target.value;disclosureSelection.version='current';renderDisclosures();};
 $('#disclosureVersion').onchange=e=>{disclosureSelection.version=e.target.value;renderDisclosures();};
 $('#saveDisclosureVersion').onclick=saveDisclosureVersion;
 $('#disclosureTranslate').onclick=()=>{disclosureCurrencyView=disclosureCurrencyView==='original'?'CNY':'original';renderDisclosures();};
 $('#disclosureBody').onclick=e=>{const amount=e.target.closest('[data-disclosure-key]');if(amount)openDisclosureSources(amount.dataset.disclosureKey);};
 try{disclosureReferences=await(await calcApi('/api/disclosure-reference')).json();}catch{disclosureReferences={};}
 await initGroupDisclosures();
 await initLiabilityDisclosures();
 initDisclosureNavigation();
}
function refreshDisclosureCompanies(){
 const allSelected=disclosureGalleryCompanies.length===disclosureCompanies.length;
 configureDisclosures(disclosureInternational,leaseRecords);
 if(allSelected)disclosureGalleryCompanies=[...disclosureCompanies];
 $('#disclosureCompany').innerHTML=disclosureCompanies.map(name=>`<option>${esc(name)}</option>`).join('');
}
function showDisclosureDetail(company=disclosureSelection.company,keepVersion=false){
 refreshDisclosureCompanies();
 if(!disclosureCompanies.includes(company))return showDisclosures();
 if(!$('#disclosureGalleryView').hidden)disclosureGalleryScroll=window.scrollY;
 if(!keepVersion)disclosureCurrencyView='original';
 disclosureSelection.company=company;if(!keepVersion)disclosureSelection.version='current';
 closeDisclosurePickers();hideLeaseViews();leaseRoute='disclosure-detail';navigateContractUrl('#disclosures/'+encodeURIComponent(company));$('#disclosureView').hidden=false;
 document.querySelectorAll('[data-page]').forEach(button=>button.classList.toggle('selected',button.dataset.page==='disclosures'));
 syncDisclosureScope('asset','single',company);
 renderDisclosures();window.scrollTo(0,0);
}
function renderDisclosures(){
 const selection=disclosureSelection;
 $('#disclosureCompany').value=selection.company;$('#disclosureMonth').value=selection.month;
 syncDisclosurePickers();
 const versions=disclosureSavedVersions().filter(v=>v.company===selection.company&&v.month===selection.month);
 $('#disclosureVersion').innerHTML='<option value="current">当前计算表</option>'+versions.map(v=>`<option value="${esc(v.id)}">已保存 V${v.version} · ${esc(new Date(v.savedAt).toLocaleString('zh-CN',{hour12:false}))}</option>`).join('');
 const frozen=versions.find(v=>v.id===selection.version);if(!frozen)selection.version='current';$('#disclosureVersion').value=selection.version;
 localStorage.setItem('leaseDisclosureSelection.v1',JSON.stringify(selection));
 try{
  const original=frozen||buildDisclosure(leaseRecords,selection.company,selection.month);
  disclosureOriginalData=original;let translationError='';disclosurePreparedTranslation=null;
  if((original.currencyCode||'CNY')!=='CNY')try{disclosurePreparedTranslation=frozen?frozen.savedTranslation:translateDisclosure(original);if(!disclosurePreparedTranslation)throw new Error('该历史版本未保存折算数据。');}catch(error){translationError=error.message;}
  if(disclosureCurrencyView==='CNY'&&translationError)disclosureCurrencyView='original';
  const data=disclosureCurrencyView==='CNY'&&disclosurePreparedTranslation?disclosurePreparedTranslation:original;disclosureViewData=data;
  $('#disclosureUnit').textContent='金额单位：'+data.currency;
  $('#disclosureTranslate').hidden=(original.currencyCode||'CNY')==='CNY';
  $('#disclosureTranslate').disabled=!!translationError;$('#disclosureTranslate').title=translationError;
  $('#disclosureTranslate').textContent=data.translated?'查看原币':'折算人民币';
  $('#disclosureView .page-heading .badge').textContent='单体 · '+data.currency;
  if(!data.sources.length)throw new Error('当前公司在该报告期没有已确认租赁合同。');
  const check=compareDisclosureReference(data,data.translated?null:disclosureReferences[data.company]?.[data.month]);
  const saved=frozen?`已保存 V${frozen.version} · 固定历史数据`:(data.historical?'历史附注':'当前计算表 · 随合同参数更新');
  $('#disclosureStatus').className='disclosure-status '+(check.state==='review'?'review':'');
  $('#disclosureStatus').innerHTML=`<span><b>${esc(saved)}</b><small>${disclosureSourceLabel(data)} · ${esc(check.label)}</small></span><span>仅本公司单体</span>`;
  if(translationError)$('#disclosureStatus').insertAdjacentHTML('beforeend',`<small>${esc(translationError)}</small>`);
  $('#disclosureMetrics').innerHTML=[['期初账面价值',data.values.netOpening],['本期计提折旧',data.values.depCharge],['期末账面价值',data.values.netClosing]].map(([label,value])=>metric(label,disclosureMoney(value),data.currency,label==='本期计提折旧'?data.month.slice(0,4)+'年年初累计':'本公司 · 房屋及建筑物','')).join('');
  $('#disclosureTitle').textContent=data.company;$('#disclosurePeriod').textContent=`${data.opening} 至 ${data.month}月末 · 年初累计`;
  $('#disclosureBody').innerHTML=visibleDisclosureRows(data).map(([key,label,cell])=>{
   if(!cell)return `<tr class="disclosure-section"><th colspan="3">${label}</th></tr>`;
   const parent=disclosureParentRows[key],hasChildren=Object.values(disclosureParentRows).includes(key),total=['costClosing','depClosing','impClosing','netClosing'].includes(key);
   const parentLabel=parent?disclosureRows.find(row=>row[0]===parent)[1].replace(/^\d+\./,''):'';
   return `<tr data-disclosure-row="${key}" ${parent?`data-parent-row="${parent}"`:''} class="${parent?'disclosure-child':hasChildren?'disclosure-parent':''} ${total?'disclosure-total':''}"><th scope="row"><span class="disclosure-row-label">${label}</span></th>${[0,1].map(()=>`<td><button class="disclosure-amount" data-disclosure-key="${key}" aria-label="追溯${esc(label)}${parent?'（计入'+parentLabel+'）':''} ${disclosureMoney(data.values[key])}${esc(data.currency)}">${disclosureMoney(data.values[key])}<span>↗</span></button></td>`).join('')}</tr>`;
  }).join('');
  $('#disclosureFoot').textContent=data.historical?'点击金额查看历史附注来源及折算依据。':check.state==='review'?'历史基准存在超过1元的差异，请核对合同版本；本页保留当前计算表金额。':'点击金额查看合同贡献明细，再进入对应期间的合同计算表。';
  $('#disclosureSources').textContent='来源：'+data.sources.map(s=>s.reference||`${s.id} · 计算表 V${s.revision}`).join('；');
  if(data.translated)$('#disclosureSources').textContent+=`。期初汇率 ${data.rates.opening}；本期平均 ${data.rates.average}；期末 ${data.rates.closing}。`+data.rates.rule;
  if(data.translated)$('#disclosurePeriod').textContent+=' · '+data.originalCurrency+' → CNY';
  $('#saveDisclosureVersion').disabled=!!frozen;
 }catch(error){
  disclosureViewData=null;disclosureOriginalData=null;$('#disclosureTranslate').hidden=true;$('#disclosureUnit').textContent='';$('#disclosureStatus').className='disclosure-status review';$('#disclosureStatus').textContent=error.message;
  $('#disclosureMetrics').innerHTML='';$('#disclosureBody').innerHTML='';$('#disclosureTitle').textContent=selection.company;$('#disclosurePeriod').textContent='';$('#disclosureFoot').textContent='请返回合同台账检查本公司的参数与计算表。';$('#disclosureSources').textContent='';$('#saveDisclosureVersion').disabled=true;
 }
}
function saveDisclosureVersion(){
 if(!disclosureViewData||disclosureSelection.version!=='current')return;
 const versions=disclosureSavedVersions(),data=JSON.parse(JSON.stringify(disclosureOriginalData));
 if(disclosurePreparedTranslation)data.savedTranslation=JSON.parse(JSON.stringify(disclosurePreparedTranslation));
 data.version=1+Math.max(0,...versions.filter(v=>v.company===data.company&&v.month===data.month).map(v=>v.version));
 data.id=crypto.randomUUID();data.savedAt=new Date().toISOString();versions.push(data);
 try{localStorage.setItem('leaseDisclosures.v1',JSON.stringify(versions));disclosureSelection.version=data.id;renderDisclosures();toast('本期附注版本已保存，后续参数修改不会覆盖。');}catch{toast('版本保存失败，浏览器存储空间不足。');}
}
function disclosureFormulaMarkup(data,key){
 const formula=disclosureFormula(data,key);if(!formula)return '';
 const expression=render=>formula.terms.map((term,index)=>(index?(term.sign<0?' − ':' + '):'')+render(term)).join('');
 const number=value=>value<0?'('+money(value)+')':money(value);
 return `<section class="disclosure-formula"><b>计算公式</b><p>${expression(term=>esc(term.label))}</p><div>${expression(term=>number(term.value))} = <strong>${money(formula.result)}</strong></div><small>金额单位：${esc(data.currency)}</small></section>`;
}
function disclosureTranslationBasis(data,source,key){
 if(!data.translated||key.startsWith('net'))return '';
 if(source.kind==='translation-opening'){
  if(key.endsWith('Opening'))return `<div class="disclosure-source-equation"><small>上年末已报人民币余额 − 原币按期初汇率折算余额</small><p>${money(source.carryReported[key])} − ${money(source.carryBaseline[key])} = <b>${money(source.values[key])}</b> 人民币元</p></div>`;
  if(key.endsWith('Fx'))return `<div class="disclosure-source-equation"><small>期初承接差额的对应折算影响</small><p>0.00 − (${money(source.values[key.replace('Fx','Opening')])}) = <b>${money(source.values[key])}</b> 人民币元</p></div>`;
  return '<small>仅影响人民币期初余额及对应折算差额。</small>';
 }
 const prefix=key.replace(/(Opening|Closing|Increase|Decrease|Fx)$/,'');
 const closing=key.endsWith('Closing')||key.endsWith('Fx'),opening=key.endsWith('Opening');
 const sourceKey=key.endsWith('Fx')?prefix+'Closing':key;
 if(opening&&source.translatedOpening?.[key]!==undefined)return '<small>期初余额承接上年末人民币报表</small>';
 const rate=closing?data.rates.closing:opening?data.rates.opening:data.rates.average;
 const label=closing?'期末汇率':opening?'期初汇率':'本期平均汇率';
 return `<div class="disclosure-source-equation"><small>${closing?'原币期末余额':'原币金额'} × ${label}</small><p>${money(source.originalValues[sourceKey]||0)} × ${rate} = <b>${money(source.values[sourceKey]||0)}</b> 人民币元</p></div>`;
}
function openDisclosureSources(key){
 const data=disclosureViewData;if(!data)return;
 const label=disclosureRows.find(row=>row[0]===key)[1],frozen=disclosureSelection.version!=='current';
 const fx=data.translated?`<div class="disclosure-fx-audit"><b>${esc(data.originalCurrency)} → CNY</b><p>期初汇率 ${data.rates.opening} · 平均汇率 ${data.rates.average} · 期末汇率 ${data.rates.closing}</p><small>${esc(data.rates.rule)}</small><details><summary>汇率来源</summary><p>${esc(data.rates.source||'汇率表')}：${esc(data.rates.openingSource.period)} ${esc(data.rates.openingSource.cell)}<br>${data.rates.monthly.map(r=>esc(r.period)+' '+esc(r.cell)+' = '+r.value).join('<br>')}</p></details></div>`:'';
 openDrawer(label+' · 金额来源',`<div class="detail-banner"><strong>${esc(data.company)}</strong><small>${esc(data.opening)} 至 ${esc(data.month)}月末</small></div><p class="disclosure-source-total">附注金额 <b>${disclosureMoney(data.values[key])} ${esc(data.currency)}</b></p>${disclosureFormulaMarkup(data,key)}${fx}<div class="disclosure-source-list">${data.sources.map((source,index)=>`<article><b>${esc(source.name)}</b><small>${esc(source.reference||source.id+' · 计算表 V'+source.revision)}${source.disposalDate?' · 到期处置日 '+esc(source.disposalDate):''}</small>${source.historyNote?`<small>${esc(source.historyNote)}</small>`:''}${data.translated?`<small>原币：${key.endsWith('Fx')?'—':disclosureMoney(source.originalValues[key])} ${esc(data.originalCurrency)}${source.translatedOpening&&key.endsWith('Opening')?' · 人民币期初承接历史报表':''}</small>`:''}${disclosureTranslationBasis(data,source,key)}<div><strong>${disclosureMoney(source.values[key])} ${esc(data.currency)}</strong>${source.result?`<button class="ghost" data-disclosure-source="${index}">${frozen?'查看保存的计算表':'查看合同计算表'} →</button>`:'<small>历史附注来源</small>'}</div></article>`).join('')}</div>`);
 $('#drawerBody').querySelectorAll('[data-disclosure-source]').forEach(button=>button.onclick=async()=>{
  const source=data.sources[Number(button.dataset.disclosureSource)];
  if(frozen)return openSavedDisclosureCalculation(source,data.month);
  closeDrawer();disclosureTraceId=source.id;await showContractPage(source.id,'calculation');$('#calcAsOf').value=data.month;renderCalcResults();
 });
}
function openSavedDisclosureCalculation(source,month){
 const rows=source.result.rows.filter(row=>row.end<=month+'-31');
 openDrawer('已保存计算表 · V'+source.revision,`<div class="detail-banner"><strong>${esc(source.params.company)}</strong><small>${esc(source.name)} · ${esc(source.id)}</small><small>引用保存版本，不随当前合同参数变化</small></div><div class="table-wrap"><table class="disclosure-saved-table"><thead><tr><th>期间</th><th>约定付款</th><th>利息</th><th>当期折旧</th><th>资产余额</th><th>负债余额</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.end)}</td>${['payment','interest','depreciation','closingAsset','closingLiability'].map(key=>`<td>${disclosureMoney(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,'返回附注',()=>{closeDrawer();showDisclosureDetail(disclosureSelection.company,true);},'历史来源');
}

function initDisclosureGallery(){
 const gallery=document.createElement('main');gallery.id='disclosureGalleryView';gallery.hidden=true;
 gallery.innerHTML=`<div class="page-heading"><div><div class="breadcrumb">财务管理 / 使用权资产附注</div><h1>使用权资产附注</h1></div><span class="badge yellow">单体 · 原币</span></div><section class="content disclosure-filters disclosure-gallery-filters"><label>报告期末<input type="month" id="disclosureGalleryMonth"></label><div class="disclosure-control-field"><span>公司</span><div id="disclosureCompanyFilter"></div></div><span id="disclosureGalleryCount"></span></section><div class="disclosure-gallery-grid" id="disclosureGalleryGrid"></div><div class="disclosure-gallery-empty" id="disclosureGalleryEmpty" hidden>请选择公司</div><div class="disclosure-pagination" id="disclosureGalleryPagination"></div>`;
 document.body.append(gallery);
 $('#disclosureGalleryMonth').onchange=e=>{disclosureSelection.month=e.target.value;disclosureSelection.version='current';disclosureGalleryPage=1;renderDisclosureGallery();};
 initDisclosureGalleryControls();
 $('#disclosureGalleryGrid').onclick=e=>{const card=e.target.closest('[data-disclosure-company]');if(card)showDisclosureDetail(card.dataset.disclosureCompany);};
 $('#disclosureGalleryPagination').onclick=e=>{const button=e.target.closest('[data-disclosure-page]');if(!button)return;disclosureGalleryPage=Number(button.dataset.disclosurePage);renderDisclosureGallery();window.scrollTo(0,0);};
}
function showDisclosures(restoreScroll=false){
 refreshDisclosureCompanies();
 closeDisclosurePickers();hideLeaseViews();leaseRoute='disclosures';navigateContractUrl('#disclosures');$('#disclosureGalleryView').hidden=false;
 document.querySelectorAll('[data-page]').forEach(button=>button.classList.toggle('selected',button.dataset.page==='disclosures'));
 syncDisclosureScope('asset','single');
 renderDisclosureGallery();window.scrollTo(0,restoreScroll===true?disclosureGalleryScroll:0);
}
function disclosurePreview(data){
 return `<div class="disclosure-paper" aria-hidden="true"><div class="disclosure-paper-title">使用权资产</div><div class="disclosure-paper-company">${esc(data.company)}</div><div class="disclosure-paper-period">${esc(data.month)} · ${esc(data.currency)}</div><div class="disclosure-mini-head"><span>项目</span><span>房屋及建筑物</span><span>合计</span></div>${visibleDisclosureRows(data).map(([key,label,cell])=>!cell?`<div class="disclosure-mini-section">${label}</div>`:`<div class="disclosure-mini-row ${disclosureParentRows[key]?'is-child':''} ${Object.values(disclosureParentRows).includes(key)?'is-parent':''} ${key.endsWith('Closing')?'is-total':''}"><span>${label}</span><span>${disclosureMoney(data.values[key])}</span><span>${disclosureMoney(data.values[key])}</span></div>`).join('')}<div class="disclosure-paper-footer">${data.basis==='合并'?'合并附注':'单体附注'}</div></div>`;
}
function renderDisclosureGallery(){
 $('#disclosureGalleryMonth').value=disclosureSelection.month;
 syncDisclosurePickers();
 localStorage.setItem('leaseDisclosureSelection.v1',JSON.stringify(disclosureSelection));
 const companies=disclosureCompanies.filter(company=>disclosureGalleryCompanies.includes(company));
 const pageSize=12,pages=Math.max(1,Math.ceil(companies.length/pageSize));disclosureGalleryPage=Math.min(disclosureGalleryPage,pages);
 const visible=companies.slice((disclosureGalleryPage-1)*pageSize,disclosureGalleryPage*pageSize);
 $('#disclosureGalleryCount').textContent=`${companies.length} 家公司`;
 $('#disclosureGalleryEmpty').hidden=companies.length!==0;
 $('#disclosureGalleryGrid').innerHTML=visible.map(company=>{
  let data,error='';try{data=buildDisclosure(leaseRecords,company,disclosureSelection.month);if(!data.sources.length)error='本期暂无已确认租赁';}catch(e){error=e.message;}
  const sourceLabel=data?disclosureSourceLabel(data):'0 份合同';
  return `<button type="button" class="disclosure-card" data-disclosure-company="${esc(company)}" aria-label="查看${esc(company)}附注"><div class="disclosure-card-heading"><h2>${esc(company)}</h2></div><div class="disclosure-preview-wrap">${error?`<div class="disclosure-paper disclosure-paper-empty"><b>使用权资产</b><span>${esc(company)}</span><small>${esc(error)}</small></div>`:disclosurePreview(data)}<span class="disclosure-card-open" aria-hidden="true">查看附注 →</span></div><div class="disclosure-card-info"><div class="disclosure-card-meta"><span>${esc(disclosureSelection.month)} · ${sourceLabel}</span><span>${error?'待生成':data?.historical?'历史附注':'当前计算表'}</span></div><div class="disclosure-card-balance"><span>期末账面价值</span><strong>${error?'—':disclosureMoney(data.values.netClosing)}<small>${esc(data?.currency||'')}</small></strong></div></div></button>`;
 }).join('');
 $('#disclosureGalleryPagination').hidden=pages===1;
 $('#disclosureGalleryPagination').innerHTML=`<button class="ghost" data-disclosure-page="${disclosureGalleryPage-1}" ${disclosureGalleryPage===1?'disabled':''}>上一页</button><span>${disclosureGalleryPage} / ${pages}</span><button class="ghost" data-disclosure-page="${disclosureGalleryPage+1}" ${disclosureGalleryPage===pages?'disabled':''}>下一页</button>`;
}
function routeDisclosures(){
 const groupMatch=location.hash.match(/^#(disclosures|liabilities)\/group\/([^/]+)\/detail$/);
 if(groupMatch){
  const [,prefix,id]=groupMatch;
  if(!Object.hasOwn(disclosureGroups,id)){showDisclosureGroupGallery(prefix==='disclosures'?'asset':'liability');return true;}
  prefix==='disclosures'?showGroupDisclosures(id):showLiabilities('group',false,id);return true;
 }
 if(location.hash==='#disclosures/group/detail'){showGroupDisclosures();return true;}
 if(location.hash==='#liabilities/group/detail'){showLiabilities('group');return true;}
 if(location.hash==='#liabilities/group'){showDisclosureGroupGallery('liability');return true;}
 if(location.hash==='#liabilities'){showLiabilities();return true;}
 if(location.hash.startsWith('#liabilities/')){showLiabilities(decodeURIComponent(location.hash.slice('#liabilities/'.length)));return true;}
 if(location.hash==='#disclosures/group'){showDisclosureGroupGallery('asset');return true;}
 if(location.hash==='#disclosures'){showDisclosures();return true;}
 if(location.hash.startsWith('#disclosures/')){try{showDisclosureDetail(decodeURIComponent(location.hash.slice('#disclosures/'.length)),true);}catch{showDisclosures();}return true;}
 return false;
}
