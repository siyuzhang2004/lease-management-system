/* Disclosure filters: company multi-select and a shared month picker. */
const disclosurePickers=[];
const disclosureIcons={
 down:'<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 calendar:'<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="4.5" width="14" height="12.5" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M6 3v3m8-3v3M3 8h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
 search:'<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="m13 13 4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
};
function closeDisclosurePickers(){disclosurePickers.forEach(p=>p.close());}
function syncDisclosurePickers(){disclosurePickers.forEach(p=>p.sync());}
function disclosurePickerShell(host,id,label,icon=''){
 const root=document.createElement('div');root.className='ds-picker';
 root.innerHTML=`<button type="button" class="ds-trigger" id="${id}Trigger" aria-label="${label}" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}Panel">${icon}<span class="ds-trigger-text"></span>${disclosureIcons.down}</button><div class="ds-panel" id="${id}Panel" role="dialog" aria-label="${label}" hidden></div>`;
 host.append(root);const trigger=root.querySelector('.ds-trigger'),panel=root.querySelector('.ds-panel');
 const picker={root,trigger,panel,sync(){},close(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');root.classList.remove('is-open');}};
 trigger.onclick=e=>{e.preventDefault();const opening=panel.hidden;closeDisclosurePickers();if(opening){panel.hidden=false;trigger.setAttribute('aria-expanded','true');root.classList.add('is-open');picker.open?.();}};
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();picker.close();trigger.focus();}else if(e.key==='ArrowDown'&&e.target===trigger){e.preventDefault();if(panel.hidden)trigger.click();panel.querySelector('input,button')?.focus();}});
 root.addEventListener('focusout',()=>{setTimeout(()=>{if(!root.contains(document.activeElement))picker.close();},0);});
 disclosurePickers.push(picker);return picker;
}
document.addEventListener('click',e=>{disclosurePickers.forEach(p=>{if(!p.root.contains(e.target))p.close();});});
function mountDisclosureMonth(input){
 disclosureControlField(input);
 input.hidden=true;
 const picker=disclosurePickerShell(input.parentElement,input.id+'Picker','报告期末',disclosureIcons.calendar);
 picker.root.classList.add('ds-month-picker');let year=Number(disclosureSelection.month.slice(0,4));
 picker.panel.innerHTML=`<div class="ds-month-nav"><button type="button" aria-label="上一年">‹</button><strong></strong><button type="button" aria-label="下一年">›</button></div><div class="ds-month-grid"></div><div class="ds-month-footer"><button type="button" data-month-shortcut="current">本月</button><button type="button" data-month-shortcut="yearEnd">年末</button></div>`;
 const draw=()=>{picker.panel.querySelector('strong').textContent=year+'年';const nav=picker.panel.querySelectorAll('.ds-month-nav button');nav[0].disabled=year<=1900;nav[1].disabled=year>=2200;
  picker.panel.querySelector('.ds-month-grid').innerHTML=Array.from({length:12},(_,i)=>{const value=year+'-'+String(i+1).padStart(2,'0');return `<button type="button" data-month-value="${value}" aria-label="${year}年${i+1}月" aria-pressed="${input.value===value}" class="${input.value===value?'is-selected':''}">${i+1}月</button>`;}).join('');
 };
 picker.sync=()=>{picker.trigger.querySelector('.ds-trigger-text').textContent=input.value?input.value.replace('-','年')+'月':'选择期间';if(!picker.panel.hidden)draw();};
 picker.open=()=>{year=Number((input.value||disclosureSelection.month).slice(0,4));draw();};
 const choose=value=>{input.value=value;picker.close();input.dispatchEvent(new Event('change',{bubbles:true}));picker.sync();picker.trigger.focus();};
 picker.panel.onclick=e=>{const button=e.target.closest('button');if(!button)return;e.preventDefault();
  if(button.dataset.monthValue)return choose(button.dataset.monthValue);
  if(button.dataset.monthShortcut){const now=new Date();return choose(button.dataset.monthShortcut==='yearEnd'?year+'-12':now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'));}
  year+=button.getAttribute('aria-label')==='上一年'?-1:1;draw();
 };
}
function disclosureControlField(input){
 const label=input.parentElement;
 if(label.tagName!=='LABEL')return;
 const field=document.createElement('div');field.className='disclosure-control-field';
 const caption=document.createElement('span');caption.textContent=label.firstChild.textContent;
 field.append(caption,input);label.replaceWith(field);
}
function mountDisclosureCompany(host,{multiple,getValue,onChange,id}){
 const picker=disclosurePickerShell(host,id,multiple?'公司筛选':'公司');let search='';
 picker.root.classList.add('ds-company-picker');
 picker.panel.innerHTML=`<div class="ds-search">${disclosureIcons.search}<input type="search" aria-label="搜索公司" placeholder="搜索公司名称" autocomplete="off"></div>${multiple?'<div class="ds-company-actions"><button type="button" data-company-action="all">全选</button><button type="button" data-company-action="clear">清空</button><span>可多选</span></div>':''}<div class="ds-company-options"></div><div class="ds-company-footer"><span></span><button type="button" data-company-action="done">完成</button></div>`;
 const selected=()=>multiple?getValue():[getValue()];
 const draw=()=>{const names=disclosureCompanies.filter(n=>n.toLowerCase().includes(search.trim().toLowerCase()));
  picker.panel.querySelector('.ds-company-options').innerHTML=names.length?names.map(name=>multiple?`<label class="ds-company-option"><input type="checkbox" value="${esc(name)}" ${selected().includes(name)?'checked':''}><span>${esc(name)}</span></label>`:`<button type="button" class="ds-company-option ds-single-option" data-company-value="${esc(name)}" aria-pressed="${getValue()===name}"><span>${esc(name)}</span><span class="ds-check">${getValue()===name?'✓':''}</span></button>`).join(''):'<div class="ds-options-empty">无匹配公司</div>';
 };
 picker.sync=()=>{const values=selected(),all=values.length===disclosureCompanies.length;
  const text=multiple?(all?'全部公司':values.length===0?'选择公司':values.length===1?values[0]:`已选 ${values.length} 家公司`):values[0];
  picker.trigger.querySelector('.ds-trigger-text').textContent=text;picker.trigger.title=values.join('、');
  picker.panel.querySelector('.ds-company-footer>span').textContent=`已选 ${values.length} 家公司`;
  picker.panel.querySelectorAll('input[type=checkbox]').forEach(box=>{box.checked=values.includes(box.value);});
  if(!multiple&&!picker.panel.hidden)draw();
 };
 picker.open=()=>{search='';picker.panel.querySelector('input[type=search]').value='';draw();picker.sync();picker.panel.querySelector('input[type=search]').focus();};
 picker.panel.querySelector('input[type=search]').oninput=e=>{search=e.target.value;draw();};
 picker.panel.onchange=e=>{if(e.target.type!=='checkbox')return;const values=new Set(selected());e.target.checked?values.add(e.target.value):values.delete(e.target.value);onChange(disclosureCompanies.filter(n=>values.has(n)));picker.sync();};
 picker.panel.onclick=e=>{const button=e.target.closest('button');if(!button)return;e.preventDefault();const action=button.dataset.companyAction;
  if(action==='done'){picker.close();picker.trigger.focus();}
  else if(action==='all'||action==='clear'){onChange(action==='all'?[...disclosureCompanies]:[]);picker.sync();}
  else if(button.dataset.companyValue){picker.close();onChange(button.dataset.companyValue);picker.sync();}
 };
}
function initDisclosureGalleryControls(){
 try{const saved=JSON.parse(localStorage.getItem('leaseDisclosureCompanyFilter.v1')||'null');if(Array.isArray(saved)&&!(saved.length===4&&domesticDisclosureCompanies.every(n=>saved.includes(n))))disclosureGalleryCompanies=disclosureCompanies.filter(n=>saved.includes(n));}catch{}
 mountDisclosureMonth($('#disclosureGalleryMonth'));
 mountDisclosureCompany($('#disclosureCompanyFilter'),{id:'disclosureCompanyMulti',multiple:true,getValue:()=>disclosureGalleryCompanies,onChange:values=>{
  disclosureGalleryCompanies=values;disclosureGalleryPage=1;
  localStorage.setItem('leaseDisclosureCompanyFilter.v1',JSON.stringify(values));renderDisclosureGallery();
 }});
}
function initDisclosureDetailControls(){
 const company=$('#disclosureCompany');company.hidden=true;
 disclosureControlField(company);
 mountDisclosureCompany(company.parentElement,{id:'disclosureCompanySingle',multiple:false,getValue:()=>company.value,onChange:value=>{company.value=value;company.dispatchEvent(new Event('change',{bubbles:true}));}});
 mountDisclosureMonth($('#disclosureMonth'));
}
