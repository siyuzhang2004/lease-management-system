/* Reuse the complete financial-terms markup on each contract's parameter page. */
const contractAdvancedOpen={};
function contractAdvancedData(){
 const p=calcParams,record=activeLease();
 const d={...clone(leaseDefaults),...clone(record?.financialParameters||{}),...clone(p.advanced||{})};
 if(!p.advanced&&!record?.financialParameters){d.deposit=String(p.deposit||0);d.freeEnabled=!!p.freeEnd;d.freePeriods=p.freeEnd?[{start:p.availableDate||'',end:p.freeEnd}]:[];}
 return d;
}
function renderContractAdvanced(){
 let section=$('#contractAdvancedSection');if(!section){
  section=document.createElement('section');section.id='contractAdvancedSection';$('#calculationView .calc-rent').after(section);
  section.innerHTML=`<button class="lf-advanced-trigger" id="contractAdvancedToggle" type="button" aria-expanded="false" aria-controls="contractAdvancedBody"><span class="lf-advanced-icon">⚙</span><span><b>高级财务参数</b><small>免租、实质固定与可变付款、选择权、担保余值、租赁激励及初始成本</small></span><span id="contractAdvancedState">按需展开</span><span>⌄</span></button><div id="contractAdvancedBody" hidden></div>`;
  $('#contractAdvancedToggle').onclick=()=>{contractAdvancedOpen[activeLeaseId]=!contractAdvancedOpen[activeLeaseId];syncContractAdvanced();};
  section.addEventListener('input',onContractAdvancedInput);section.addEventListener('change',e=>{if(e.target.matches('select,input[type=checkbox]'))onContractAdvancedInput(e);});
  $('#calculationView').addEventListener('input',e=>{const key=e.target.dataset.calc;if(!calcParams.advanced||!['freeStart','freeEnd','availableDate','deposit'].includes(key))return;const d=calcParams.advanced;if(key==='deposit')d.deposit=String(calcParams.deposit);else{d.freeEnabled=!!calcParams.freeEnd;d.freePeriods=d.freePeriods||[];if(d.freeEnabled)d.freePeriods[0]={start:calcParams.freeStart||calcParams.availableDate,end:calcParams.freeEnd};}markCalcChanged();renderContractAdvanced();});
  section.addEventListener('click',e=>{if(e.target.closest('#caAddFree')){const d=contractAdvancedData();d.freePeriods.push({start:'',end:''});updateContractAdvanced(d);renderContractFreeRows(d);}const remove=e.target.closest('[data-advanced-free-remove]');if(remove){const d=contractAdvancedData();d.freePeriods.splice(Number(remove.dataset.advancedFreeRemove),1);updateContractAdvanced(d);renderContractFreeRows(d);}});
 }
 const body=$('#contractAdvancedBody');body.innerHTML=leaseAdvancedMarkup().replaceAll('data-lease-show','data-financial-show').replaceAll('data-lease=','data-financial=').replaceAll('id="lf','id="ca').replaceAll('for="lf','for="ca');
 body.querySelectorAll('.lf-field').forEach(field=>{const input=field.querySelector('input,select,textarea');if(input)field.dataset.fieldKind=input.tagName==='TEXTAREA'?'notes':input.type==='date'?'date':input.type==='number'?'amount':'text';if(input&&['rateSource','servicePolicy','rateSourceLabel','substanceReason','indexFormula','otherFormula','renewalReason','purchaseReason','terminationReason'].includes(input.dataset.financial))field.classList.add('lf-wide');});
 const d=contractAdvancedData();body.querySelectorAll('[data-financial]').forEach(input=>{const value=d[input.dataset.financial];if(value!==undefined){if(input.type==='checkbox')input.checked=!!value;else input.value=value;}});
 const help=document.createElement('p');help.className='calc-trace-warning';help.textContent='高级条款与当前合同一同保存。额外付款、选择权等涉及尚未支持的现金流时，会提示补充核算；这些条款不会被忽略后继续生成计算表。固定递增已录入上方分阶段金额时，不要重复设置。';body.prepend(help);
 renderContractFreeRows(d);syncContractAdvanced();
}
function renderContractFreeRows(d){const host=$('#caFreeRows');if(!host)return;host.innerHTML=(d.freePeriods||[]).map((r,i)=>`<div class="lf-repeat"><span>${i+1}</span><label>免租开始日<input type="date" aria-label="高级免租开始日${i+1}" data-advanced-free="start" data-free-index="${i}" value="${esc(r.start)}"></label><label>免租结束日<input type="date" aria-label="高级免租结束日${i+1}" data-advanced-free="end" data-free-index="${i}" value="${esc(r.end)}"></label><button class="link" data-advanced-free-remove="${i}" type="button">删除</button></div>`).join('');}
function syncContractAdvanced(){
 const d=contractAdvancedData(),open=!!contractAdvancedOpen[activeLeaseId],body=$('#contractAdvancedBody');body.hidden=!open;$('#contractAdvancedToggle').setAttribute('aria-expanded',String(open));$('#contractAdvancedState').textContent=open?'收起参数':'按需展开';
 body.querySelectorAll('[data-financial-show]').forEach(el=>el.hidden=!d[el.dataset.financialShow]);
 body.querySelector('[data-step-rule]').hidden=!['percent','amount'].includes(d.stepMode);
 body.querySelector('[data-variable-index]').hidden=!['index','both'].includes(d.variableType);
 body.querySelector('[data-variable-other]').hidden=!['other','both'].includes(d.variableType);
 body.querySelector('[data-low-value]').hidden=d.exemption!=='low';
}
function onContractAdvancedInput(e){
 const input=e.target,d=contractAdvancedData();if(input.dataset.financial){d[input.dataset.financial]=input.type==='checkbox'?input.checked:input.value;}
 else if(input.dataset.advancedFree){d.freePeriods[Number(input.dataset.freeIndex)][input.dataset.advancedFree]=input.value;}
 else return;updateContractAdvanced(d,input.dataset.financial);syncContractAdvanced();
}
function updateContractAdvanced(d,changedKey){
 if(calcParams.advanced&&JSON.stringify(d)===JSON.stringify(calcParams.advanced))return;
 const previous=calcParams.advanced||activeLease()?.financialParameters||{},previousExtra=Number(previous.directCosts||0)+Number(previous.restorationPV||0)-(previous.incentiveEnabled&&previous.incentiveReceived?Number(previous.incentiveAmount||0):0);
 const nextExtra=Number(d.directCosts||0)+Number(d.restorationPV||0)-(d.incentiveEnabled&&d.incentiveReceived?Number(d.incentiveAmount||0):0);
 if(['directCosts','restorationPV','incentiveEnabled','incentiveReceived','incentiveAmount'].includes(changedKey)){
  calcParams.assetAdjustment=Number((calcParams.assetAdjustment-previousExtra+nextExtra).toFixed(2));$('[data-calc=assetAdjustment]').value=calcParams.assetAdjustment;
 }
 if(changedKey==='deposit'){calcParams.deposit=Number(d.deposit)||0;$('[data-calc=deposit]').value=calcParams.deposit;}
 if(d.freeEnabled&&d.freePeriods?.length){calcParams.freeStart=d.freePeriods[0].start;calcParams.freeEnd=d.freePeriods[0].end;}else{calcParams.freeStart='';calcParams.freeEnd='';}
 $('[data-calc=freeStart]').value=calcParams.freeStart;$('[data-calc=freeEnd]').value=calcParams.freeEnd;
 calcParams.advanced=d;markCalcChanged();scheduleCalcRefresh();
}
