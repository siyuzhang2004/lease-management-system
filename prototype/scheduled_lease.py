"""Separate the service period from the agreed payment period."""
import calendar
import copy
import math
from datetime import date, timedelta
from decimal import Decimal

from lease_engine import calculate, cents, shift_month, validate


def calculate_scheduled(params):
    p = copy.deepcopy(params)
    schedule = p['paymentSchedule']
    if not isinstance(schedule, dict):
        raise ValueError('付款安排格式不正确。')
    rents = schedule.get('rents', [])
    schedule.setdefault('rentFreeBasis', copy.deepcopy((p.get('advanced') or {}).get('freePeriods', [])))
    if schedule.get('rentFreeBasis') != (p.get('advanced') or {}).get('freePeriods', []):
        raise ValueError('免租区间已修改，请同步调整各月租金并重新核定免租安排。')
    if schedule.get('netTaxRate', p['taxRate']) != p['taxRate']:
        raise ValueError('本合同明细按不含税金额录入；税率变化后请重新核定各月租金。')
    n = p['months']
    if not isinstance(n, int) or not 1 <= n <= 600 or len(rents) not in (n, n + 1):
        raise ValueError('自然月租金明细须覆盖首尾月份。')
    # Retain the general financial-term validation. Free periods are explicitly
    # represented in the dated service rows and may occur after commencement.
    check = copy.deepcopy(p)
    check.pop('paymentSchedule')
    check.pop('calendarTerms', None)
    check.pop('rentPhases', None)
    check['freeEnd'] = ''
    check.setdefault('advanced', {})['freeEnabled'] = False
    check['stages'] = [dict(months=n, gross=0, paymentPeriod=0)]
    validate(check)
    net = []
    previous = None
    for i, rent in enumerate(rents):
        a, b = date.fromisoformat(rent['start']), date.fromisoformat(rent['end'])
        amount = rent['net']
        if not isinstance(amount, (int, float)) or not math.isfinite(amount) or amount < 0:
            raise ValueError('各月不含税租金须为有效非负数。')
        expected = date.fromisoformat(p['start']) if i == 0 else previous + timedelta(days=1)
        if a != expected or a > b or a.year != b.year or a.month != b.month:
            raise ValueError('租金所属期间须连续，且每行只覆盖一个自然月。')
        if i < len(rents)-1 and b.day != calendar.monthrange(b.year, b.month)[1]:
            raise ValueError('中间月份须覆盖至自然月末。')
        previous = b
        net.append(cents(amount))
    if previous.isoformat() != p['end']:
        raise ValueError('租金明细结束日须与合同结束日一致；修改日期后请同步租金明细。')
    for free in (p.get('advanced') or {}).get('freePeriods', []):
        a, b = date.fromisoformat(free['start']), date.fromisoformat(free['end'])
        if a > b or a < date.fromisoformat(p['start']) or b > previous:
            raise ValueError('免租区间须位于合同期间内。')
        for rent in rents:
            if a <= date.fromisoformat(rent['start']) and b >= date.fromisoformat(rent['end']) and rent['net']:
                raise ValueError('完全免租的月份，其租金须为零。')
    # Every service month's charge must be allocated exactly once. An initial
    # payment is period 0; periodic payments are settled at the model period end.
    allocations = schedule.get('payments', [])
    seen = []
    cash = [0.] * (n+1)
    for entry in allocations:
        period = entry['period']
        if not isinstance(period, int) or not 0 <= period <= n:
            raise ValueError('付款期次须介于初始确认与最后一期之间。')
        indices = entry['rentIndices']
        if not isinstance(indices, list) or any(not isinstance(j, int) or not 0 <= j < len(net) for j in indices):
            raise ValueError('付款对应的租金所属月份不正确。')
        seen.extend(indices)
        if 'gross' in entry:
            amount = entry['gross']
            if not isinstance(amount, (int, float)) or not math.isfinite(amount) or amount < 0:
                raise ValueError('合同约定付款金额须为有效非负数。')
            amount = Decimal(str(amount)) / (1 + Decimal(str(p['taxRate'])))
        else:
            amount = sum(Decimal(str(net[j])) for j in indices)
        cash[period] = cents(Decimal(str(cash[period])) + amount)
    if sorted(seen) != list(range(len(net))):
        raise ValueError('各月租金须且只能分配至一次付款，不能遗漏或重复。')
    # Use the established PV/interest engine and its final-payment true-up.
    synthetic = copy.deepcopy(check)
    synthetic['taxRate'] = 0
    synthetic['displayMode'] = 'source'
    synthetic['stages'] = [dict(months=1, gross=cash[i], paymentPeriod=i,
                                monthlyNet=net[i-1]) for i in range(1,n+1)]
    synthetic['assetAdjustment'] = cents(Decimal(str(p.get('assetAdjustment', 0))) + Decimal(str(cash[0])))
    result = calculate(synthetic)
    result['initial']['upfront'] = cash[0]
    result['initial']['totalFixed'] = cents(Decimal(str(result['initial']['totalFixed'])) + Decimal(str(cash[0])))
    result['totals']['payment'] = result['initial']['totalFixed']
    for row in result['rows']:
        row['cumulativePayment'] = cents(Decimal(str(row['cumulativePayment'])) + Decimal(str(cash[0])))
    result['params'] = p
    for i, row in enumerate(result['rows']):
        row['start'], row['end'] = rents[i]['start'], rents[i]['end']
    result['notes'] = [
        '免租期间保留在确认、计息和折旧期间内；各月租金按所属期间单独列示。',
        '初始确认付款按核定的预付安排计入使用权资产，不重复计入未来付款现值。',
        '正常付款按参数中的约定期次计算；沿用核定的提前一个月付款安排，不代表实际付款记录。',
        '首尾不完整月份合计按一个折旧期处理，共计'+str(n)+'期；折旧在最后一期结清。',
        '最后一个租金所属月份的付款已提前安排，期末负债和资产余额均为零。',
        '年折现率除以12用于逐期计息；付款现值及利息截取至分，末次付款自动调整利息尾差。',
        '首笔款项作为初始预付款是本合同核算口径；实际付款日期尚未核实。',
    ]
    return result
