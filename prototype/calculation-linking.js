/* Contract parameter linking and automatic recalculation. */
let calcReverseReport=null,calcAutoTimer=null,calcPendingRefresh=false;
function ensureCalcIdentity(p){p.recordId=p.recordId||'LS-'+crypto.randomUUID();p.revision=p.revision||1;return p;}
function syncCalcLinkStatus(){}
function saveCalcRecord(){}
function restoreCalcRecord(){return false;}
function renderCalcImportReport(){}
function openCalcSource(){}
function scheduleCalcRefresh(){clearTimeout(calcAutoTimer);calcAutoTimer=setTimeout(()=>{if(calcParams&&calcChanged)runLeaseCalculation();},600);}
function initCalcLinks(){
 const view=$('#calculationView'),bar=document.createElement('div');bar.id='calcLinkStatus';bar.className='calc-link-status';view.querySelector('.calc-policy').after(bar);
 const button=document.createElement('button');button.id='calcShowParameters';button.className='ghost';button.textContent='查看本表参数';view.querySelector('.calc-output-heading .calc-heading-actions').append(button);button.onclick=()=>openCalcSource(0,'initial');
 view.addEventListener('change',e=>{if(e.target.matches('[data-calc],[data-stage],#calcDisplayMode'))scheduleCalcRefresh();});
 view.addEventListener('input',e=>{if(e.target.matches('[data-calc],[data-stage]'))scheduleCalcRefresh();});
 view.addEventListener('click',e=>{const trace=e.target.closest('[data-calc-trace]');if(trace)openCalcSource(Number(trace.dataset.calcTrace),trace.dataset.calcKey);});
}
function calcTraceCell(row,key,text){
 if(calcTab==='annual')return text;
 if(!['period','monthlyRent','payment','annualRate','pvFactor','principal','interest','closingLiability','closingAsset','depreciation','openingLiability','openingAsset','discountedPayment','totalPayment','remainingPayments','cumulativePayment'].includes(key))return text;
 return `<button class="calc-source-value" data-calc-trace="${row.period}" data-calc-key="${key}" title="查看第${row.period}期的来源参数">${text}${key==='period'?' ↗':''}</button>`;
}
