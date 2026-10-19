/* Calculation workspace: editable contractual cash flows, DTT-compatible output. */
let calcParams=null,calcResult=null,calcChanged=false,calcBusy=false,calcTab='balances',calcFromContract=false;
const calcNumeric=new Set(['months','annualRate','taxRate','area','deposit','assetAdjustment']);
function calcDateAdd(iso,months){return addLeaseMonths(iso,months);}
function calcDateBefore(iso){return dayBefore(iso);}
function calcField(key,label,type='text',hint='',attrs=''){return `<label class="calc-field"><span>${label}</span><input type="${type}" data-calc="${key}" ${attrs}><small>${hint}</small></label>`;}

function buildCalcView(){
 if($('#calculationView'))return;
 const main=document.createElement('main');main.id='calculationView';main.hidden=true;document.body.append(main);
 main.innerHTML=`<div class="page-heading"><div><div class="breadcrumb">财务管理 / 租赁计算表</div><h1>租赁计算表 </h1><p>输入合同参数与分阶段租金，生成使用权资产和租赁负债计算表</p></div><div class="calc-heading-actions"><button class="ghost" id="calcReturn" hidden>返回合同参数</button><button class="ghost" id="calcLoadSample">载入西安合同</button></div></div>
 <div class="calc-policy"><span>ⓘ</span><div><b>公司简便口径 · 初始装修免租期不纳入确认及折旧</b><p id="calcPolicyText"></p></div><span class="calc-policy-badge">年利率输入 · 实际利率法摊销</span></div>
 <section class="content calc-params"><div class="calc-section-head"><div><h2>01　合同与计算参数</h2><p>合同期限与计算期限分别记录；押金单列，不直接计入租赁负债。</p></div><span id="calcSourceLabel">本合同专属参数</span></div>
 <div class="calc-fields calc-three">${calcField('company','承租公司')}${calcField('name','租赁项目')}${calcField('lessor','出租方')}</div>
 <div class="calc-fields calc-dates">${calcField('availableDate','取得资产控制权日','date','承租人取得租赁资产控制权的日期')}<div class="calc-field calc-free-range"><span>免租期</span><div><input type="date" data-calc="freeStart" aria-label="免租期开始日"><em>至</em><input type="date" data-calc="freeEnd" aria-label="免租期结束日"></div><small>按合同填写免租期起止日期；无免租期可留空</small></div>${calcField('start','租赁开始日','date','按本合同的核算口径填写')}${calcField('end','租赁结束日','date','本合同租赁期的结束日期')}${calcField('months','租赁月数','number','根据租赁开始日与结束日确定','readonly min="1" max="600"')}</div>
 <div class="calc-fields calc-four">${calcField('annualRate','年折现率（%）','number','用于租赁付款现值及利息摊销','min="0" max="100" step="0.01"')}${calcField('taxRate','增值税率（%）','number','用于将含税租金换算为不含税租金','min="0" max="100" step="0.01"')}${calcField('area','租赁面积（平方米）','number','','min="0" step="0.01"')}${calcField('deposit','押金（元）','number','可退还押金单独核算','min="0" step="0.01"')}</div><input type="hidden" data-calc="assetAdjustment"></section>
 <section class="content calc-rent"><div class="calc-section-head"><div><h2>02　分阶段固定租金</h2><p>每一行对应一段合同现金流，金额可逐年不同。“支付期0”表示确认时点支付，其他期数对应计算表。</p></div><button class="ghost" id="calcAddStage">＋ 添加阶段</button></div>
 <div class="calc-stage-wrap"><table class="calc-stage-table"><thead><tr><th>阶段 / 覆盖期间</th><th>月数</th><th>含税阶段租金（元）</th><th class="money">不含税金额（元）</th><th>约定支付期</th><th></th></tr></thead><tbody id="calcStages"></tbody></table></div>
 <details class="calc-precision"><summary>月租金展示与尾差设置</summary><div class="calc-precision-head"><label>月租金展示口径 <select id="calcDisplayMode"><option value="source">保留确认后的月租金及尾差</option><option value="auto">按阶段净额自动均摊，段末调整</option></select></label><p>月租金列用于展示，不驱动负债现值；负债按照上方约定付款额和支付期计算。修改含税金额或税率后默认切换为自动均摊。</p></div><div id="calcTails"></div></details>
 <div class="calc-stage-total"><span id="calcStageCount"></span><strong id="calcStageTotal"></strong></div>
 <div class="calc-generate-bar"><span id="calcState">更新参数后自动生成计算表。</span><button class="primary" id="calcGenerate">生成 / 更新计算表</button></div></section>
 <div class="calc-error" id="calcError" hidden role="alert"></div>
 <section id="calcOutput" hidden><div class="calc-output-heading"><div><h2>计算结果</h2><span id="calcAudit"></span></div><div class="calc-heading-actions"><label class="calc-asof">余额时点 <input id="calcAsOf" type="month" value="2026-09"></label></div></div><div class="metrics calc-metrics" id="calcMetrics"></div>
 <section class="content calc-result-content"><div class="tabs calc-tabs"><button class="active" data-calc-tab="balances">余额简表</button><button data-calc-tab="full">逐期明细</button><button data-calc-tab="annual">年度汇总</button><span>金额单位：人民币元</span></div><div class="calc-result-wrap" id="calcResultTable"></div><div class="calc-result-foot"><span id="calcRowCount"></span><span>负债净减少额＝付款－利息；负数表示负债增加，不代表借贷方向。</span></div></section>
 <details class="calc-notes"><summary>计量说明</summary><ol id="calcNotes"></ol></details></section>`;
 main.addEventListener('input',e=>{
  const target=e.target;
  if(target.dataset.calc){const key=target.dataset.calc;calcParams[key]=calcNumeric.has(key)?Number(target.value)/(key==='annualRate'||key==='taxRate'?100:1):target.value;if(key==='taxRate')calcParams.displayMode='auto';if(['start','end'].includes(key)&&calcParams.start&&calcParams.end){calcParams.months=leaseMonths(calcParams.start,calcParams.end);$('[data-calc=months]').value=calcParams.months;}markCalcChanged();updateCalcStageComputed();}
  if(target.dataset.stage!==undefined){const index=Number(target.dataset.stage),key=target.dataset.stageField;calcParams.stages[index][key]=Number(target.value);if(key==='gross')calcParams.displayMode='auto';if(key==='months'){calcParams.months=calcParams.stages.reduce((s,r)=>s+Number(r.months||0),0);$('[data-calc=months]').value=calcParams.months;calcParams.end=calcDateBefore(calcDateAdd(calcParams.start,calcParams.months));$('[data-calc=end]').value=calcParams.end;}markCalcChanged();updateCalcStageComputed();}
 });
 main.addEventListener('click',e=>{const remove=e.target.closest('[data-calc-remove]');if(remove){calcParams.stages.splice(Number(remove.dataset.calcRemove),1);calcParams.months=calcParams.stages.reduce((s,r)=>s+Number(r.months||0),0);calcParams.end=calcDateBefore(calcDateAdd(calcParams.start,calcParams.months));renderCalcParams();markCalcChanged();}const tabButton=e.target.closest('[data-calc-tab]');if(tabButton){calcTab=tabButton.dataset.calcTab;renderCalcResults();}});
 $('#calcDisplayMode').onchange=e=>{calcParams.displayMode=e.target.value;markCalcChanged();updateCalcStageComputed();};
 $('#calcGenerate').onclick=runLeaseCalculation;
 $('#calcLoadSample').onclick=()=>loadCalcSample();$('#calcAsOf').onchange=renderCalcResults;
 $('#calcReturn').textContent='回到关联参数';$('#calcReturn').onclick=()=>{$('[data-calc=company]').scrollIntoView({behavior:'smooth',block:'center'});$('[data-calc=company]').focus({preventScroll:true});};
 $('#calcAddStage').onclick=()=>{const covered=calcParams.stages.reduce((s,r)=>s+r.months,0);calcParams.stages.push({months:12,gross:0,paymentPeriod:covered,monthlyNet:0,monthlyTail:0});calcParams.months=covered+12;calcParams.end=calcDateBefore(calcDateAdd(calcParams.start,calcParams.months));calcParams.displayMode='auto';renderCalcParams();markCalcChanged();};
 initCalcLinks();
}

function markCalcChanged(){ensureCalcIdentity(calcParams);if(!calcChanged&&calcResult?.params.recordId===calcParams.recordId)calcParams.revision++;calcChanged=true;$('#calcState').textContent='参数已修改，完成输入后自动更新，也可手动重算。';$('#calcSourceLabel').textContent='关联参数 · 可编辑';$('#calcError').hidden=true;if(calcResult){$('#calcAudit').textContent='参数已修改，下方为上次计算结果；同步完成后更新。';$('#calcAudit').className='calc-audit-info';}syncCalcLinkStatus();}
function stageNet(s){return Number((s.gross/(1+calcParams.taxRate)).toFixed(2));}
function renderCalcParams(){
 document.querySelectorAll('[data-calc]').forEach(input=>{const key=input.dataset.calc;input.value=(key==='annualRate'||key==='taxRate')?(calcParams[key]===''?'':Number((calcParams[key]*100).toFixed(6))):key==='freeStart'?(calcParams.freeStart??(calcParams.freeEnd?calcParams.availableDate:'')):calcParams[key]??'';});
 $('#calcPolicyText').textContent='按公司核算口径，初始免租期结束后开始计量；固定租金按合同约定的金额、频率和付款时点计算。';$('#calcReturn').hidden=!calcFromContract;
 $('#calcSourceLabel').textContent='本合同专属参数';
 let count=0;$('#calcStages').innerHTML=calcParams.stages.map((s,i)=>{const from=count+1;count+=s.months;return `<tr><td><strong>第 ${i+1} 阶段</strong><small>第 ${from} — ${count} 期</small></td><td><input aria-label="阶段${i+1}月数" type="number" min="1" max="600" step="1" data-stage="${i}" data-stage-field="months" value="${s.months}"></td><td><input aria-label="阶段${i+1}含税租金" type="number" min="0" step="0.01" data-stage="${i}" data-stage-field="gross" value="${s.gross}"></td><td class="money" id="calcNet${i}">${money(stageNet(s))}</td><td><input aria-label="阶段${i+1}支付期" type="number" min="0" max="600" step="1" data-stage="${i}" data-stage-field="paymentPeriod" value="${s.paymentPeriod}"></td><td><button class="link" data-calc-remove="${i}" aria-label="删除阶段${i+1}">删除</button></td></tr>`;}).join('');
 $('#calcTails').innerHTML=calcParams.stages.map((s,i)=>`<div class="calc-tail-row"><b>第${i+1}阶段</b><label>月租金展示值 <input aria-label="阶段${i+1}月租金展示值" type="number" min="0" step="0.01" data-stage="${i}" data-stage-field="monthlyNet" value="${s.monthlyNet||0}"></label><label>段末尾差 <input aria-label="阶段${i+1}段末尾差" type="number" step="0.01" data-stage="${i}" data-stage-field="monthlyTail" value="${s.monthlyTail||0}"></label></div>`).join('');
 updateCalcStageComputed();
 syncCalcLinkStatus();renderCalcImportReport();
}
function updateCalcStageComputed(){
 $('#calcDisplayMode').value=calcParams.displayMode;
 let covered=0;calcParams.stages.forEach((s,i)=>{const el=$('#calcNet'+i);if(el)el.textContent=money(stageNet(s));const caption=$('#calcStages').rows[i]?.cells[0].querySelector('small');if(caption)caption.textContent=`第 ${covered+1} — ${covered+s.months} 期`;covered+=s.months;});
 $('#calcStageCount').textContent=`${calcParams.stages.length} 个阶段 · 合计 ${calcParams.stages.reduce((v,s)=>v+s.months,0)} 期`;
 $('#calcStageTotal').textContent='不含税固定付款总额　¥ '+money(calcParams.stages.reduce((v,s)=>v+stageNet(s),0));
 $('#calcTails').classList.toggle('calc-tail-disabled',calcParams.displayMode!=='source');
 $('#calcTails').querySelectorAll('input').forEach(i=>i.disabled=calcParams.displayMode!=='source');
}
async function calcApi(path,payload){const response=await fetch(path,{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined});if(!response.ok){let message='本地计算服务不可用，请确认已启动 prototype/server.py。';try{message=(await response.json()).error||message;}catch{}throw new Error(message);}return response;}
async function loadCalcSample(){
 try{clearTimeout(calcAutoTimer);const data=await(await calcApi('/api/sample')).json();calcParams=ensureCalcIdentity(data.params);calcReverseReport=null;calcResult=null;calcFromContract=false;calcChanged=false;$('#calcOutput').hidden=true;renderCalcParams();await runLeaseCalculation();}catch(e){showCalcError(e.message);}
}
function showCalcError(message){$('#calcError').hidden=false;$('#calcError').textContent=message;}
async function showLeaseCalculation(params=null){
 buildCalcView();$('#ledgerView').hidden=true;if($('#leaseEditor'))$('#leaseEditor').hidden=true;$('#calculationView').hidden=false;
 history.replaceState(null,'','#calculation');
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page==='calculation'));$('.demo').textContent='原型验证 · 合同实算';
 if(params){clearTimeout(calcAutoTimer);calcParams=ensureCalcIdentity(params);calcResult=null;calcReverseReport=null;calcChanged=false;calcFromContract=true;$('#calcOutput').hidden=true;renderCalcParams();markCalcChanged();}
 else if(!calcParams){if(restoreCalcRecord()){renderCalcParams();await runLeaseCalculation();}else await loadCalcSample();}
 window.scrollTo(0,0);
}
async function runLeaseCalculation(){
 if(document.querySelector('#calculationView input[aria-invalid="true"]')){showCalcError('金额格式不正确，请修正后再生成计算表。');return;}
 if(!calcParams)return;
 const missing=[...document.querySelectorAll('#calculationView [data-calc]')].filter(input=>['company','name','lessor','start','end','annualRate','taxRate'].includes(input.dataset.calc)&&!input.value.trim());
 const emptyStage=[...document.querySelectorAll('#calcStages input')].some(input=>!input.value.trim());
 if(missing.length||emptyStage){showCalcError('请完整填写合同必填参数和各阶段的月数、租金、支付期；金额为零时请明确输入0。');return;}
 if(calcBusy){calcPendingRefresh=true;return;}ensureCalcIdentity(calcParams);const snapshot=JSON.stringify(calcParams);calcBusy=true;$('#calcGenerate').disabled=true;$('#calcGenerate').textContent='正在同步…';$('#calcError').hidden=true;
 try{const result=await(await calcApi('/api/calculate',JSON.parse(snapshot))).json();if(JSON.stringify(calcParams)!==snapshot){calcPendingRefresh=true;return;}calcResult=result;calcChanged=false;$('#calcState').textContent='参数与计算表已同步。';$('#calcOutput').hidden=false;renderCalcResults();syncCalcLinkStatus();saveCalcRecord();}
 catch(e){if(JSON.stringify(calcParams)!==snapshot)calcPendingRefresh=true;else showCalcError(e.message);}
 finally{calcBusy=false;$('#calcGenerate').disabled=false;$('#calcGenerate').textContent='重新计算';if(calcPendingRefresh){calcPendingRefresh=false;clearTimeout(calcAutoTimer);calcAutoTimer=setTimeout(runLeaseCalculation,100);}}
}
function calcAsOfRow(){const month=$('#calcAsOf').value;return [...calcResult.rows].reverse().find(r=>r.end.slice(0,7)<=month)||null;}
function renderCalcResults(){
 if(!calcResult)return;const result=calcResult,asof=calcAsOfRow(),month=$('#calcAsOf').value;
 const metricData=[['初始使用权资产',result.initial.asset,'初始负债、开始日付款及直接费用等'],['初始租赁负债',result.initial.liability,'尚未支付租金的折现现值'],['所选时点使用权资产',asof?.closingAsset||0,month+' 月末'],['所选时点租赁负债',asof?.closingLiability||0,month+' 月末']];
 $('#calcMetrics').innerHTML=metricData.map(([label,value,hint])=>metric(label,money(value),'元',hint,'')).join('');
 $('#calcAudit').className='calc-audit-info';$('#calcAudit').textContent='根据本合同参数自动生成 · 参数版本 V'+result.params.revision;
 const compact=[['期数','period'],['期间自','start'],['期间至','end'],['月租金（不含税）','monthlyRent'],['约定付款额','payment'],['当期利息','interest'],['租赁负债余额','closingLiability'],['当期折旧','depreciation'],['使用权资产余额','closingAsset']];
 const full=[['期数','period'],['期间自','start'],['期间至','end'],['月租金（不含税）','monthlyRent'],['约定付款额','payment'],['累计付款额','cumulativePayment'],['未折现合同余额','remainingPayments'],['年利率','annualRate'],['现值系数','pvFactor'],['支付前负债余额','openingLiability'],['付款现值','discountedPayment'],['负债净减少额（付款－利息）','principal'],['当期利息','interest'],['本息合计','totalPayment'],['支付后负债余额','closingLiability'],['折旧前资产余额','openingAsset'],['当期折旧','depreciation'],['折旧后资产余额','closingAsset']];
 const annual=[['年度','year'],['约定付款额','payment'],['利息费用','interest'],['使用权资产折旧','depreciation'],['期末租赁负债','liability'],['期末使用权资产','asset']];
 const heads=calcTab==='full'?full:calcTab==='annual'?annual:compact,rows=calcTab==='annual'?result.annual:result.rows;
 const group=calcTab==='full'?'<tr class="calc-groups"><th colspan="7">租赁期间与合同现金流</th><th colspan="2">折现</th><th colspan="6">租赁负债</th><th colspan="3">使用权资产</th></tr>':'';
 const value=(r,key)=>calcTraceCell(r,key,key==='annualRate'?(r[key]*100).toFixed(2)+'%':key==='pvFactor'?r[key].toFixed(9):['start','end','year'].includes(key)?esc(r[key]):key==='period'?r[key]:money(r[key]));
 $('#calcResultTable').innerHTML=`<table class="calc-result-table ${calcTab==='full'?'calc-full-table':''}"><thead>${group}<tr>${heads.map(([title,key])=>`<th class="${['start','end','year','period'].includes(key)?'':'money'}">${title}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${r===asof?'calc-asof-row':''}">${heads.map(([,key])=>`<td class="${['start','end','year','period'].includes(key)?'':'money'} ${['closingLiability','closingAsset','liability','asset'].includes(key)?'calc-key-balance':''}">${value(r,key)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
 document.querySelectorAll('[data-calc-tab]').forEach(b=>b.classList.toggle('active',b.dataset.calcTab===calcTab));
 $('#calcRowCount').textContent=calcTab==='annual'?`共 ${rows.length} 个年度；初始支付 ¥${money(result.initial.upfront)} 单列于初始确认`:`共 ${rows.length} 期 · 初始支付 ¥${money(result.initial.upfront)} · 全期利息 ¥${money(result.totals.interest)}`;
 $('#calcNotes').innerHTML=(result.notes||[]).map(t=>`<li>${esc(t)}</li>`).join('');
 if(calcChanged){$('#calcAudit').textContent='参数已修改，下方为上次计算结果；同步完成后更新。';$('#calcAudit').className='calc-audit-info';}syncCalcLinkStatus();
}

function prepareCalculationFromContract(){
 const errors=validateLeaseDraft(false),d=leaseDraft;
 if(d.discount==='')errors.push('生成计算表前请填写年利率；如确认为零利率，请明确填写0。');
 if(d.taxBasis!=='net')errors.push('请先确认并剔除可抵扣增值税，或在租赁计算表中直接录入含税现金流及税率。');
 if(d.freeEnabled&&d.freeScope==='fixed'&&d.substanceEnabled&&Number(d.substanceMonthly)>0)errors.push('初始免租期仍有实质固定付款额时，需要单独补充该期间的合同现金流，不能直接整段剔除。');
 const unsupported=['renewalEnabled','purchaseEnabled','terminationEnabled','residualEnabled','incentiveEnabled'].some(key=>d[key])||d.variableType!=='none'||Number(d.prepaid)>0||d.exemption!=='none';
 if(unsupported)errors.push('本次计算表先支持固定及实质固定租金；当前可变条款、选择权或已付金额匹配尚需补充现金流后才能生成。可先保存合同草稿。');
 if(errors.length){showLeaseErrors(errors);return;}
 let start=d.start,freeEnd='';
 if(d.freeEnabled){for(const period of [...d.freePeriods].sort((a,b)=>a.start.localeCompare(b.start))){if(period.start<=start&&period.end>=start){freeEnd=period.end;const date=new Date(period.end+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+1);start=date.toISOString().slice(0,10);}else{showLeaseErrors(['请把后续免租优惠折算到对应阶段的合同现金流；本次自动带入仅排除初始连续免租期。']);return;}}}
 const months=leaseMonths(start,d.end),frequency=Number(d.frequency),stages=[];if(!months){showLeaseErrors(['免租期后没有可计算的租赁期间。']);return;}
 const record={rent:Number(d.rent),financialParameters:d};
 for(let from=0;from<months;from+=frequency){const count=Math.min(frequency,months-from);let amount=0;for(let i=0;i<count;i++){const date=calcDateAdd(start,from+i),index=Number(date.slice(0,4))*12+Number(date.slice(5,7))-1;amount+=fixedMonthlyRent(record,index)+(d.substanceEnabled?Number(d.substanceMonthly)||0:0)+(d.servicePolicy==='combine'?Number(d.serviceMonthly)||0:0);}stages.push({months:count,gross:Number(amount.toFixed(2)),paymentPeriod:d.timing==='advance'?from:from+count,monthlyNet:0,monthlyTail:0});}
 showLeaseCalculation({company:d.company,name:d.name,lessor:d.lessor,availableDate:d.start,freeEnd,start,end:d.end,months,annualRate:Number(d.discount)/100,taxRate:0,area:0,deposit:Number(d.deposit)||0,assetAdjustment:(Number(d.directCosts)||0)+(Number(d.restorationPV)||0),displayMode:'auto',policy:'从合同参数带入：初始连续免租期按公司简便口径排除；金额按已剔除可抵扣增值税的口径带入，请复核各阶段现金流。',stages});
}

function showLeaseLedger(){if($('#calculationView'))$('#calculationView').hidden=true;if($('#leaseEditor'))$('#leaseEditor').hidden=true;$('#ledgerView').hidden=false;history.replaceState(null,'','#ledger');document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page==='ledger'));$('.demo').textContent='演示原型 · 模拟数据';window.scrollTo(0,0);}
document.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{const go=()=>button.dataset.page==='calculation'?showLeaseCalculation():showLeaseLedger();if($('#leaseEditor')&&!$('#leaseEditor').hidden&&leaseDirty)requestCloseLease(go);else go();});
window.addEventListener('hashchange',()=>{if(location.hash==='#calculation')showLeaseCalculation();});
