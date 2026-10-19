/* Editable service rents and their independent agreed payment periods. */
const renderRegularPhases=renderRentPhases;
const updateRegularPhaseTotals=updateRentPhaseComputed;
const expandedScheduleGroups={};
function scheduleGroups(schedule){
 const groups=[];
 schedule.rents.forEach((r,i)=>{const payment=schedule.payments.find(x=>x.rentIndices.includes(i)),pattern=r.net===0?'free':payment.period===0?'initial':'offset:'+String(payment.period-i),last=groups.at(-1);if(last&&last.net===r.net&&last.pattern===pattern){last.indices.push(i);last.end=r.end;}else groups.push({start:r.start,end:r.end,net:r.net,pattern,indices:[i]});});
 return groups;
}
function scheduleDetailRow(schedule,r,i){const pay=schedule.payments.find(x=>x.rentIndices.includes(i));return `<tr><td>${esc(r.start.slice(0,7))}</td><td>${esc(r.start)} 至 ${esc(r.end)}</td><td><input type="number" min="0" step="0.01" data-schedule-rent="${i}" aria-label="${r.start.slice(0,7)}不含税租金" value="${r.net}"></td><td><input type="number" min="0" max="${calcParams.months}" step="1" data-schedule-payment="${schedule.payments.indexOf(pay)}" aria-label="${r.start.slice(0,7)}付款期次" value="${pay.period}"></td></tr>`;}
renderRentPhases=function(){
 if(!calcParams.paymentSchedule){renderRegularPhases();$('#calculationView .calc-rent h2').textContent='02　分阶段固定租金';$('.calc-policy b').textContent='公司简便口径 · 初始装修免租期不纳入确认及折旧';return;}
 const schedule=calcParams.paymentSchedule,view=$('#calculationView');
 view.dataset.rentLayout='schedule';
 view.querySelector('.calc-rent h2').textContent='02　租金所属期间与付款安排';
 $('.calc-policy b').textContent='本合同核算口径 · 免租期间纳入确认与折旧';
 $('#calcPolicyText').textContent=calcParams.policy;
 view.querySelector('.calc-rent .calc-section-head p').textContent='连续相同月租金及付款规则已合并。可统一修改一组月租金，或展开明细单独调整月份与付款期次。第0期为初始确认付款。';
 view.querySelector('.calc-stage-table thead').innerHTML='<tr><th>租金所属期间</th><th>月数</th><th>每月租金（不含税，元）</th><th>付款安排</th><th>明细</th></tr>';
 const groups=scheduleGroups(schedule),expanded=expandedScheduleGroups[activeLeaseId]||{};
 $('#calcStages').innerHTML=groups.map((g,index)=>{const key=g.indices.join(','),isOpen=!!expanded[key],offset=Number(g.pattern.split(':')[1]),rule=g.pattern==='free'?'免租，不安排付款':g.pattern==='initial'?'初始确认时支付':offset===0?'每月，提前一个月支付':'按各月约定期次';return `<tr><td><strong>${esc(g.start)} 至 ${esc(g.end)}</strong></td><td>${g.indices.length}</td><td><input type="number" min="0" step="0.01" data-schedule-group="${key}" aria-label="第${index+1}组每月不含税租金" value="${g.net}"></td><td>${rule}</td><td><button class="link" data-schedule-expand="${key}" aria-expanded="${isOpen}" aria-label="${isOpen?'收起':'展开'}第${index+1}组明细">${isOpen?'收起明细':'展开明细'}</button></td></tr>${isOpen?`<tr class="schedule-details"><td colspan="5"><table><thead><tr><th>月份</th><th>所属期间</th><th>不含税租金（元）</th><th>付款期次</th></tr></thead><tbody>${g.indices.map(i=>scheduleDetailRow(schedule,schedule.rents[i],i)).join('')}</tbody></table></td></tr>`:''}`;}).join('');
 $('#calcAddStage').hidden=true;view.querySelector('.calc-precision').hidden=true;
 if(!view.dataset.scheduleBound){view.dataset.scheduleBound='true';view.addEventListener('input',e=>{const input=e.target;if(input.dataset.scheduleGroup!==undefined){for(const index of input.dataset.scheduleGroup.split(',').map(Number))calcParams.paymentSchedule.rents[index].net=input.value===''?null:Number(input.value);}else if(input.dataset.scheduleRent!==undefined){const amount=Number(input.value);calcParams.paymentSchedule.rents[Number(input.dataset.scheduleRent)].net=input.value===''?null:amount;}else if(input.dataset.schedulePayment!==undefined){calcParams.paymentSchedule.payments[Number(input.dataset.schedulePayment)].period=input.value===''?null:Number(input.value);view.querySelectorAll('[data-schedule-payment="'+input.dataset.schedulePayment+'"]').forEach(other=>{if(other!==input)other.value=input.value;});}else return;markCalcChanged();updateRentPhaseComputed();scheduleCalcRefresh();});}
 if(!view.dataset.scheduleGroupsBound){view.dataset.scheduleGroupsBound='true';view.addEventListener('click',e=>{const button=e.target.closest('[data-schedule-expand]');if(!button)return;const expanded=expandedScheduleGroups[activeLeaseId]??={};expanded[button.dataset.scheduleExpand]=!expanded[button.dataset.scheduleExpand];renderRentPhases();});view.addEventListener('change',e=>{if(e.target.matches('[data-schedule-rent],[data-schedule-group]'))renderRentPhases();});}
 updateRentPhaseComputed();
};
updateRentPhaseComputed=function(){
 if(!calcParams?.paymentSchedule){if($('#calcAddStage'))$('#calcAddStage').hidden=false;return updateRegularPhaseTotals();}
 const schedule=calcParams.paymentSchedule;
 $('#calcStageCount').textContent=`${scheduleGroups(schedule).length} 组租金 · ${schedule.rents.length} 个所属月份 · ${calcParams.months} 个摊销及折旧期间`;
 $('#calcStageCount').classList.remove('phase-mismatch');
 $('#calcStageTotal').textContent='不含税租金总额　¥ '+money(schedule.rents.reduce((sum,r)=>sum+Number(r.net||0),0));
};
updateCalcStageComputed=updateRentPhaseComputed;
function openScheduledSource(period){
 const p=calcResult.params,s=p.paymentSchedule,r=s.rents[period-1];
 const payment=s.payments.filter(x=>x.period===period),initial=s.payments.filter(x=>x.period===0);
 const months=entries=>entries.flatMap(x=>x.rentIndices).filter(i=>s.rents[i].net!==0).map(i=>s.rents[i].start.slice(0,7)).join('、')||'无';
 openDrawer('本合同计算参数',`<div class="detail-banner"><small>${esc(p.recordId)} · 参数 V${p.revision}</small><strong>${esc(p.company)}</strong><small>${esc(p.name)}</small></div><div class="detail-grid">${[['年折现率',(p.annualRate*100).toFixed(2)+'%'],['租赁期间',p.start+' 至 '+p.end],['本期租金所属期间',r?r.start+' 至 '+r.end:'全期'],['本期付款对应租金月份',months(payment)],['初始付款对应租金月份',months(initial)],['初始付款（不含税）',money(calcResult.initial.upfront)+'元']].map(([label,value])=>`<div><label>${label}</label><p>${esc(value)}</p></div>`).join('')}</div><p class="helper">${esc(p.policy)}</p>`,'前往本合同参数页',()=>{closeDrawer();showContractPage(p.recordId,'parameters');},'合同 → 参数 → 计算表');
}
