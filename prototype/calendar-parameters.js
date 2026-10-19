/* Contract prices remain editable; service and payment schedules regenerate. */
const renderBeforeCalendar=renderRentPhases,totalsBeforeCalendar=updateRentPhaseComputed;
renderRentPhases=function(){
 if(!calcParams.calendarTerms)return renderBeforeCalendar();
 const t=calcParams.calendarTerms,view=$('#calculationView'),f=t.frequency??3,timing=t.timing||'advance',amount=f===3?t.quarterlyGross:(t.periodGross??Number((t.monthlyGross*f).toFixed(2)));
 view.dataset.rentLayout='calendar';
 $('.calc-policy b').textContent='本合同核算口径 · 免租期间纳入确认与折旧';
 $('#calcPolicyText').textContent=calcParams.policy;
 view.querySelector('.calc-rent h2').textContent='02　合同租金与付款安排';
 view.querySelector('.calc-rent .calc-section-head p').textContent='付款频率和期初／期末可自行调整；完整期间使用每期租金，不足完整期间按月租金计算。切换频率后请核实每期金额。';
 view.querySelector('.calc-stage-table thead').innerHTML='<tr><th>合同月租金（含税，元）</th><th>每期租金（含税，元）</th><th>付款频率</th><th>付款时点</th></tr>';
 $('#calcStages').innerHTML=`<tr><td><input type="number" min="0" step="0.01" aria-label="合同含税月租金" data-calendar-term="monthlyGross" value="${t.monthlyGross}"></td><td><input type="number" min="0" step="0.01" aria-label="每期含税租金" data-calendar-term="periodGross" value="${amount}"></td><td><select aria-label="付款频率" data-calendar-term="frequency">${[[1,'每月'],[3,'每季度'],[6,'每半年'],[12,'每年']].map(([v,label])=>`<option value="${v}" ${v===f?'selected':''}>${label}</option>`).join('')}</select></td><td><select aria-label="付款时点" data-calendar-term="timing"><option value="advance" ${timing==='advance'?'selected':''}>期初付</option><option value="arrears" ${timing==='arrears'?'selected':''}>期末付</option></select><small>期初付归入计租月之前一个月；期末付归入该期最后一个月。</small></td></tr>`;
 $('#calcAddStage').hidden=true;view.querySelector('.calc-precision').hidden=true;
 if(!view.dataset.calendarBound){view.dataset.calendarBound='true';view.addEventListener('input',onCalendarTermEdit);view.addEventListener('change',e=>{if(e.target.tagName==='SELECT')onCalendarTermEdit(e);});}
 updateRentPhaseComputed();
};
updateRentPhaseComputed=function(){
 if(!calcParams?.calendarTerms)return totalsBeforeCalendar();
 const t=calcParams.calendarTerms,f=t.frequency??3;
 $('#calcStageCount').textContent=`${calcParams.months} 个月 · 每${f}个月付款 · ${t.timing==='arrears'?'期末付':'期初付'}`;
 $('#calcStageCount').classList.remove('phase-mismatch');
 $('#calcStageTotal').textContent='每期含税租金　¥ '+money(f===3?t.quarterlyGross:(t.periodGross??t.monthlyGross*f));
};
updateCalcStageComputed=updateRentPhaseComputed;
function openCalendarSource(period){
 const p=calcResult.params,row=calcResult.rows.find(r=>r.period===period);
 openDrawer('本合同计算参数',`<div class="detail-banner"><small>${esc(p.recordId)} · 参数 V${p.revision}</small><strong>${esc(p.company)}</strong><small>${esc(p.name)}</small></div><div class="detail-grid">${[['年折现率',(p.annualRate*100).toFixed(2)+'%'],['含税月租金',money(p.calendarTerms.monthlyGross)+'元'],['每期含税租金',money((p.calendarTerms.frequency??3)===3?p.calendarTerms.quarterlyGross:(p.calendarTerms.periodGross??p.calendarTerms.monthlyGross*p.calendarTerms.frequency))+'元'],['增值税率',(p.taxRate*100).toFixed(2)+'%'],['付款频率及时间','每'+(p.calendarTerms.frequency??3)+'个月，'+(p.calendarTerms.timing==='arrears'?'期末付':'期初付')],['本期约定付款',row?money(row.payment)+'元（不含税）':'按季度安排']].map(([label,value])=>`<div><label>${label}</label><p>${esc(value)}</p></div>`).join('')}</div><p class="helper">${esc(p.policy)}</p>`,'前往本合同参数页',()=>{closeDrawer();showContractPage(p.recordId,'parameters');},'合同 → 参数 → 计算表');
}

function onCalendarTermEdit(e){
 const key=e.target.dataset.calendarTerm;if(!key)return;
 const t=calcParams.calendarTerms,value=key==='timing'?e.target.value:(e.target.value===''?null:Number(e.target.value));
 if(key==='periodGross'){if((t.frequency??3)===3)t.quarterlyGross=value;else t.periodGross=value;}
 else {if(t[key]===value)return;t[key]=value;}
 if(key==='frequency')t.periodGross=value===3?t.quarterlyGross:Number((t.monthlyGross*value).toFixed(2));
 markCalcChanged();if(key==='frequency')renderRentPhases();else updateRentPhaseComputed();scheduleCalcRefresh();
}
