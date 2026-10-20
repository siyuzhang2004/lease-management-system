// Accounting display: values rounded to zero display as a dash; source amounts stay numeric.
function disclosureMoney(value){return Number.isFinite(value)&&Math.abs(value)<0.005?'-':money(value);}
const disclosureParentRows={newLease:'costIncrease',acquisition:'costIncrease',disposal:'costDecrease',depCharge:'depIncrease',depDisposal:'depDecrease',impCharge:'impIncrease',impDisposal:'impDecrease'};
let disclosureReferences={},disclosureViewData=null,disclosureTraceId=null;
let disclosureGalleryPage=1,disclosureGalleryScroll=0;
let disclosureGalleryCompanies=[...domesticDisclosureCompanies];
let disclosureSelection={company:domesticDisclosureCompanies[0],month:'2026-06',version:'current'};
function disclosureBackLink(id){return disclosureTraceId===id?'<button class="ghost" data-disclosure-return>← 返回使用权资产附注</button>':'';}
function disclosureSavedVersions(){try{return JSON.parse(localStorage.getItem('leaseDisclosures.v1')||'[]');}catch{return [];}}
async function initDisclosures(){
 try{const saved=JSON.parse(localStorage.getItem('leaseDisclosureSelection.v1')||'null');if(saved&&domesticDisclosureCompanies.includes(saved.company)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(saved.month))disclosureSelection={...disclosureSelection,...saved};}catch{}
 const view=document.createElement('main');view.id='disclosureView';view.hidden=true;
 view.innerHTML=`<div class="contract-back-bar"><button class="ghost" id="disclosureBackToGallery">← 返回附注列表</button></div><div class="page-heading"><div><div class="breadcrumb">财务管理 / 使用权资产附注</div><h1>使用权资产附注</h1><p>按公司与报告期间生成单体附注，金额可追溯至合同计算表。</p></div><span class="badge yellow">单体 · 人民币</span></div><section class="content disclosure-filters"><label>公司<select id="disclosureCompany">${domesticDisclosureCompanies.map(name=>`<option>${esc(name)}</option>`).join('')}</select></label><label>报告期末<input type="month" id="disclosureMonth"></label><label>查看版本<select id="disclosureVersion"></select></label><button class="primary" id="saveDisclosureVersion">保存本期版本</button></section><div id="disclosureStatus" role="status"></div><section class="metrics disclosure-metrics" id="disclosureMetrics"></section><section class="content"><div class="section-caption"><div><b id="disclosureTitle"></b><small id="disclosurePeriod"></small></div><span>金额单位：人民币元</span></div><div class="table-wrap"><table class="disclosure-table"><thead><tr><th>项目</th><th>房屋及建筑物</th><th>合计</th></tr></thead><tbody id="disclosureBody"></tbody></table></div><div class="disclosure-foot" id="disclosureFoot"></div></section><details class="disclosure-notes"><summary>取数口径与来源版本</summary><p>期初为报告年度年初，本期为当年1月1日至报告期末。已确认租赁按初始成本归集原值，逐期折旧按计算表汇总。</p><p>当前合同未记录处置、减值等变动，相关项目显示为零；合同到期不自动等同于资产处置。单体附注不做集团内抵消。</p><p>已核定历史基准的分位尾差在1元以内按不重大差异忽略，仅影响核对提示，不修改账面金额。</p><p id="disclosureSources"></p></details>`;
 document.body.append(view);
 initDisclosureGallery();
 initDisclosureDetailControls();
 $('#disclosureBackToGallery').onclick=()=>showDisclosures(true);
 const button=document.createElement('button');button.dataset.page='disclosures';button.innerHTML='<span>▦</span>使用权资产附注';button.onclick=showDisclosures;document.querySelector('aside .menu-label').after(button);
 $('#disclosureCompany').onchange=e=>showDisclosureDetail(e.target.value);
 $('#disclosureMonth').onchange=e=>{disclosureSelection.month=e.target.value;disclosureSelection.version='current';renderDisclosures();};
 $('#disclosureVersion').onchange=e=>{disclosureSelection.version=e.target.value;renderDisclosures();};
 $('#saveDisclosureVersion').onclick=saveDisclosureVersion;
 $('#disclosureBody').onclick=e=>{const amount=e.target.closest('[data-disclosure-key]');if(amount)openDisclosureSources(amount.dataset.disclosureKey);};
 try{disclosureReferences=await(await calcApi('/api/disclosure-reference')).json();}catch{disclosureReferences={};}
}
function showDisclosureDetail(company=disclosureSelection.company,keepVersion=false){
 if(!domesticDisclosureCompanies.includes(company))return showDisclosures();
 if(!$('#disclosureGalleryView').hidden)disclosureGalleryScroll=window.scrollY;
 disclosureSelection.company=company;if(!keepVersion)disclosureSelection.version='current';
 closeDisclosurePickers();hideLeaseViews();leaseRoute='disclosure-detail';navigateContractUrl('#disclosures/'+encodeURIComponent(company));$('#disclosureView').hidden=false;
 document.querySelectorAll('[data-page]').forEach(button=>button.classList.toggle('selected',button.dataset.page==='disclosures'));
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
  const data=frozen||buildDisclosure(leaseRecords,selection.company,selection.month);disclosureViewData=data;
  if(!data.sources.length)throw new Error('当前公司在该报告期没有已确认租赁合同。');
  const check=compareDisclosureReference(data,disclosureReferences[data.company]?.[data.month]);
  const saved=frozen?`已保存 V${frozen.version} · 固定历史数据`:'当前计算表 · 随合同参数更新';
  $('#disclosureStatus').className='disclosure-status '+(check.state==='review'?'review':'');
  $('#disclosureStatus').innerHTML=`<span><b>${esc(saved)}</b><small>${data.sources.length} 份合同 · ${esc(check.label)}</small></span><span>仅本公司单体</span>`;
  $('#disclosureMetrics').innerHTML=[['期初账面价值',data.values.netOpening],['本期计提折旧',data.values.depCharge],['期末账面价值',data.values.netClosing]].map(([label,value])=>metric(label,disclosureMoney(value),'元',label==='本期计提折旧'?data.month.slice(0,4)+'年年初累计':'本公司 · 房屋及建筑物','')).join('');
  $('#disclosureTitle').textContent=data.company;$('#disclosurePeriod').textContent=`${data.opening} 至 ${data.month}月末 · 年初累计`;
  $('#disclosureBody').innerHTML=disclosureRows.map(([key,label,cell])=>{
   if(!cell)return `<tr class="disclosure-section"><th colspan="3">${label}</th></tr>`;
   const parent=disclosureParentRows[key],hasChildren=Object.values(disclosureParentRows).includes(key),total=['costClosing','depClosing','impClosing','netClosing'].includes(key);
   const parentLabel=parent?disclosureRows.find(row=>row[0]===parent)[1].replace(/^\d+\./,''):'';
   return `<tr data-disclosure-row="${key}" ${parent?`data-parent-row="${parent}"`:''} class="${parent?'disclosure-child':hasChildren?'disclosure-parent':''} ${total?'disclosure-total':''}"><th scope="row"><span class="disclosure-row-label">${label}</span></th>${[0,1].map(()=>`<td><button class="disclosure-amount" data-disclosure-key="${key}" aria-label="追溯${esc(label)}${parent?'（计入'+parentLabel+'）':''} ${disclosureMoney(data.values[key])}元">${disclosureMoney(data.values[key])}<span>↗</span></button></td>`).join('')}</tr>`;
  }).join('');
  $('#disclosureFoot').textContent=check.state==='review'?'历史基准存在超过1元的差异，请核对合同版本；本页保留当前计算表金额。':'点击金额查看合同贡献明细，再进入对应期间的合同计算表。';
  $('#disclosureSources').textContent='来源：'+data.sources.map(s=>`${s.id} · 计算表 V${s.revision}`).join('；');
  $('#saveDisclosureVersion').disabled=!!frozen;
 }catch(error){
  disclosureViewData=null;$('#disclosureStatus').className='disclosure-status review';$('#disclosureStatus').textContent=error.message;
  $('#disclosureMetrics').innerHTML='';$('#disclosureBody').innerHTML='';$('#disclosureTitle').textContent=selection.company;$('#disclosurePeriod').textContent='';$('#disclosureFoot').textContent='请返回合同台账检查本公司的参数与计算表。';$('#disclosureSources').textContent='';$('#saveDisclosureVersion').disabled=true;
 }
}
function saveDisclosureVersion(){
 if(!disclosureViewData||disclosureSelection.version!=='current')return;
 const versions=disclosureSavedVersions(),data=JSON.parse(JSON.stringify(disclosureViewData));
 data.version=1+Math.max(0,...versions.filter(v=>v.company===data.company&&v.month===data.month).map(v=>v.version));
 data.id=crypto.randomUUID();data.savedAt=new Date().toISOString();versions.push(data);
 try{localStorage.setItem('leaseDisclosures.v1',JSON.stringify(versions));disclosureSelection.version=data.id;renderDisclosures();toast('本期附注版本已保存，后续参数修改不会覆盖。');}catch{toast('版本保存失败，浏览器存储空间不足。');}
}
function openDisclosureSources(key){
 const data=disclosureViewData;if(!data)return;
 const label=disclosureRows.find(row=>row[0]===key)[1],frozen=disclosureSelection.version!=='current';
 openDrawer(label+' · 合同来源',`<div class="detail-banner"><strong>${esc(data.company)}</strong><small>${esc(data.opening)} 至 ${esc(data.month)}月末 · ${frozen?'已保存附注版本':'当前计算表'}</small></div><p class="disclosure-source-total">附注金额 <b>${disclosureMoney(data.values[key])} 元</b></p><div class="disclosure-source-list">${data.sources.map((source,index)=>`<article><b>${esc(source.name)}</b><small>${esc(source.id)} · 计算表 V${source.revision}</small><div><strong>${disclosureMoney(source.values[key])} 元</strong><button class="ghost" data-disclosure-source="${index}">${frozen?'查看保存的计算表':'查看合同计算表'} →</button></div></article>`).join('')}</div><p class="helper">所有合同贡献金额合计等于本项附注金额。零值项目表示本期未记录该类变动。</p>`);
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
 gallery.innerHTML=`<div class="page-heading"><div><div class="breadcrumb">财务管理 / 使用权资产附注</div><h1>使用权资产附注</h1></div><span class="badge yellow">单体 · 人民币</span></div><section class="content disclosure-filters disclosure-gallery-filters"><label>报告期末<input type="month" id="disclosureGalleryMonth"></label><div class="disclosure-control-field"><span>公司</span><div id="disclosureCompanyFilter"></div></div><span id="disclosureGalleryCount"></span></section><div class="disclosure-gallery-grid" id="disclosureGalleryGrid"></div><div class="disclosure-gallery-empty" id="disclosureGalleryEmpty" hidden>请选择公司</div><div class="disclosure-pagination" id="disclosureGalleryPagination"></div>`;
 document.body.append(gallery);
 $('#disclosureGalleryMonth').onchange=e=>{disclosureSelection.month=e.target.value;disclosureSelection.version='current';disclosureGalleryPage=1;renderDisclosureGallery();};
 initDisclosureGalleryControls();
 $('#disclosureGalleryGrid').onclick=e=>{const card=e.target.closest('[data-disclosure-company]');if(card)showDisclosureDetail(card.dataset.disclosureCompany);};
 $('#disclosureGalleryPagination').onclick=e=>{const button=e.target.closest('[data-disclosure-page]');if(!button)return;disclosureGalleryPage=Number(button.dataset.disclosurePage);renderDisclosureGallery();window.scrollTo(0,0);};
}
function showDisclosures(restoreScroll=false){
 closeDisclosurePickers();hideLeaseViews();leaseRoute='disclosures';navigateContractUrl('#disclosures');$('#disclosureGalleryView').hidden=false;
 document.querySelectorAll('[data-page]').forEach(button=>button.classList.toggle('selected',button.dataset.page==='disclosures'));
 renderDisclosureGallery();window.scrollTo(0,restoreScroll===true?disclosureGalleryScroll:0);
}
function disclosurePreview(data){
 return `<div class="disclosure-paper" aria-hidden="true"><div class="disclosure-paper-title">使用权资产</div><div class="disclosure-paper-company">${esc(data.company)}</div><div class="disclosure-paper-period">${esc(data.month)} · 人民币元</div><div class="disclosure-mini-head"><span>项目</span><span>房屋及建筑物</span><span>合计</span></div>${disclosureRows.map(([key,label,cell])=>!cell?`<div class="disclosure-mini-section">${label}</div>`:`<div class="disclosure-mini-row ${disclosureParentRows[key]?'is-child':''} ${Object.values(disclosureParentRows).includes(key)?'is-parent':''} ${key.endsWith('Closing')?'is-total':''}"><span>${label}</span><span>${disclosureMoney(data.values[key])}</span><span>${disclosureMoney(data.values[key])}</span></div>`).join('')}<div class="disclosure-paper-footer">单体附注</div></div>`;
}
function renderDisclosureGallery(){
 $('#disclosureGalleryMonth').value=disclosureSelection.month;
 syncDisclosurePickers();
 localStorage.setItem('leaseDisclosureSelection.v1',JSON.stringify(disclosureSelection));
 const companies=domesticDisclosureCompanies.filter(company=>disclosureGalleryCompanies.includes(company));
 const pageSize=12,pages=Math.max(1,Math.ceil(companies.length/pageSize));disclosureGalleryPage=Math.min(disclosureGalleryPage,pages);
 const visible=companies.slice((disclosureGalleryPage-1)*pageSize,disclosureGalleryPage*pageSize);
 $('#disclosureGalleryCount').textContent=`${companies.length} 家公司`;
 $('#disclosureGalleryEmpty').hidden=companies.length!==0;
 $('#disclosureGalleryGrid').innerHTML=visible.map(company=>{
  let data,error='';try{data=buildDisclosure(leaseRecords,company,disclosureSelection.month);if(!data.sources.length)error='本期暂无已确认租赁';}catch(e){error=e.message;}
  const count=data?.sources.length||0;
  return `<button type="button" class="disclosure-card" data-disclosure-company="${esc(company)}" aria-label="查看${esc(company)}附注"><div class="disclosure-card-heading"><h2>${esc(company)}</h2></div><div class="disclosure-preview-wrap">${error?`<div class="disclosure-paper disclosure-paper-empty"><b>使用权资产</b><span>${esc(company)}</span><small>${esc(error)}</small></div>`:disclosurePreview(data)}<span class="disclosure-card-open" aria-hidden="true">查看附注 →</span></div><div class="disclosure-card-info"><div class="disclosure-card-meta"><span>${esc(disclosureSelection.month)} · ${count} 份合同</span><span>${error?'待生成':'当前计算表'}</span></div><div class="disclosure-card-balance"><span>期末账面价值</span><strong>${error?'—':disclosureMoney(data.values.netClosing)}<small>元</small></strong></div></div></button>`;
 }).join('');
 $('#disclosureGalleryPagination').hidden=pages===1;
 $('#disclosureGalleryPagination').innerHTML=`<button class="ghost" data-disclosure-page="${disclosureGalleryPage-1}" ${disclosureGalleryPage===1?'disabled':''}>上一页</button><span>${disclosureGalleryPage} / ${pages}</span><button class="ghost" data-disclosure-page="${disclosureGalleryPage+1}" ${disclosureGalleryPage===pages?'disabled':''}>下一页</button>`;
}
function routeDisclosures(){
 if(location.hash==='#disclosures'){showDisclosures();return true;}
 if(location.hash.startsWith('#disclosures/')){try{showDisclosureDetail(decodeURIComponent(location.hash.slice('#disclosures/'.length)),true);}catch{showDisclosures();}return true;}
 return false;
}
