"""Build natural-month service and quarterly payment schedules from contract terms."""
import calendar
import copy
import math
from datetime import date, timedelta
from decimal import Decimal

from lease_engine import cents, shift_month
from scheduled_lease import calculate_scheduled


def calculate_calendar_contract(params):
    p = copy.deepcopy(params)
    terms = p['calendarTerms']
    frequency = terms.get('frequency', 3)
    timing = terms.get('timing', 'advance')
    if frequency not in (1, 3, 6, 12) or isinstance(frequency, bool) or timing not in ('advance', 'arrears'):
        raise ValueError('请选择有效的付款频率及付款时点。')
    n = p['months']
    if not isinstance(n, int) or not 1 <= n <= 600:
        raise ValueError('租赁月数须为1至600的整数。')
    start = date.fromisoformat(p['start'])
    if start.day != 1 or (shift_month(p['start'], n)-timedelta(days=1)).isoformat() != p['end']:
        raise ValueError('季度合同当前须按完整自然月设置租赁起止日期。')
    for key in ('monthlyGross','quarterlyGross'):
        if not isinstance(terms.get(key), (int,float)) or not math.isfinite(terms[key]) or terms[key] < 0:
            raise ValueError('请填写有效的合同月租金和季度租金。')
    period_gross = terms['quarterlyGross'] if frequency == 3 else terms.get('periodGross', cents(Decimal(str(terms['monthlyGross'])) * frequency))
    if not isinstance(period_gross, (int, float)) or not math.isfinite(period_gross) or period_gross < 0:
        raise ValueError('每期租金须为有效非负金额。')
    advanced = p.get('advanced') or {}
    frees = advanced.get('freePeriods', []) if advanced.get('freeEnabled') else []
    for free in frees:
        a,b = date.fromisoformat(free['start']),date.fromisoformat(free['end'])
        if a.day != 1 or b.day != calendar.monthrange(b.year,b.month)[1] or a>b:
            raise ValueError('当前季度计租模式的免租期须为完整自然月。')
    rents = []
    for i in range(n):
        a=shift_month(p['start'],i);b=shift_month(p['start'],i+1)-timedelta(days=1)
        free=any(date.fromisoformat(f['start'])<=a and date.fromisoformat(f['end'])>=b for f in frees)
        rents.append(dict(start=a.isoformat(),end=b.isoformat(),net=0 if free else cents(Decimal(str(terms['monthlyGross']))/(1+Decimal(str(p['taxRate']))))))
    # A contract's stated quarterly amount is authoritative. Do not replace it
    # with three rounded monthly amounts. Partial quarters use the monthly price.
    groups={}
    for i,r in enumerate(rents):
        d=date.fromisoformat(r['start']);groups.setdefault((d.year,(d.month-1)//frequency),[]).append(i)
    payments=[]
    for indices in groups.values():
        paid=[i for i in indices if rents[i]['net']!=0]
        gross=period_gross if len(paid)==frequency else cents(Decimal(str(terms['monthlyGross']))*len(paid))
        first=date.fromisoformat(rents[(paid or indices)[0]]['start'])
        last=date.fromisoformat(rents[(paid or indices)[-1]]['end'])
        if timing == 'advance':
            y,m=divmod(first.year*12+first.month-2,12)
            due=date(y,m+1,20)
        else:
            due=last
        period=max(0,(due.year-start.year)*12+due.month-start.month+1)
        payments.append(dict(period=period,rentIndices=indices,gross=gross,dueDate=due.isoformat()))
    p['advanced']={**advanced,'freePeriods':frees}
    p['paymentSchedule']=dict(rents=rents,payments=payments,rentFreeBasis=frees,netTaxRate=p['taxRate'])
    result=calculate_scheduled(p)
    # Store editable contract terms, rather than a stale generated schedule.
    result['params']=copy.deepcopy(params)
    result['notes']=[
        f'按当前参数每{frequency}个月付款一次，'+('期初付。' if timing == 'advance' else '期末付。'),
        '完整付款期间采用每期租金；不足完整期间按合同月租金乘计租月数。',
        '期初付归入首个计租月之前一个自然月，参考该月20日前付款；期末付归入最后一个计租月末。',
        '年折现率为财务核定参数，合同未约定；本表采用逐月折现及实际利率法摊销。',
        '免租期间确认资产并计息、折旧；月租金列为该月合同租金，不做全租期平均摊租。',
        '可退还押金单列，不计入租赁付款；物业及其他服务费用单独核算。',
        '按承租公司单体口径计量；未假设续租、购买或提前终止。恢复原状费用尚无估计金额，暂未计入。',
        '末次付款自动调整利息尾差，最后一期折旧结清，期末资产和负债均归零。',
    ]
    return result
