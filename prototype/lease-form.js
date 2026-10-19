/* Contract entry prototype: captures financial terms and prepares a review checklist.
   It does not calculate a posting amount or write to an accounting system. */
const leaseDefaults={
 name:'',company:'',lessor:'',type:'房屋及建筑物',start:'2026-10-01',end:'2029-09-30',rent:'',frequency:'3',timing:'advance',discount:'4.20',
 signed:'',rateSource:'incremental',rateEvidence:'',firstPayment:'',taxBasis:'net',servicePolicy:'split',serviceMonthly:'0',
 freeEnabled:false,freePeriods:[{start:'2026-10-01',end:'2026-10-31'}],freeScope:'fixed',
 tieredRent:false,stepMode:'none',stepFirst:'2027-10-01',stepEvery:'12',stepValue:'3',stages:[],
 substanceEnabled:false,substanceMonthly:'0',substanceReason:'',variableType:'none',indexType:'CPI',indexBase:'',indexMonthly:'0',indexFormula:'',otherType:'sales',otherRatio:'',otherEstimate:'0',otherFormula:'',
 renewalEnabled:false,renewalDecision:'pending',renewalMonths:'12',renewalRent:'',renewalReason:'',
 purchaseEnabled:false,purchaseDecision:'pending',purchasePrice:'0',purchaseDate:'2029-09-30',purchaseReason:'',
 terminationEnabled:false,terminationDecision:'pending',terminationDate:'2028-09-30',terminationPenalty:'0',terminationReason:'',
 residualEnabled:false,residualAmount:'0',residualCap:'0',residualReason:'',
 incentiveEnabled:false,incentiveAmount:'0',incentiveDate:'2026-10-01',incentiveReceived:false,
 prepaid:'0',prepaidDate:'2026-10-01',prepaidAllocation:'',directCosts:'0',restorationPV:'0',deposit:'0',
 exemption:'none',newAssetValue:'',lowValueConfirmed:false,notes:''
};
let leaseDraft=null,leaseEditingId=null,leaseAdvancedOpen=false,leaseDirty=false;
const labels={frequency:{1:'每月',3:'每季度',6:'每半年',12:'每年'},timing:{advance:'期间初付',arrears:'期间末付'}};
const clone=value=>JSON.parse(JSON.stringify(value));
function leaseInput(id,label,type='text',hint='',attrs=''){
 return `<div class="lf-field"><label for="lf-${id}">${label}</label><input id="lf-${id}" data-lease="${id}" type="${type}" ${attrs}><small>${hint}</small></div>`;
}
function leaseSelect(id,label,options,hint=''){
 return `<div class="lf-field"><label for="lf-${id}">${label}</label><select id="lf-${id}" data-lease="${id}">${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select><small>${hint}</small></div>`;
}
function leaseText(id,label,hint='',placeholder='请输入判断依据或合同条款'){
 return `<div class="lf-field lf-full"><label for="lf-${id}">${label}</label><textarea id="lf-${id}" data-lease="${id}" rows="2" placeholder="${placeholder}"></textarea><small>${hint}</small></div>`;
}
function leaseToggle(id,title,sub){return `<label class="lf-toggle"><span><b>${title}</b><small>${sub}</small></span><input type="checkbox" id="lf-${id}" data-lease="${id}"><i></i></label>`;}
function leaseGroup(n,title,sub,body){return `<section class="lf-card"><div class="lf-card-head"><span class="lf-number">${n}</span><div><h2>${title}</h2><p>${sub}</p></div></div>${body}</section>`;}
function decision(id,label,options,hint=''){return leaseSelect(id,label,options,hint);}
function leaseAdvancedMarkup(){return `<div class="lf-advanced-note">仅在合同包含相关条款时启用；收起高级参数会保留已填写内容。</div>
 ${leaseGroup('02','租期、免租与付款安排','免租期属于租赁期的一部分；已确定的固定递增条款与指数挂钩条款分别录入。',`
 <div class="lf-grid">${leaseInput('signed','合同签署日','date','用于合同档案，不代替租赁期开始日。')}${leaseInput('firstPayment','首笔约定付款日','date','留空表示按期间初 / 末规则；非标准付款日需复核现金流。')}</div>
 ${leaseToggle('freeEnabled','存在免租期','记录实际免租区间，可添加多个区间。')}<div data-lease-show="freeEnabled" hidden><div id="lfFreeRows"></div><button class="lf-add" type="button" id="lfAddFree">＋ 添加免租区间</button>${leaseSelect('freeScope','免租适用范围',[['fixed','仅固定租金'],['fixed-substance','固定租金 + 额外实质固定付款额']],'其他收费及可变款项是否减免，按合同另行核对。')}</div>
 <div class="lf-grid">${leaseSelect('stepMode','固定租金递增方式',[['none','不递增'],['percent','按固定比例递增'],['amount','按固定金额递增']],'合同预先确定的递增额纳入租赁现金流，不作为未知可变付款额。')}</div><p class="lf-inline-help">如已在基本参数中录入分阶段金额，请保持“不递增”，避免重复调整固定租金。</p>
 <div class="lf-grid" data-step-rule hidden>${leaseInput('stepFirst','首次递增生效日','date')}${leaseInput('stepEvery','后续每隔（月）','number','','min="1" max="120" step="1"')}${leaseInput('stepValue','每次递增幅度','number','比例模式填百分比；金额模式填月租金增加额。','min="0" step="0.01"')}</div>
 `)}
 ${leaseGroup('03','付款额构成与可变条款','固定、实质固定、指数或比率挂钩、业绩或用量挂钩分开记录，避免重复纳入。',`
 ${leaseToggle('substanceEnabled','额外实质固定付款额','不重复包含上方固定租金中已计入的保底金额。')}<div class="lf-grid" data-lease-show="substanceEnabled" hidden>${leaseInput('substanceMonthly','额外实质固定付款额（元 / 月）','number','形式上可变、实质上无法避免的付款额。','min="0" step="0.01"')}${leaseInput('substanceReason','实质固定的判断依据','text','','placeholder="例如：无论实际用量多少均须支付"')}</div>
 <div class="lf-grid">${leaseSelect('variableType','可变租赁付款额',[['none','无可变付款额'],['index','仅与指数或比率挂钩'],['other','仅与销售额、用量等挂钩'],['both','同时存在上述两类']])}</div>
 <div class="lf-condition" data-variable-index hidden><div class="lf-condition-title">指数 / 比率挂钩 <span class="badge green">按开始日水平纳入</span></div><div class="lf-grid">${leaseSelect('indexType','挂钩基准',[['CPI','消费者价格指数 CPI'],['rate','基准利率（如 LPR）'],['market','市场租金费率'],['other','其他指数或比率']])}${leaseInput('indexBase','租赁期开始日基准值','text','标明单位，例如 CPI=102.3 或 LPR=3.50%。','placeholder="填写开始日指数或比率"')}${leaseInput('indexMonthly','按开始日基准确定的额外月额（元）','number','仅填固定租金之外的增量，不重复填写全部租金。','min="0" step="0.01"')}${leaseInput('indexFormula','计算公式 / 调整机制','text','','placeholder="例如：基准月租金 × CPI / 基期 CPI"')}</div><div class="lf-rule">初始计量使用租赁期开始日的指数或比率，不预测其未来变化。未来调整时再评估重计量。</div></div>
 <div class="lf-condition" data-variable-other hidden><div class="lf-condition-title">业绩 / 用量等挂钩 <span class="badge">不纳入初始租赁负债</span></div><div class="lf-grid">${leaseSelect('otherType','挂钩依据',[['sales','销售额 / 营业收入'],['usage','产量 / 使用量'],['other','其他非指数或比率因素']])}${leaseInput('otherRatio','提成比例或单价','text','','placeholder="例如：营业收入的 2% / 20 元每小时"')}${leaseInput('otherEstimate','预计月额（仅预算，元）','number','仅用于预算记录；不据此增加初始租赁负债。','min="0" step="0.01"')}${leaseInput('otherFormula','结算规则','text','','placeholder="填写结算依据、周期及保底约定"')}</div><div class="lf-rule">实际发生时按适用准则处理；如存在不可避免的最低付款，单独在实质固定部分记录。</div></div>`)}
 ${leaseGroup('04','续租、购买与提前终止选择权','先记录合同权利，再记录财务判断及其依据；选择“有该权利”不等于自动纳入计量。',`
 ${leaseToggle('renewalEnabled','续租选择权','合理确定将行使时，相关期间纳入核算租赁期。')}<div class="lf-grid" data-lease-show="renewalEnabled" hidden>${decision('renewalDecision','是否合理确定行使续租权',[['pending','待财务判断'],['yes','合理确定将行使'],['no','未达到合理确定将行使']])}${leaseInput('renewalMonths','可续租期限（月）','number','','min="1" max="600" step="1"')}${leaseInput('renewalRent','续租期固定月租金（元）','number','留空不代表沿用原租金；需按续租条款确认。','min="0" step="0.01"')}${leaseInput('renewalReason','续租判断依据','text','','placeholder="例如：重大装修投入、搬迁成本"')}</div>
 ${leaseToggle('purchaseEnabled','购买选择权','合理确定将行使时，纳入行权价格；有购买权的租赁不属于短期租赁。')}<div class="lf-grid" data-lease-show="purchaseEnabled" hidden>${decision('purchaseDecision','是否合理确定行使购买权',[['pending','待财务判断'],['yes','合理确定将行使'],['no','未达到合理确定将行使']])}${leaseInput('purchasePrice','购买行权价格（元）','number','','min="0" step="0.01"')}${leaseInput('purchaseDate','购买行权日期','date','提前购买安排需同步复核后续租金是否终止。')}${leaseInput('purchaseReason','购买判断依据','text','','placeholder="例如：优惠购买价、资产专用性"')}</div>
 ${leaseToggle('terminationEnabled','提前终止选择权','核算租赁期反映将行使时，纳入相应终止付款。')}<div class="lf-grid" data-lease-show="terminationEnabled" hidden>${decision('terminationDecision','终止权的财务判断',[['pending','待财务判断'],['no','合理确定不会行使'],['yes','租赁期反映将行使']])}${leaseInput('terminationDate','可行使 / 拟终止日期','date','选择将行使时，核算租赁期截至该日。')}${leaseInput('terminationPenalty','行使终止权应付款（元）','number','仅在租赁期反映将行使时纳入。','min="0" step="0.01"')}${leaseInput('terminationReason','终止权判断依据','text','','placeholder="记录终止激励、违约成本等判断"')}</div>`)}
 ${leaseGroup('05','其他初始确认要素','按已付租金、租赁激励、资产成本、担保余值及单独核算事项分类填写。',`
 <div class="lf-initial-sections">
 <section class="lf-initial-section"><div class="lf-initial-heading"><h3>已付租金</h3><p>记录租赁期开始日及之前已支付的租金，匹配所属期间，避免重复计入租赁负债。</p></div><div class="lf-grid">${leaseInput('prepaid','已付租金金额（元）','number','','min="0" step="0.01"')}${leaseInput('prepaidDate','已付租金付款日期','date')}${leaseText('prepaidAllocation','已付租金对应期间','明确已付款项对应的租金期间。','例如：2026年10月至12月租金')}</div></section>
 <section class="lf-initial-section"><div class="lf-initial-heading"><h3>租赁激励</h3><p>区分开始日及之前已享受的激励和未来应收激励；已在租金中体现的免租优惠不重复扣减。</p></div>${leaseToggle('incentiveEnabled','存在租赁激励或租金返还','合同另行约定的补贴、返还等优惠。')}<div class="lf-grid" data-lease-show="incentiveEnabled" hidden>${leaseInput('incentiveAmount','租赁激励金额（元）','number','','min="0" step="0.01"')}${leaseInput('incentiveDate','已收或预计收取日期','date')}<label class="lf-check lf-full"><input type="checkbox" data-lease="incentiveReceived" id="lf-incentiveReceived">租赁期开始日及之前已享受（调整使用权资产成本）</label></div></section>
 <section class="lf-initial-section"><div class="lf-initial-heading"><h3>使用权资产相关成本</h3><p>初始直接费用和复原、拆除义务分别记录，不作为租金付款额加入租赁负债。</p></div><div class="lf-grid">${leaseInput('directCosts','初始直接费用（元）','number','为取得该租赁新增的直接费用。','min="0" step="0.01"')}${leaseInput('restorationPV','复原或拆除义务现值（元）','number','另行确认相应义务，并复核使用权资产成本。','min="0" step="0.01"')}</div></section>
 <section class="lf-initial-section"><div class="lf-initial-heading"><h3>担保余值</h3><p>单独记录合同担保上限和预计应付金额；计量时采用预计应付金额。</p></div>${leaseToggle('residualEnabled','存在承租人担保余值','仅在合同约定承租人承担余值担保时启用。')}<div class="lf-grid" data-lease-show="residualEnabled" hidden>${leaseInput('residualAmount','担保余值预计应付金额（元）','number','','min="0" step="0.01"')}${leaseInput('residualCap','合同担保上限（元）','number','','min="0" step="0.01"')}${leaseText('residualReason','预计付款的估计依据')}</div></section>
 <section class="lf-initial-section"><div class="lf-initial-heading"><h3>押金与非租赁服务</h3><p>押金和物业等服务费用单独记录，并明确租赁与非租赁部分是否分拆。</p></div><div class="lf-grid">${leaseInput('deposit','可退还租赁押金（元）','number','单独核算，不直接加入租赁负债。','min="0" step="0.01"')}${leaseInput('serviceMonthly','单列服务费（元 / 月）','number','例如物业服务费，勿与固定租金重复录入。','min="0" step="0.01"')}${leaseSelect('servicePolicy','租赁与非租赁部分的处理',[['split','分拆（服务费单独核算）'],['combine','按适用类别政策选择不分拆']],'选择不分拆时，须确认公司对该资产类别采用相应政策。')}</div></section>
 <section class="lf-initial-section"><div class="lf-initial-heading"><h3>增值税口径</h3><p>确认录入金额是否已剔除可抵扣增值税，与合同租金的含税口径保持对应。</p></div><div class="lf-grid">${leaseSelect('taxBasis','金额中的可抵扣增值税',[['net','已剔除可抵扣增值税'],['review','尚未分离，需财务复核']],'不可抵扣税额按公司核算政策另行确认。')}</div></section>
 </div>`)}
 ${leaseGroup('06','核算判断与复核记录','记录折现率来源、简化处理选择及财务判断依据。',`
 <div class="lf-grid">${leaseInput('rateSourceLabel','折现率口径','text','本原型仅记录年化利率，不自动选取市场利率。','value="年化折现率，具体换算口径待核算配置" readonly')}${leaseSelect('rateSource','折现率来源',[['incremental','无法确定内含利率，采用增量借款利率'],['implicit','可确定租赁内含利率']],'优先采用租赁内含利率；无法确定时采用承租人增量借款利率。')}${leaseText('rateEvidence','利率选取依据 / 审批说明','记录币种、期限、抵押条件、经济环境及利率来源。')}${leaseSelect('exemption','是否选择简化处理',[['none','一般租赁核算'],['short','短期租赁简化处理'],['low','低价值资产租赁简化处理']],'需符合准则条件及公司会计政策；系统不按金额自动认定。')}</div><div class="lf-grid" data-low-value hidden>${leaseInput('newAssetValue','单项资产全新时的价值（元）','number','','min="0" step="0.01"')}<label class="lf-check"><input type="checkbox" id="lf-lowValueConfirmed" data-lease="lowValueConfirmed">已评估低价值条件，且不转租 / 预期转租</label></div>${leaseText('notes','其他条款与复核备注','可记录多次选择权、非标准付款安排等需要补充复核的条款。')}
 <div class="lf-source">口径依据：<a href="https://czt.hunan.gov.cn/czt/ztzl/lwpf/lwpfjxs/flzd/201812/t20181229_5251198.html" target="_blank" rel="noopener">《企业会计准则第21号——租赁》</a>第 15—18、24、30—34 条。此页用于参数录入与计量要素检查。</div>`)}
`;}
function buildLeaseEditor(){
 const editor=document.createElement('main');editor.id='leaseEditor';editor.className='lease-editor';editor.hidden=true;document.body.append(editor);
 editor.innerHTML=`<div class="lf-heading"><div><div class="breadcrumb">财务管理 / <button class="link" data-lease-back>租赁台账</button> / 新增租赁合同</div><h1 id="lf-title">新增租赁合同 <span class="badge yellow">草稿</span></h1><p>先录入常用条款，复杂租赁再展开高级参数。</p></div><button class="ghost" data-lease-back>← 返回台账</button></div>
 <div class="lf-layout"><form id="leaseForm" novalidate><div class="lf-form-intro"><span>承租人核算</span><span>人民币 CNY</span><span>企业会计准则第 21 号</span></div>
 ${leaseGroup('01','合同与基本财务参数','日常合同主要填写这一部分。金额统一以“月度计价”为基础，付款频率决定合并支付的月数。',`
 <div class="lf-grid">${leaseInput('name','租赁项目 / 合同名称 <em>*</em>','text','', 'placeholder="例如：苏州研发中心办公楼" maxlength="80" required')}${leaseSelect('company','承租公司',[['','请选择承租公司'],...['西安普源精电科技有限公司','深圳普源精电科技有限公司','北京普源耐数电子有限公司','北京耐数信息有限公司','北京普源精电科技有限公司','普源精电科技股份有限公司'].map(name=>[name,name])])}${leaseInput('lessor','出租方 <em>*</em>','text','','placeholder="请输入出租方全称" maxlength="100" required')}${leaseSelect('type','资产类别',[['房屋及建筑物','房屋及建筑物'],['设备','设备'],['车辆','车辆']])}
 ${leaseInput('start','租赁期开始日 <em>*</em>','date','资产可供使用的日期，包含可使用的免租期。','required')}${leaseInput('end','合同约定到期日 <em>*</em>','date','续租及提前终止的财务判断在高级参数中设置。','required')}
 ${leaseInput('rent','首段固定租金（元 / 月）<em>*</em>','number','填写租赁期开始时适用的固定月租金。','min="0" step="0.01" placeholder="例如：30000.00" required')}${leaseSelect('frequency','付款频率',[['1','每月支付'],['3','每季度支付'],['6','每半年支付'],['12','每年支付']],'付款金额按每期适用的月租金 × 付款月数确定。')}
 <div class="lf-full"><label class="lf-toggle lf-tiered-toggle"><span><b>租期内固定月租金有变化</b><small>例如第二年、第三年按合同约定调整金额</small></span><input type="checkbox" id="lf-tieredRent" data-lease="tieredRent"><i></i></label><div data-lease-show="tieredRent" hidden><div id="lfStageRows"></div><button type="button" class="lf-add" id="lfAddStage">＋ 添加租金阶段</button><p class="lf-inline-help">上方金额适用于租赁期开始日至首个阶段前；每个阶段从生效日起适用至下一阶段生效日前，末段延续至租赁期结束。</p></div></div>
 ${leaseSelect('timing','付款时点',[['advance','期间初付（预付）'],['arrears','期间末付（后付）']],'以每个付款覆盖期间为单位；具体付款日可在高级中另行约定。')}${leaseInput('discount','年化折现率（%）','number','4.20% 为演示值，请依据公司利率政策确认。','min="0" max="100" step="0.01" placeholder="例如：4.20"')}
 </div><div class="lf-defaults"><span>当前默认</span><b>无免租期</b><b>租金不递增</b><b>无额外付款及选择权</b><b>已剔除可抵扣增值税</b></div>`)}
 <button class="lf-advanced-trigger" id="lfAdvancedTrigger" type="button" aria-expanded="false" aria-controls="lfAdvanced"><span class="lf-advanced-icon">⚙</span><span><b>高级财务参数</b><small>免租期、租金递增、可变付款、选择权与初始确认调整</small></span><span id="lfAdvancedCount">按需展开</span><span id="lfAdvancedArrow">⌄</span></button>
 <div id="lfAdvanced" hidden>${leaseAdvancedMarkup()}
 </div><div class="lf-error" id="lfErrors" hidden role="alert"></div>
 <div class="lf-actions"><span>保存为“待核算”草稿，待复核后形成正式测算。</span><button class="ghost" type="button" data-lease-back>取消</button><button class="ghost" type="button" id="lfGenerate">生成计算表</button><button class="primary" type="submit">保存合同草稿</button></div></form>
 <div class="lf-summary-column"><section class="lf-summary"><div class="lf-summary-title"><b>财务参数摘要</b><span class="badge">实时更新</span></div><div class="lf-term"><small>核算租赁期（按当前判断）</small><strong id="lfTerm">—</strong><span id="lfTermDates"></span></div><dl id="lfSummaryValues"></dl><div class="lf-summary-separator"></div><h3>初始计量要素</h3><div id="lfChecks"></div><button class="primary lf-check-button" type="button" id="lfReview">检查计量要素 →</button><p class="lf-summary-help">本页不生成负债确认金额；保存条款后先复核现金流，再形成初始计量结果。</p></section><section class="lf-sap-note"><b>▧　与 SAP 的分工</b><p>台账提供财务参数、测算及计提明细。财务在 SAP 手工录入会计凭证。</p></section><button type="button" class="lf-example" id="lfExample">填入一组示例，看看录入效果</button></div></div>`;
 editor.addEventListener('input',e=>{if(e.target.matches('[data-lease]')){leaseDraft[e.target.dataset.lease]=e.target.type==='checkbox'?e.target.checked:e.target.value;leaseDirty=true;updateLeaseSummary();if(['start','end'].includes(e.target.dataset.lease))renderLeaseRepeats();}if(e.target.matches('[data-repeat-field]')){leaseDraft[e.target.dataset.repeat][Number(e.target.dataset.index)][e.target.dataset.repeatField]=e.target.value;leaseDirty=true;updateLeaseSummary();if(e.target.dataset.repeat==='stages')renderLeaseRepeats();}});
 editor.addEventListener('change',e=>{if(e.target.matches('input[type=checkbox][data-lease]')&&e.target.dataset.lease==='tieredRent'&&e.target.checked&&!leaseDraft.stages.length)leaseDraft.stages.push({start:addLeaseMonths(leaseDraft.start,12),amount:''});if(e.target.matches('select[data-lease],input[type=checkbox][data-lease]')){renderLeaseRepeats();updateLeaseConditions();}});
 editor.addEventListener('click',e=>{const remove=e.target.closest('[data-remove-repeat]');if(remove){leaseDraft[remove.dataset.removeRepeat].splice(Number(remove.dataset.index),1);leaseDirty=true;renderLeaseRepeats();updateLeaseSummary();}if(e.target.closest('[data-lease-back]'))requestCloseLease();});
 $('#lfAdvancedTrigger').onclick=()=>{leaseAdvancedOpen=!leaseAdvancedOpen;syncLeaseAdvanced();};
 $('#lfAddFree').onclick=()=>{leaseDraft.freePeriods.push({start:'',end:''});leaseDirty=true;renderLeaseRepeats();};
 $('#lfAddStage').onclick=()=>{leaseDraft.stages.push({start:'',amount:''});leaseDirty=true;renderLeaseRepeats();};
 $('#leaseForm').onsubmit=e=>{e.preventDefault();saveLeaseDraft();};$('#lfReview').onclick=reviewLeaseDraft;$('#lfExample').onclick=fillLeaseExample;$('#lfGenerate').onclick=()=>prepareCalculationFromContract();
}
function openLeaseEditor(record){
 if(!$('#leaseEditor'))buildLeaseEditor();
 leaseEditingId=record?.id||null;leaseDraft=record?clone(record.financialParameters):clone(leaseDefaults);leaseAdvancedOpen=false;leaseDirty=false;
 $('main:not(#leaseEditor)').hidden=true;$('#leaseEditor').hidden=false;$('#lf-title').innerHTML=(record?'编辑租赁合同':'新增租赁合同')+' <span class="badge yellow">待核算草稿</span>';
 populateLeaseForm();$('#lfErrors').hidden=true;window.scrollTo(0,0);$('#lf-name').focus({preventScroll:true});
}
function populateLeaseForm(){
 document.querySelectorAll('#leaseForm [data-lease]').forEach(el=>{const v=leaseDraft[el.dataset.lease];if(v===undefined)return;if(el.type==='checkbox')el.checked=Boolean(v);else el.value=v;});
 renderLeaseRepeats();syncLeaseAdvanced();updateLeaseConditions();
}
function syncLeaseAdvanced(){$('#lfAdvanced').hidden=!leaseAdvancedOpen;$('#lfAdvancedTrigger').setAttribute('aria-expanded',String(leaseAdvancedOpen));$('#lfAdvancedArrow').textContent=leaseAdvancedOpen?'⌃':'⌄';$('#lfAdvancedCount').textContent=leaseAdvancedOpen?'收起参数':advancedCount()?`${advancedCount()} 项已配置`:'按需展开';}
function dayBefore(iso){if(!iso)return '';const d=new Date(iso+'T00:00:00Z');if(!Number.isFinite(d.getTime()))return '';d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
function leaseStagePeriods(d=leaseDraft){const stages=d.stages.map((r,index)=>({...r,index})).sort((a,b)=>a.start.localeCompare(b.start));return stages.map((r,i)=>({...r,until:dayBefore(stages[i+1]?.start)||leaseEffectiveEnd(d)}));}
function renderLeaseRepeats(){
 $('#lfFreeRows').innerHTML=leaseDraft.freePeriods.map((r,i)=>`<div class="lf-repeat"><span>${String(i+1).padStart(2,'0')}</span><label>免租开始日<input type="date" aria-label="免租开始日 ${i+1}" data-repeat="freePeriods" data-repeat-field="start" data-index="${i}" value="${esc(r.start)}"></label><label>免租结束日<input type="date" aria-label="免租结束日 ${i+1}" data-repeat="freePeriods" data-repeat-field="end" data-index="${i}" value="${esc(r.end)}"></label><button class="link" type="button" data-remove-repeat="freePeriods" data-index="${i}" aria-label="删除免租区间 ${i+1}">删除</button></div>`).join('');
 const periods=leaseStagePeriods(),first=periods[0];
 $('#lfStageRows').innerHTML=`<div class="lf-repeat lf-stage-row lf-stage-base"><span>01</span><div class="lf-stage-base-label"><b>首段固定月租金</b><small>适用期间：${esc(leaseDraft.start||'租赁开始日待填')} 至 ${esc(first?dayBefore(first.start):leaseEffectiveEnd(leaseDraft)||'合同结束日待填')}</small></div><strong>¥ ${money(leaseDraft.rent||0)} / 月</strong></div>`+periods.map((r,i)=>`<div class="lf-repeat lf-stage-row"><span>${String(i+2).padStart(2,'0')}</span><label>阶段生效日<input type="date" aria-label="阶段生效日 ${i+1}" data-repeat="stages" data-repeat-field="start" data-index="${r.index}" value="${esc(r.start)}"></label><label>固定月租金（元）<input type="number" min="0" step="0.01" aria-label="阶段固定月租金 ${i+1}" data-repeat="stages" data-repeat-field="amount" data-index="${r.index}" value="${esc(r.amount)}"></label><button class="link" type="button" data-remove-repeat="stages" data-index="${r.index}" aria-label="删除租金阶段 ${i+1}">删除</button><small class="lf-stage-range">适用期间：${esc(r.start||'待填写')} 至 ${esc(r.until||'合同结束日待填')}</small></div>`).join('');
}
function updateLeaseConditions(){
 document.querySelectorAll('[data-lease-show]').forEach(el=>el.hidden=!leaseDraft[el.dataset.leaseShow]);
 $('[data-step-rule]').hidden=!['percent','amount'].includes(leaseDraft.stepMode);
 $('[data-variable-index]').hidden=!['index','both'].includes(leaseDraft.variableType);$('[data-variable-other]').hidden=!['other','both'].includes(leaseDraft.variableType);$('[data-low-value]').hidden=leaseDraft.exemption!=='low';
 updateLeaseSummary();
}
function addLeaseMonths(iso,n){const d=new Date(iso+'T00:00:00Z');if(!Number.isFinite(d.getTime())||!Number.isFinite(Number(n))||Number(n)<0||Number(n)>1200)return '';const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+Number(n));const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';}
function leaseEffectiveEnd(d){let end=d.end;if(d.renewalEnabled&&d.renewalDecision==='yes')end=addLeaseMonths(d.end,d.renewalMonths);if(d.terminationEnabled&&d.terminationDecision==='yes'&&d.terminationDate)end=d.terminationDate;return end;}
function leaseMonths(start,end){if(!start||!end||end<start)return 0;const a=new Date(start+'T00:00:00Z'),b=new Date(end+'T00:00:00Z');return (b.getUTCFullYear()-a.getUTCFullYear())*12+b.getUTCMonth()-a.getUTCMonth()+(b.getUTCDate()>=a.getUTCDate()?1:0);}
function advancedCount(){const d=leaseDraft;return [d.tieredRent,d.freeEnabled,d.stepMode!=='none',d.substanceEnabled,d.variableType!=='none',d.renewalEnabled,d.purchaseEnabled,d.terminationEnabled,d.residualEnabled,d.incentiveEnabled,Number(d.prepaid)>0,Number(d.directCosts)>0,Number(d.restorationPV)>0,Number(d.deposit)>0,Number(d.serviceMonthly)>0,d.exemption!=='none'].filter(Boolean).length;}
function leaseChecklist(d){
 const hasIndex=['index','both'].includes(d.variableType),hasOther=['other','both'].includes(d.variableType);
 return [
  {name:'固定与实质固定付款额',state:'纳入',color:'green',text:`首段固定租金 ${money(d.rent||0)} 元 / 月${d.tieredRent?`；后续分阶段：${leaseStagePeriods(d).map(r=>`${r.start} 起 ${money(r.amount||0)} 元 / 月`).join('；')}`:''}${d.substanceEnabled?`；额外实质固定 ${money(d.substanceMonthly||0)} 元 / 月`:''}。${d.stepMode!=='none'?'按已约定的递增规则纳入现金流。':''}`},
  {name:'免租期',state:d.freeEnabled?'已配置':'无',color:d.freeEnabled?'yellow':'',text:d.freeEnabled?`${d.freePeriods.map(r=>r.start+' 至 '+r.end).join('；')}。免租期内符合约定的租金为零，但仍属于租赁期。`:'按完整租赁期记录租金。'},
  {name:'指数 / 比率挂钩的可变款',state:hasIndex?'纳入':'无',color:hasIndex?'green':'',text:hasIndex?`按开始日基准 ${d.indexBase||'待填写'} 确定额外月额 ${money(d.indexMonthly||0)} 元；不预测未来指数变化。`:'无该类付款额。'},
  {name:'销售额 / 用量等可变款',state:hasOther?'排除':'无',color:'',text:hasOther?`预算月额 ${money(d.otherEstimate||0)} 元，不纳入初始租赁负债；实际发生时按适用准则处理。`:'无该类付款额。'},
  {name:'续租选择权',state:!d.renewalEnabled?'无':d.renewalDecision==='yes'?'纳入租期':d.renewalDecision==='pending'?'待判断':'不纳入',color:d.renewalEnabled?(d.renewalDecision==='pending'?'yellow':'green'):'',text:!d.renewalEnabled?'无续租权。':d.renewalDecision==='yes'?`合理确定行使，增加 ${d.renewalMonths} 个月，续租固定月租金 ${money(d.renewalRent||0)} 元。`:d.renewalDecision==='pending'?'尚待财务判断是否合理确定行使；当前摘要暂未延长租赁期。':'未达到合理确定将行使，不增加租赁期。'},
  {name:'购买选择权行权价',state:!d.purchaseEnabled?'无':d.purchaseDecision==='yes'?'纳入':d.purchaseDecision==='pending'?'待判断':'不纳入',color:d.purchaseEnabled?(d.purchaseDecision==='pending'?'yellow':'green'):'',text:!d.purchaseEnabled?'无购买权。':d.purchaseDecision==='yes'?`${d.purchaseDate} 行权，价格 ${money(d.purchasePrice||0)} 元；提前购买时另行复核租期与现金流。`:d.purchaseDecision==='pending'?'尚待判断是否合理确定行使。':'未达到合理确定将行使，不纳入购买价。'},
  {name:'提前终止付款',state:!d.terminationEnabled?'无':d.terminationDecision==='yes'?'纳入':d.terminationDecision==='pending'?'待判断':'不纳入',color:d.terminationEnabled?(d.terminationDecision==='pending'?'yellow':'green'):'',text:!d.terminationEnabled?'无提前终止权。':d.terminationDecision==='yes'?`核算租赁期截至 ${d.terminationDate}，计入终止付款 ${money(d.terminationPenalty||0)} 元。`:d.terminationDecision==='pending'?'租赁期与终止付款均待财务判断。':'合理确定不会行使，按完整核算租赁期，不计入终止付款。'},
  {name:'担保余值预计应付款',state:d.residualEnabled?'纳入':'无',color:d.residualEnabled?'green':'',text:d.residualEnabled?`预计应付 ${money(d.residualAmount||0)} 元，合同上限 ${money(d.residualCap||0)} 元；以预计应付额计量。`:'无担保余值预计付款。'},
  {name:'租赁激励',state:d.incentiveEnabled?(d.incentiveReceived?'调整资产':'扣减付款'):'无',color:d.incentiveEnabled?'yellow':'',text:d.incentiveEnabled?`${d.incentiveDate}，${money(d.incentiveAmount||0)} 元。${d.incentiveReceived?'已享受部分调整使用权资产成本。':'未来激励按对应时间扣减租赁付款额。'}不得与免租期重复扣减。`:'无单独租赁激励。'},
  {name:'开始日及之前已付租金',state:Number(d.prepaid)>0?'剔除已付部分':'无',color:Number(d.prepaid)>0?'yellow':'',text:Number(d.prepaid)>0?`${money(d.prepaid)} 元；匹配已付期间后从负债现金流中剔除，并计入使用权资产成本。`:'初始租赁负债仅计量开始日尚未支付的租赁付款额；期间初付不等于已经支付。'},
  {name:'初始费用 / 复原义务 / 押金',state:'单独评估',color:'',text:`初始直接费用 ${money(d.directCosts||0)} 元，复原义务现值 ${money(d.restorationPV||0)} 元，押金 ${money(d.deposit||0)} 元。前两项复核使用权资产成本，押金另行评估；不直接作为租赁付款额加入负债。`},
  {name:'非租赁部分及税额',state:d.taxBasis==='review'?'待分离':'按政策',color:d.taxBasis==='review'?'yellow':'',text:`服务费 ${money(d.serviceMonthly||0)} 元 / 月；${d.servicePolicy==='split'?'分拆后单独核算':'按适用类别政策不分拆时，需复核合并计量'}。${d.taxBasis==='net'?'录入金额已剔除可抵扣增值税。':'金额税额口径尚待分离确认。'}`}
 ];
}
function updateLeaseSummary(){
 const d=leaseDraft,end=leaseEffectiveEnd(d),months=leaseMonths(d.start,end),pending=['renewal','purchase','termination'].some(k=>d[k+'Enabled']&&d[k+'Decision']==='pending');
 $('#lfTerm').textContent=months?`${months} 个月${pending?' · 待判断':''}`:'待填写';$('#lfTermDates').textContent=d.start&&end?`${d.start} — ${end}`:'完善起止日期后显示';
 const rentStages=d.tieredRent?leaseStagePeriods(d).map(r=>`${r.start} 起 ¥ ${money(r.amount||0)}/月`).join('；'):'全租期按首段月租金';
 const values=[['首段固定月租金',d.rent===''?'待填写':`¥ ${money(d.rent)}`],['固定租金阶段',rentStages],['付款安排',`${labels.frequency[d.frequency]} · ${labels.timing[d.timing]}`],['年化折现率',d.discount===''?'待确认':`${d.discount}%`],['核算方式',d.exemption==='none'?'一般租赁':d.exemption==='short'?'短期租赁简化处理':'低价值资产简化处理']];
 $('#lfSummaryValues').innerHTML=values.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')+'<p class="lf-summary-help">每期现金流按付款时点、付款频率和对应日期适用的固定租金确定。</p>';
 const checks=leaseChecklist(d),keys=[0,2,3,4,5,6,7,9];$('.lf-summary h3').textContent=d.exemption==='none'?'初始计量要素':'条款记录（简化处理待复核）';$('#lfChecks').innerHTML=keys.map(i=>`<div class="lf-check-row"><span>${checks[i].name}</span><span class="badge ${d.exemption==='none'?checks[i].color:''}">${d.exemption==='none'?checks[i].state:checks[i].state==='无'?'无':'记录'}</span></div>`).join('');
 $('.lf-defaults').hidden=advancedCount()>0;syncLeaseAdvanced();
}
function validateLeaseDraft(review=false){
 const d=leaseDraft,errors=[],end=leaseEffectiveEnd(d),amount=(key,label)=>{if(d[key]===''||!Number.isFinite(Number(d[key]))||Number(d[key])<0)errors.push(label+'须为不小于 0 的金额。');},required=(key,label)=>{if(!String(d[key]??'').trim())errors.push('请填写'+label+'。');};
 required('name','租赁项目名称');required('lessor','出租方');required('start','租赁期开始日');required('end','合同到期日');amount('rent','固定月租金');if(d.start&&d.end&&d.end<d.start)errors.push('合同到期日不得早于租赁期开始日。');
 if(d.discount!==''&&(!Number.isFinite(Number(d.discount))||Number(d.discount)<0||Number(d.discount)>100))errors.push('折现率须在 0% 至 100% 之间。');if(review&&d.discount===''&&d.exemption==='none')errors.push('初始计量前需要确认折现率。');
 if(d.freeEnabled){if(!d.freePeriods.length)errors.push('请至少添加一个免租区间。');const sorted=[...d.freePeriods].sort((a,b)=>a.start.localeCompare(b.start));sorted.forEach((r,i)=>{if(!r.start||!r.end||r.end<r.start||r.start<d.start||r.end>end)errors.push(`免租区间 ${i+1} 的起止日期须有效且在核算租赁期内。`);if(i&&r.start<=sorted[i-1].end)errors.push('免租区间不能重复或重叠。');});}
 if(['percent','amount'].includes(d.stepMode)){required('stepFirst','首次递增生效日');if(d.stepFirst<=d.start||d.stepFirst>end)errors.push('首次递增日须晚于开始日，且在核算租赁期内。');if(!Number.isInteger(Number(d.stepEvery))||Number(d.stepEvery)<=0)errors.push('递增间隔须为正整数月。');amount('stepValue','递增幅度');}
 if(d.tieredRent&&d.stepMode!=='none')errors.push('分阶段租金与自动递增规则请择一使用，避免固定租金重复调整。');
 if(d.tieredRent){if(!d.stages.length)errors.push('请至少添加一个租金阶段。');const dates=new Set();d.stages.forEach((r,i)=>{if(!r.start||r.start<=d.start||r.start>end||dates.has(r.start))errors.push(`租金阶段 ${i+1} 的生效日须在租赁期开始日之后、租赁期内，且不得重复。`);dates.add(r.start);if(r.amount===''||!Number.isFinite(Number(r.amount))||Number(r.amount)<0)errors.push(`请填写租金阶段 ${i+1} 的有效月租金。`);});}
 if(d.substanceEnabled)amount('substanceMonthly','实质固定付款额');
 if(['index','both'].includes(d.variableType)){amount('indexMonthly','指数或比率挂钩月额');if(review){required('indexBase','开始日指数或比率');required('indexFormula','指数挂钩的计算公式 / 调整机制');}}
 if(['other','both'].includes(d.variableType))amount('otherEstimate','其他可变付款预算额');
 ['renewal','purchase','termination'].forEach(k=>{if(d[k+'Enabled']&&d[k+'Decision']==='pending'&&review)errors.push(({renewal:'续租',purchase:'购买',termination:'提前终止'})[k]+'选择权需要完成财务判断；可以先保存草稿。');});
 if(d.renewalEnabled){if(!Number.isInteger(Number(d.renewalMonths))||Number(d.renewalMonths)<=0||Number(d.renewalMonths)>600)errors.push('续租期限须为 1 至 600 的整数月。');if(d.renewalDecision==='yes')amount('renewalRent','续租月租金');}
 if(d.purchaseEnabled){amount('purchasePrice','购买行权价格');required('purchaseDate','购买行权日期');if(d.purchaseDate<d.start||d.purchaseDate>end)errors.push('购买行权日期须在核算租赁期内。');}
 if(d.terminationEnabled){amount('terminationPenalty','提前终止付款');required('terminationDate','选择权可行使 / 拟终止日期');const fullEnd=d.renewalEnabled&&d.renewalDecision==='yes'?addLeaseMonths(d.end,d.renewalMonths):d.end;if(d.terminationDate<d.start||d.terminationDate>=fullEnd)errors.push('提前终止日须在租赁期开始日及之后、完整核算到期日之前。');}
 if(d.residualEnabled){amount('residualAmount','担保余值预计应付');amount('residualCap','担保上限');if(Number(d.residualAmount)>Number(d.residualCap))errors.push('担保余值预计应付不能大于合同担保上限。');}
 if(d.incentiveEnabled){amount('incentiveAmount','租赁激励');required('incentiveDate','激励收取日');if(d.incentiveReceived&&d.incentiveDate>d.start)errors.push('开始日之前已享受的激励，收取日不能晚于开始日。');if(!d.incentiveReceived&&d.incentiveDate<d.start)errors.push('未来激励收取日不能早于租赁期开始日。');}
 ['prepaid','directCosts','restorationPV','deposit','serviceMonthly'].forEach(k=>amount(k,({prepaid:'已付租金',directCosts:'初始直接费用',restorationPV:'复原义务现值',deposit:'押金',serviceMonthly:'服务费'})[k]));
 if(Number(d.prepaid)>0){required('prepaidDate','已付租金的付款日');required('prepaidAllocation','已付租金对应期间');if(d.prepaidDate>d.start)errors.push('开始日及之前已付租金的付款日不能晚于租赁期开始日。');}
 if(d.exemption==='short'){const maxEnd=new Date(addLeaseMonths(d.start,12)+'T00:00:00Z');if(Number.isFinite(maxEnd.getTime())){maxEnd.setUTCDate(maxEnd.getUTCDate()-1);if(end&&end>maxEnd.toISOString().slice(0,10))errors.push('核算租赁期超过 12 个月，不能选择短期租赁简化处理。');}if(d.purchaseEnabled)errors.push('合同包含购买选择权，不属于短期租赁，即使预计不行使。');}
 if(review)['renewal','purchase','termination'].forEach(k=>{if(d[k+'Enabled'])required(k+'Reason',({renewal:'续租',purchase:'购买',termination:'终止权'})[k]+'判断依据');});
 if(d.exemption==='low'&&review){amount('newAssetValue','资产全新时价值');if(!d.lowValueConfirmed)errors.push('低价值简化处理需要确认适用条件，且无转租或预期转租。');}
 return [...new Set(errors)];
}
function showLeaseErrors(errors){const el=$('#lfErrors');el.hidden=!errors.length;el.innerHTML='<b>请检查以下信息</b><ul>'+errors.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>';if(errors.length)el.scrollIntoView({behavior:'smooth',block:'center'});}
function reviewLeaseDraft(){
 const errors=validateLeaseDraft(true);showLeaseErrors(errors);if(errors.length){toast('部分计量要素尚未完善；可补充后检查，也可先保存草稿');return;}
 const d=leaseDraft,checks=leaseChecklist(d),exempt=d.exemption!=='none';
 openDrawer('初始计量要素检查',`<div class="detail-banner"><small>${esc(d.name)} · ${esc(d.company)}</small><strong style="font-size:17px">${exempt?'已选择简化处理，需复核适用条件':'参数已具备检查基础，待生成并复核现金流'}</strong><small>核算期间：${d.start} 至 ${leaseEffectiveEnd(d)} · ${labels.frequency[d.frequency]} · ${labels.timing[d.timing]}</small></div>${exempt?'<div class="helper">符合条件且按公司政策选择简化处理时，可不确认使用权资产及租赁负债；以下构成清单用于条款记录，不代表仍需确认负债。</div>':''}<div class="lf-review-list">${checks.map(c=>`<section><div><b>${c.name}</b>${badge(c.state)}</div><p>${esc(c.text)}</p></section>`).join('')}</div><div class="helper">此处完成参数与纳入范围检查，未生成正式现值或摊销表。后续需复核实际付款日、已付金额匹配、税额和特殊条款。</div>`,null,null,'新增合同 / 财务核对清单');
}
function saveLeaseDraft(){
 const errors=validateLeaseDraft(false);showLeaseErrors(errors);if(errors.length)return;
 const d=clone(leaseDraft),existing=contracts.find(r=>r.id===leaseEditingId),record={id:leaseEditingId||'LS-DEMO-'+String(contracts.length+1).padStart(3,'0'),name:d.name.trim(),lessor:d.lessor.trim(),company:d.company,type:d.type,rent:Number(d.rent),start:d.start,end:d.end,asset:0,liability:0,depreciation:0,interest:0,status:'待核算',financialParameters:d};
 if(existing)Object.assign(existing,record);else contracts.push(record);
 leaseDirty=false;closeLeaseEditor();page='ledger';setScope('all');$('#company').value=$('#type').value=$('#search').value='';render();toast('合同财务参数已保存为待核算草稿；刷新页面后恢复示例数据');
}
function requestCloseLease(afterClose){const finish=()=>{closeLeaseEditor();if(typeof afterClose==='function')afterClose();};if(leaseDirty){openDrawer('离开合同录入',`<div class="helper">当前有尚未保存的修改。返回继续填写，或放弃本次修改离开合同录入。</div>`,'放弃修改',()=>{closeDrawer();leaseDirty=false;finish();},'未保存的草稿');}else finish();}
function closeLeaseEditor(){if(!$('#leaseEditor')||$('#leaseEditor').hidden)return;$('#leaseEditor').hidden=true;$('main:not(#leaseEditor)').hidden=false;window.scrollTo(0,0);}
function fillLeaseExample(){
 const fill=()=>{leaseDraft={...clone(leaseDefaults),name:'苏州研发办公用房（财务参数示例）',lessor:'苏州示例园区运营有限公司',rent:'30000',tieredRent:true,stages:[{start:'2027-10-01',amount:'30900'},{start:'2028-10-01',amount:'31827'}],freeEnabled:true,freePeriods:[{start:'2026-10-01',end:'2026-11-30'}],rateEvidence:'演示：根据类似期限、币种及抵押条件确定增量借款利率。'};leaseDirty=true;populateLeaseForm();toast('示例含首年 30,000 元、次年 30,900 元、第三年 31,827 元月租金');};
 if(leaseDirty)openDrawer('替换为示例条款','<div class="helper">将替换当前未保存的填写内容。合同草稿尚未保存时，请先确认是否需要保留。</div>','填入示例',()=>{closeDrawer();fill();},'示例数据');else fill();
}
