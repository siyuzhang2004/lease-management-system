const contracts=[
 {id:'LS-2026-001',name:'苏州研发中心办公楼',company:'普源精电',lessor:'苏州科创园运营有限公司',type:'房屋及建筑物',start:'2026-01-01',end:'2030-12-31',rent:126000,frequency:1,timing:'advance',discount:4.2,asset:6415200,liability:5726800,depreciation:118800,interest:21600,status:'执行中'},
 {id:'LS-2026-002',name:'上海办公室租赁',company:'上海普源',lessor:'上海创智物业有限公司',type:'房屋及建筑物',start:'2024-01-01',end:'2026-11-30',rent:68500,frequency:1,timing:'advance',discount:4.2,asset:128400,liability:136200,depreciation:64200,interest:840,status:'即将到期'},
 {id:'LS-2026-003',name:'北京研发测试设备',company:'耐数电子',lessor:'北京精测设备有限公司',type:'设备',start:'2026-04-01',end:'2029-03-31',rent:32800,frequency:1,timing:'arrears',discount:4.2,asset:918400,liability:946200,depreciation:30613.33,interest:3548.25,status:'执行中'},
 {id:'LS-2026-004',name:'苏州仓储用房',company:'普源精电',lessor:'苏州工业园物流有限公司',type:'房屋及建筑物',start:'2025-07-01',end:'2030-06-30',rent:45000,frequency:1,timing:'advance',discount:4.2,asset:1845000,liability:1916000,depreciation:41000,interest:7185,status:'执行中'},
 {id:'LS-2026-005',name:'上海业务用车',company:'上海普源',lessor:'上海通达汽车租赁有限公司',type:'车辆',start:'2026-07-01',end:'2029-06-30',rent:8600,frequency:1,timing:'advance',discount:4.2,asset:252800,liability:260400,depreciation:7660.61,interest:976.5,status:'执行中'},
 {id:'LS-2025-018',name:'北京临时办公场地',company:'耐数电子',lessor:'北京融创物业有限公司',type:'房屋及建筑物',start:'2025-10-01',end:'2026-08-31',rent:18000,frequency:1,timing:'advance',discount:4.2,asset:0,liability:0,depreciation:0,interest:0,status:'已终止'}
];
const $=s=>document.querySelector(s),money=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—',sum=(rows,key)=>rows.reduce((v,r)=>v+(Number(r[key])||0),0),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let scope='all',drawerCallback=null;
function parseMonth(s){const m=String(s).match(/^(\d{4})-(\d{1,2})$/)||String(s).match(/(\d{4})年(\d{1,2})月/);return m?Number(m[1])*12+Number(m[2])-1:0;}
function monthName(index){return `${Math.floor(index/12)}年${index%12+1}月`;}
function deltaMonths(a,b){return parseInt(b.slice(0,4),10)*12+Number(b.slice(5,7))-1-(parseInt(a.slice(0,4),10)*12+Number(a.slice(5,7))-1);}
const anchorIndex=2026*12+9;
function leaseInPeriod(r,index){const date=`${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;return date>=r.start.slice(0,7)&&date<=r.end.slice(0,7);}
function fixedMonthlyRent(r,index){const d=r.financialParameters;if(!d)return Number(r.rent)||0;const ym=`${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;let rent=Number(d.rent)||0;if(d.tieredRent){for(const stage of [...(d.stages||[])].sort((a,b)=>a.start.localeCompare(b.start)))if(stage.start&&stage.start.slice(0,7)<=ym)rent=Number(stage.amount)||0;}
 else if(['percent','amount'].includes(d.stepMode)&&d.stepFirst&&d.stepEvery){const first=d.stepFirst.slice(0,4)*12+Number(d.stepFirst.slice(5,7))-1,every=Math.max(1,Number(d.stepEvery)),count=index>=first?Math.floor((index-first)/every)+1:0;rent=d.stepMode==='percent'?rent*Math.pow(1+Number(d.stepValue||0)/100,count):rent+Number(d.stepValue||0)*count;}
 return rent;}
function balanceAt(r,index){
 if(index<parseInt(r.start.slice(0,4))*12+Number(r.start.slice(5,7))-1||index>parseInt(r.end.slice(0,4))*12+Number(r.end.slice(5,7))-1||r.status==='已终止'&&index>anchorIndex)return {asset:0,liability:0};
 const n=index-anchorIndex,asset=Math.max(0,r.asset-r.depreciation*n);
 let liability=Math.max(0,r.liability),i=anchorIndex;
 const rate=Math.max(0,Number(r.discount)||0)/100/12,frequency=Math.max(1,Number(r.frequency)||1),startIndex=parseInt(r.start.slice(0,4))*12+Number(r.start.slice(5,7))-1;
 if(n>0){for(i=anchorIndex+1;i<=index;i++){const k=i-startIndex,dueNow=r.timing==='advance'?k%frequency===0:(k+1)%frequency===0,dueIndex=r.timing==='advance'?i:i-frequency+1,due=dueNow?fixedMonthlyRent(r,dueIndex)*frequency:0;liability=r.timing==='advance'?Math.max(0,(liability-due)*(1+rate)):Math.max(0,liability*(1+rate)-due);}}
 else if(n<0){for(i=anchorIndex;i>index;i--){const k=i-startIndex,dueNow=r.timing==='advance'?k%frequency===0:(k+1)%frequency===0,dueIndex=r.timing==='advance'?i:i-frequency+1,due=dueNow?fixedMonthlyRent(r,dueIndex)*frequency:0;liability=r.timing==='advance'?liability/(1+rate)+due:(liability+due)/(1+rate);}}
 return {asset,liability};
}
function activeAt(index){return contracts.filter(r=>r.status!=='待核算'&&leaseInPeriod(r,index));}
function visibleRows(){return activeAt(parseMonth($('#period').value)).filter(r=>(!$('#company').value||r.company===$('#company').value)&&(!$('#type').value||r.type===$('#type').value)&&(!$('#search').value||[r.id,r.name,r.lessor].join(' ').toLowerCase().includes($('#search').value.toLowerCase())));}
function badge(text){return `<span class="badge ${text==='执行中'?'green':text==='即将到期'?'yellow':''}">${esc(text)}</span>`;}
function metric(label,value,unit,hint,glyph){return `<article class="metric"><div class="label">${label}<span class="glyph">${glyph}</span></div><div class="number">${value}<small>${unit}</small></div><div class="hint">${hint}</div></article>`;}
function render(){
 const index=parseMonth($('#period').value),rows=visibleRows(),active=activeAt(index);
 document.querySelector('[data-scope=all] em').textContent=active.length;
 const periodText=monthName(index);
 $('#crumb').textContent=$('#pageTitle').textContent='租赁余额';$('#subtitle').textContent='按合同查看指定时点的使用权资产与租赁负债余额';$('#tableTitle').textContent=`${periodText} 合同余额`;$('#periodLabel').textContent=`余额时点：${periodText} 月末`;
 $('#metrics').classList.add('balance-metrics');
 const assets=sum(active.map(r=>balanceAt(r,index)),'asset'),liabilities=sum(active.map(r=>balanceAt(r,index)),'liability');
 $('#metrics').innerHTML=[metric('使用权资产期末余额',money(assets),'元','所选期间月末 · 模拟余额','▥'),metric('租赁负债期末余额',money(liabilities),'元','所选期间月末 · 模拟余额','▧'),metric('期间内租赁合同',active.length,'份','按合同起止日期筛选','▤')].join('');
 const heads=['合同编号 / 租赁项目','承租公司 / 资产类别','使用权资产期末余额','较上期变动','租赁负债期末余额','较上期变动','合同期间','操作'];
 $('#thead').innerHTML='<tr>'+heads.map((h,i)=>`<th class="${[2,3,4,5].includes(i)?'money':''}">${h}</th>`).join('')+'</tr>';
 $('#tbody').innerHTML=rows.map(r=>{const now=balanceAt(r,index),prev=balanceAt(r,index-1),diffA=now.asset-prev.asset,diffL=now.liability-prev.liability;return `<tr><td><strong>${esc(r.name)}</strong><small>${esc(r.id)} · ${esc(r.lessor)}</small></td><td>${esc(r.company)}<small>${esc(r.type)}</small></td><td class="money balance-cell">${money(now.asset)}</td><td class="money change-cell">${diffA<0?'−':'+'}${money(Math.abs(diffA))}</td><td class="money balance-cell">${money(now.liability)}</td><td class="money change-cell">${diffL<0?'−':'+'}${money(Math.abs(diffL))}</td><td>${r.start}<small>至 ${r.end}</small></td><td><button class="link" data-history="${r.id}">余额明细</button></td></tr>`;}).join('');
 $('#resultCount').textContent=`${rows.length} 份合同`;$('#total').textContent=`共 ${rows.length} 份合同`;$('#empty').hidden=rows.length>0;$('#noticeText').textContent='本页仅展示所选时点的使用权资产与租赁负债余额。选择合同可查看月末余额变化。';$('#viewDue').hidden=true;$('#primary').textContent='＋ 新增租赁合同';
}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function openDrawer(title,body,actionLabel=null,onAction=null,kicker='使用权资产与租赁负债'){$('#drawerTitle').textContent=title;$('#drawerKicker').textContent=kicker;$('#drawerBody').innerHTML=body;$('#drawerAction').hidden=!actionLabel;$('#drawerAction').textContent=actionLabel||'确认';drawerCallback=onAction;$('#drawerAction').onclick=()=>drawerCallback?.();$('#overlay').hidden=false;$('#close').focus();}
function closeDrawer(){$('#overlay').hidden=true;drawerCallback=null;}
function showHistory(r){const index=parseMonth($('#period').value),start=Math.max(parseInt(r.start.slice(0,4))*12+Number(r.start.slice(5,7))-1,index-11),rows=[];for(let i=start;i<=index;i++){const now=balanceAt(r,i),prev=balanceAt(r,i-1);rows.push(`<tr><td>${monthName(i)}</td><td class="money">${money(now.asset)}</td><td class="money">${money(now.asset-prev.asset)}</td><td class="money">${money(now.liability)}</td><td class="money">${money(now.liability-prev.liability)}</td></tr>`);}openDrawer(r.name,`<div class="detail-banner"><small>${esc(r.id)} · ${esc(r.company)}</small><strong style="font-size:15px">${esc(r.type)}</strong><small>${r.start} 至 ${r.end}</small></div><div class="balance-breakdown"><div><small>${monthName(index)} 使用权资产余额</small><b>¥ ${money(balanceAt(r,index).asset)}</b></div><div><small>${monthName(index)} 租赁负债余额</small><b>¥ ${money(balanceAt(r,index).liability)}</b></div></div><h3>月末余额变化</h3><div class="table-wrap"><table><thead><tr><th>期间</th><th class="money">使用权资产期末</th><th class="money">本期变动</th><th class="money">租赁负债期末</th><th class="money">本期变动</th></tr></thead><tbody>${rows.join('')}</tbody></table></div><div class="helper">示例数据用于展示余额时点与变动方向；正式余额须按完整合同现金流、适用折现率及公司核算政策复核。</div>`);}
function detail(r){if(r.financialParameters)return openLeaseEditor(r);const index=parseMonth($('#period').value),b=balanceAt(r,index);openDrawer(r.name,`<div class="detail-banner"><small>合同编号 ${esc(r.id)} · ${esc(r.company)}</small><strong>余额时点：${monthName(index)} 月末</strong>${badge(r.status)}</div><div class="balance-breakdown"><div><small>使用权资产期末余额</small><b>¥ ${money(b.asset)}</b></div><div><small>租赁负债期末余额</small><b>¥ ${money(b.liability)}</b></div></div><div class="detail-grid">${[['承租公司',r.company],['资产类别',r.type],['出租方',r.lessor],['合同期间',r.start+' 至 '+r.end]].map(([k,v])=>`<div><label>${k}</label><p>${esc(v)}</p></div>`).join('')}</div><button class="primary history-open" data-open-history="${r.id}">查看月度余额变化</button>`);}
function setScope(value){scope=value;render();}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{if($('#leaseEditor')&&!$('#leaseEditor').hidden)return requestCloseLease();closeLeaseEditor?.();toast('当前模块为租赁余额总览');});
document.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>setScope(b.dataset.scope));
['search','company','type'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',render));
$('#reset').onclick=()=>{$('#company').value=$('#type').value=$('#search').value='';setScope('all');};
$('#period').onchange=render;
$('#tbody').onclick=e=>{const b=e.target.closest('button');if(!b)return;const r=contracts.find(r=>r.id===(b.dataset.history||b.dataset.detail));if(b.dataset.history)showHistory(r);if(b.dataset.detail)detail(r);};
$('#primary').onclick=()=>openLeaseEditor();
$('#close').onclick=$('#cancel').onclick=closeDrawer;$('#overlay').onclick=e=>{if(e.target===$('#overlay'))closeDrawer();};document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
$('#viewDue').hidden=true;$('#viewDue').onclick=()=>{};
document.querySelectorAll('[data-top]').forEach(b=>b.onclick=()=>{if(b.dataset.top!=='finance')toast('当前原型聚焦租赁余额与合同参数');});
$('#drawerBody').onclick=e=>{const b=e.target.closest('[data-open-history]');if(b){const r=contracts.find(r=>r.id===b.dataset.openHistory);showHistory(r);}};
render();
