/* Shared scope navigation for both disclosure types and every disclosure view. */
let disclosureScopeMode='single';
const disclosureSingleContext={asset:'',liability:''};
let disclosureGroupGalleryType='asset';
function navigateDisclosureScope(type,scope){
 if(scope==='group')return showDisclosureGroupGallery(type);
 const company=disclosureSingleContext[type];
 if(type==='asset')return company&&disclosureCompanies.includes(company)?showDisclosureDetail(company):showDisclosures(true);
 return showLiabilities(company&&disclosureCompanies.includes(company)?company:'');
}
function initDisclosureNavigation(){
 const gallery=document.createElement('main');gallery.id='disclosureGroupGalleryView';gallery.hidden=true;
 gallery.innerHTML=`<div class="page-heading"><div><div class="breadcrumb" id="disclosureGroupBreadcrumb"></div><h1 id="disclosureGroupHeading"></h1></div><span class="badge yellow">合并 · 人民币元</span></div><section class="content disclosure-filters"><label>报告期末<input type="month" id="disclosureGroupGalleryMonth"></label><span class="disclosure-group-count">1 份集团附注</span></section><div class="disclosure-gallery-grid" id="disclosureGroupGalleryGrid"></div>`;
 document.body.append(gallery);
 mountDisclosureMonth($('#disclosureGroupGalleryMonth'));
 $('#disclosureGroupGalleryMonth').onchange=e=>{disclosureSelection.month=e.target.value;renderDisclosureGroupGallery();};
 $('#disclosureGroupGalleryGrid').onclick=e=>{const card=e.target.closest('[data-open-consolidated]');if(card)disclosureGroupGalleryType==='asset'?showGroupDisclosures(card.dataset.openConsolidated):showLiabilities('group',false,card.dataset.openConsolidated);};
 for(const [id,type] of [['disclosureGalleryView','asset'],['disclosureView','asset'],['groupDisclosureView','asset'],['liabilityView','liability'],['disclosureGroupGalleryView','asset']]){
  const view=document.getElementById(id),bar=document.createElement('div');
  view.classList.add('has-disclosure-navigation');
  bar.className='disclosure-scope-bar';bar.dataset.disclosureType=type;
  bar.innerHTML=`<nav class="disclosure-scope-switch" aria-label="附注列报口径"><button type="button" data-disclosure-scope="single" aria-pressed="false"><span aria-hidden="true">▤</span>公司单体</button><button type="button" data-disclosure-scope="group" aria-pressed="false"><span aria-hidden="true">▦</span>集团合并</button></nav><button type="button" class="disclosure-company-list" hidden>← 公司列表</button>`;
  view.querySelector('.page-heading').after(bar);
  bar.querySelectorAll('[data-disclosure-scope]').forEach(button=>button.onclick=()=>{
   if(button.getAttribute('aria-pressed')==='true')return;
   navigateDisclosureScope(bar.dataset.disclosureType,button.dataset.disclosureScope);
  });
  bar.querySelector('.disclosure-company-list').onclick=()=>{
   const activeType=bar.dataset.disclosureType;
   if(disclosureScopeMode==='group')showDisclosureGroupGallery(activeType);
   else activeType==='asset'?showDisclosures(true):showLiabilities();
  };
 }
 document.querySelector('aside [data-page="disclosures"]').onclick=()=>navigateDisclosureScope('asset',disclosureScopeMode);
 document.querySelector('aside [data-page="liabilities"]').onclick=()=>navigateDisclosureScope('liability',disclosureScopeMode);
}
function syncDisclosureScope(type,scope,company='',groupDetail=false){
 disclosureScopeMode=scope;
 if(scope==='single')disclosureSingleContext[type]=company;
 document.querySelectorAll(`.disclosure-scope-bar[data-disclosure-type="${type}"]`).forEach(bar=>{
  bar.querySelectorAll('[data-disclosure-scope]').forEach(button=>{
   const active=button.dataset.disclosureScope===scope;
   button.setAttribute('aria-pressed',String(active));
   button.classList.toggle('is-active',active);
  });
  const back=bar.querySelector('.disclosure-company-list');
  back.hidden=scope==='group'?!groupDetail:!company;
  back.textContent=scope==='group'?'← 合并附注列表':'← 公司列表';
 });
}
function showDisclosureGroupGallery(type){
 disclosureGroupGalleryType=type;closeDisclosurePickers();hideLeaseViews();leaseRoute='group-gallery';
 const prefix=type==='asset'?'disclosures':'liabilities';
 navigateContractUrl('#'+prefix+'/group');
 const view=$('#disclosureGroupGalleryView');view.hidden=false;
 view.querySelector('.disclosure-scope-bar').dataset.disclosureType=type;
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page===prefix));
 syncDisclosureScope(type,'group');renderDisclosureGroupGallery();window.scrollTo(0,0);
}
function renderDisclosureGroupGallery(){
 const asset=disclosureGroupGalleryType==='asset',month=disclosureSelection.month,title=asset?'使用权资产附注':'租赁负债附注';
 $('#disclosureGroupHeading').textContent=title;$('#disclosureGroupBreadcrumb').textContent='财务管理 / '+title;
 $('#disclosureGroupGalleryMonth').value=month;syncDisclosurePickers();
 localStorage.setItem('leaseDisclosureSelection.v1',JSON.stringify(disclosureSelection));
 $('#disclosureGroupGalleryView .disclosure-group-count').textContent=Object.keys(disclosureGroups).length+' 份集团附注';
 $('#disclosureGroupGalleryGrid').innerHTML=Object.values(disclosureGroups).map(scope=>{
  let data,error;
  try{data=asset?buildGroupDisclosure(leaseRecords,month,scope.id):buildGroupLiability(leaseRecords,month,scope.id);}catch(e){error=e.message;}
  const preview=error?`<div class="disclosure-paper disclosure-paper-empty"><b>${title}</b><small>${esc(error)}</small></div>`:asset?disclosurePreview(data):liabilityMini(data);
  const key=asset?'netClosing':'closing',label=asset?'期末账面价值':'租赁负债合计';
  return `<button type="button" class="disclosure-card" data-open-consolidated="${scope.id}" aria-label="查看${scope.name}${title}"><div class="disclosure-card-heading"><h2>${scope.name}</h2><span class="disclosure-group-tag">合并</span></div><div class="disclosure-preview-wrap">${preview}<span class="disclosure-card-open">查看附注 →</span></div><div class="disclosure-card-info"><div class="disclosure-card-meta"><span>${month}${data?' · '+data.companies.length+' 家公司':''}</span><span>${scope.caption}</span></div><div class="disclosure-card-balance"><span>${label}</span><strong>${error?'待生成':disclosureMoney(data.values[key])}<small>元</small></strong></div></div></button>`;
 }).join('');
}
