/* A rent phase can contain any number of months and several scheduled payments. */
function rentPhases(p=calcParams){
 if(p.rentPhases)return p.rentPhases;
 let offset=0;return p.stages.map(s=>{const phase={...s,frequency:0,timing:s.paymentPeriod===offset?'advance':s.paymentPeriod===offset+s.months?'arrears':'custom'};offset+=s.months;return phase;});
}
function editableRentPhases(){if(!calcParams.rentPhases)calcParams.rentPhases=clone(rentPhases());return calcParams.rentPhases;}
function phaseInput(index,key,type,value,attrs=''){return `<input data-phase="${index}" data-phase-field="${key}" aria-label="阶段${index+1}${{months:'月数',gross:'租金总额',endDate:'结束日'}[key]}" type="${type}" value="${esc(value??'')}" ${attrs}>`;}
function phaseDate(offset){try{return calcDateAdd(calcParams.start,offset);}catch{return '';}}
function renderRentPhases(){
 const view=$('#calculationView'),phases=rentPhases();view.dataset.rentLayout='phases';
 view.querySelector('.calc-rent .calc-section-head p').textContent='每个阶段可按合同自由设置月数和租金，再选择付款频率及期初／期末支付。阶段合计须覆盖合同租赁期，不自动延长合同。';
 view.querySelector('.calc-stage-table thead').innerHTML='<tr><th>阶段</th><th>阶段起止日期</th><th>月数</th><th>阶段租金总额（含税，元）</th><th>付款频率</th><th>付款时点</th><th>操作</th></tr>';
 let offset=0;$('#calcStages').innerHTML=phases.map((phase,index)=>{const start=phaseDate(offset),months=Number(phase.months)||0,end=months?calcDateBefore(phaseDate(offset+months)):'';offset+=months;
 return `<tr><td class="phase-number"><b>第 ${index+1} 阶段</b></td><td class="phase-dates"><div><input type="date" data-phase-start="${index}" aria-label="阶段${index+1}开始日" value="${esc(start)}" readonly><span>至</span>${phaseInput(index,'endDate','date',phase.endDate||end)}</div><small>开始日自动衔接上一阶段</small></td><td>${phaseInput(index,'months','number',phase.months,'min="1" max="600" step="1" placeholder="月数"')}</td><td class="phase-amount">${phaseInput(index,'gross','number',phase.gross,'min="0" step="0.01" placeholder="本阶段租金合计"')}<small data-phase-average="${index}"></small></td><td><select aria-label="阶段${index+1}付款频率" data-phase="${index}" data-phase-field="frequency">${[[0,'本阶段一次支付'],[1,'每月支付'],[3,'每季度支付'],[6,'每半年支付'],[12,'每年支付']].map(([value,text])=>`<option value="${value}" ${phase.frequency===value?'selected':''}>${text}</option>`).join('')}</select></td><td><select aria-label="阶段${index+1}付款时点" data-phase="${index}" data-phase-field="timing">${[['advance','期初付（月初付）'],['arrears','期末付（月末付）'],...(phase.timing==='custom'?[['custom','保留原约定期次']]:[])].map(([value,text])=>`<option value="${value}" ${phase.timing===value?'selected':''}>${text}</option>`).join('')}</select>${phase.timing==='custom'?`<small>原约定第 ${phase.paymentPeriod} 期支付</small>`:''}</td><td class="phase-action"><button class="link" type="button" data-phase-remove="${index}" aria-label="删除阶段${index+1}">删除</button></td></tr>`;}).join('');
 view.querySelector('.calc-precision').hidden=true;
 $('#calcAddStage').onclick=()=>{editableRentPhases().push({months:'',gross:'',frequency:1,timing:'advance',monthlyNet:0,monthlyTail:0});calcParams.displayMode='auto';markCalcChanged();renderRentPhases();scheduleCalcRefresh();};
 if(!view.dataset.phasesBound){view.dataset.phasesBound='true';
  view.addEventListener('input',onRentPhaseEdit);view.addEventListener('change',e=>{if(e.target.tagName==='SELECT')onRentPhaseEdit(e);});
  view.addEventListener('click',e=>{const button=e.target.closest('[data-phase-remove]');if(!button)return;editableRentPhases().splice(Number(button.dataset.phaseRemove),1);markCalcChanged();renderRentPhases();scheduleCalcRefresh();});
 }
 updateRentPhaseComputed();
}
function onRentPhaseEdit(e){
 const input=e.target;if(input.dataset.phase===undefined)return;
 const index=Number(input.dataset.phase),key=input.dataset.phaseField,phase=editableRentPhases()[index];
 const value=['months','gross','frequency'].includes(key)?input.value===''?'':Number(input.value):input.value;
 if(phase[key]===value)return;phase[key]=value;
 if(key==='months')delete phase.endDate;
 if(key==='endDate'&&value){const offset=editableRentPhases().slice(0,index).reduce((sum,s)=>sum+(Number(s.months)||0),0),start=phaseDate(offset);phase.months=leaseMonths(start,value);$(`[data-phase="${index}"][data-phase-field=months]`).value=phase.months;}
 if(['gross','frequency','months','endDate'].includes(key))calcParams.displayMode='auto';
 markCalcChanged();updateRentPhaseComputed();scheduleCalcRefresh();
}
function updateRentPhaseComputed(){
 if(!calcParams||!$('#calcStageCount'))return;const phases=rentPhases();let covered=0;
 phases.forEach((s,i)=>{const start=phaseDate(covered),count=Number(s.months)||0,end=count?calcDateBefore(phaseDate(covered+count)):'';const startLabel=$(`[data-phase-start="${i}"]`);if(startLabel)startLabel.value=start;const endInput=$(`[data-phase="${i}"][data-phase-field=endDate]`);if(endInput&&document.activeElement!==endInput)endInput.value=s.endDate||end;const average=$(`[data-phase-average="${i}"]`);if(average)average.textContent=count&&s.gross!==''?'折合每月 '+money(Number(s.gross)/count)+' '+(disclosureCurrencyNames[calcParams.currency||'CNY']||calcParams.currency):'请按该阶段约定填写总额';covered+=count;});
 $('#calcStageCount').textContent=`${phases.length} 个阶段 · 合计 ${covered} 个月 / 合同 ${calcParams.months} 个月${covered===calcParams.months?' · 已覆盖':' · 尚未匹配'}`;
 $('#calcStageCount').classList.toggle('phase-mismatch',covered!==calcParams.months);
 $('#calcStageTotal').textContent='含税租金总额　'+money(phases.reduce((sum,s)=>sum+(Number(s.gross)||0),0))+' '+(disclosureCurrencyNames[calcParams.currency||'CNY']||calcParams.currency);
 if($('#calcDisplayMode'))$('#calcDisplayMode').value=calcParams.displayMode;
}
updateCalcStageComputed=updateRentPhaseComputed;
const renderParamsBeforePhases=renderCalcParams;
renderCalcParams=function(){renderParamsBeforePhases();renderRentPhases();};
