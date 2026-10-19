let disclosureReferences={},disclosureViewData=null,disclosureTraceId=null;
let disclosureSelection={company:domesticDisclosureCompanies[0],month:'2026-06',version:'current'};
function disclosureBackLink(id){return disclosureTraceId===id?'<button class="ghost" data-disclosure-return>← 返回使用权资产附注</button>':'';}
function disclosureSavedVersions(){try{return JSON.parse(localStorage.getItem('leaseDisclosures.v1')||'[]');}catch{return [];}}
async function initDisclosures(){
 try{const saved=JSON.parse(localStorage.getItem('leaseDisclosureSelection.v1')||'null');if(saved&&domesticDisclosureCompanies.includes(saved.company)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(saved.month))disclosureSelection={...disclosureSelection,...saved};}catch{}
 const view=document.createElement('main');view.id='disclosureView';view.hidden=true;
 view.innerHTML=`<div class="page-heading"><div><div class="breadcrumb">财务管理 / 使用权资产附注</div><h1>使用权资产附注</h1><p>按承租公司与报告期间生成单体附注，金额可追溯至合同计算表。</p></div><span class="badge yellow">单体 · 人民币</span></div><section class="content disclosure-filters"><label>承租公司<select id="disclosureCompany">${domesticDisclosureCompanies.map(name=>`<option>${esc(name)}</option>`).join('')}</select></label><label>报告期末<input type="month" id="disclosureMonth"></label><label>查看版本<select id="disclosureVersion"></select></label><button class="primary" id="saveDisclosureVersion">保存本期版本</button></section><div id="disclosureStatus" role="status"></div><section class="metrics disclosure-metrics" id="disclosureMetrics"></section><section class="content"><div class="section-caption"><div><b id="disclosureTitle"></b><small id="disclosurePeriod"></small></div><span>金额单位：人民币元</span></div><div class="table-wrap"><table class="disclosure-table"><thead><tr><th>项目</th><th>房屋及建筑物</th><th>合计</th></tr></thead><tbody id="disclosureBody"></tbody></table></div><div class="disclosure-foot" id="disclosureFoot"></div></section><details class="disclosure-notes"><summary>取数口径与来源版本</summary><p>期初为报告年度年初，本期为当年1月1日至报告期末。已确认租赁按初始成本归集原值，逐期折旧按计算表汇总。</p><p>当前合同未记录处置、减值等变动，相关项目显示为零；合同到期不自动等同于资产处置。单体附注不做集团内抵消。</p><p>已核定历史基准的分位尾差在1元以内按不重大差异忽略，仅影响核对提示，不修改账面金额。</p><p id="disclosureSources"></p></details>`;
 document.body.append(view);
 const button=document.createElement('button');button.dataset.page='disclosures';button.innerHTML='<span>▦</span>使用权资产附注';button.onclick=showDisclosures;document.querySelector('aside .menu-label').after(button);
 $('#disclosureCompany').onchange=e=>{disclosureSelection.company=e.target.value;disclosureSelection.version='current';renderDisclosures();};
 $('#disclosureMonth').onchange=e=>{disclosureSelection.month=e.target.value;disclosureSelection.version='current';renderDisclosures();};
 $('#disclosureVersion').onchange=e=>{disclosureSelection.version=e.target.value;renderDisclosures();};
 $('#saveDisclosureVersion').onclick=saveDisclosureVersion;
 $('#disclosureBody').onclick=e=>{const amount=e.target.closest('[data-disclosure-key]');if(amount)openDisclosureSources(amount.dataset.disclosureKey);};
 try{disclosureReferences=await(await calcApi('/api/disclosure-reference')).json();}catch{disclosureReferences={};}
}
function showDisclosures(){
 hideLeaseViews();leaseRoute='disclosures';navigateContractUrl('#disclosures');$('#disclosureView').hidden=false;
 document.querySelectorAll('[data-page]').forEach(button=>button.classList.toggle('selected',button.dataset.page==='disclosures'));
 renderDisclosures();window.scrollTo(0,0);
}
function renderDisclosures(){
 const selection=disclosureSelection;
 $('#disclosureCompany').value=selection.company;$('#disclosureMonth').value=selection.month;
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
  $('#disclosureMetrics').innerHTML=[['期初账面价值',data.values.netOpening],['本期计提折旧',data.values.depCharge],['期末账面价值',data.values.netClosing]].map(([label,value])=>metric(label,money(value),'元',label==='本期计提折旧'?data.month.slice(0,4)+'年年初累计':'本公司 · 房屋及建筑物','')).join('');
  $('#disclosureTitle').textContent=data.company;$('#disclosurePeriod').textContent=`${data.opening} 至 ${data.month}月末 · 年初累计`;
  $('#disclosureBody').innerHTML=disclosureRows.map(([key,label,cell])=>!cell?`<tr class="disclosure-section"><th colspan="3">${label}</th></tr>`:`<tr class="${['costClosing','depClosing','impClosing','netClosing'].includes(key)?'disclosure-total':''}"><td>${label}</td>${[0,1].map(()=>`<td><button class="disclosure-amount" data-disclosure-key="${key}" aria-label="追溯${esc(label)} ${money(data.values[key])}元">${money(data.values[key])}<span>↗</span></button></td>`).join('')}</tr>`).join('');
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
 openDrawer(label+' · 合同来源',`<div class="detail-banner"><strong>${esc(data.company)}</strong><small>${esc(data.opening)} 至 ${esc(data.month)}月末 · ${frozen?'已保存附注版本':'当前计算表'}</small></div><p class="disclosure-source-total">附注金额 <b>${money(data.values[key])} 元</b></p><div class="disclosure-source-list">${data.sources.map((source,index)=>`<article><b>${esc(source.name)}</b><small>${esc(source.id)} · 计算表 V${source.revision}</small><div><strong>${money(source.values[key])} 元</strong><button class="ghost" data-disclosure-source="${index}">${frozen?'查看保存的计算表':'查看合同计算表'} →</button></div></article>`).join('')}</div><p class="helper">所有合同贡献金额合计等于本项附注金额。零值项目表示本期未记录该类变动。</p>`);
 $('#drawerBody').querySelectorAll('[data-disclosure-source]').forEach(button=>button.onclick=async()=>{
  const source=data.sources[Number(button.dataset.disclosureSource)];
  if(frozen)return openSavedDisclosureCalculation(source,data.month);
  closeDrawer();disclosureTraceId=source.id;await showContractPage(source.id,'calculation');$('#calcAsOf').value=data.month;renderCalcResults();
 });
}
function openSavedDisclosureCalculation(source,month){
 const rows=source.result.rows.filter(row=>row.end<=month+'-31');
 openDrawer('已保存计算表 · V'+source.revision,`<div class="detail-banner"><strong>${esc(source.params.company)}</strong><small>${esc(source.name)} · ${esc(source.id)}</small><small>引用保存版本，不随当前合同参数变化</small></div><div class="table-wrap"><table class="disclosure-saved-table"><thead><tr><th>期间</th><th>约定付款</th><th>利息</th><th>当期折旧</th><th>资产余额</th><th>负债余额</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.end)}</td>${['payment','interest','depreciation','closingAsset','closingLiability'].map(key=>`<td>${money(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,'返回附注',()=>{closeDrawer();showDisclosures();},'历史来源');
}
