"""Prepare the current Korea lease; keep supplied workbooks read-only."""
import json
from datetime import date
from pathlib import Path
from prepare_international import read, save, COMPANIES, KEYS
from lease_engine import calculate

ROOT = Path(__file__).resolve().parent.parent


def main():
    source = ROOT / '韩国公司租赁-Korea Lease Calculation25.10-27.09.xlsx'
    book = read(source)
    lead, interest = book['Lead 25.10-27.09'], book['Interest ']
    months = int(lead['J2'].value)
    payments = [-float(interest[f'L{i}'].value) for i in range(2, months + 2)]
    assert len(set(payments)) == 1
    start = lead['C2'].value.date().isoformat()
    last_payment = interest[f'K{months+1}'].value.date()
    # User confirmed September 2027 as the last accounting/disposal month.
    assert last_payment.year == 2027 and last_payment.month == 9
    params = dict(
        recordId='LS-KR-2025-001', contractId='LS-KR-2025-001', revision=1,
        company=COMPANIES['韩国'][0], name='韩国公司房屋租赁（2025—2027）',
        lessor='待补充', currency='KRW', start=start, availableDate=start,
        end=date(2027, 9, 30).isoformat(), months=months,
        sourceContractEnd=lead['D2'].value.date().isoformat(),
        periodBasis='calendar-month', annualRate=float(interest['C2'].value),
        calculationPrecision=0, roundingPolicy='round-total-pv',
        taxRate=0, area=0, deposit=0, assetAdjustment=0, displayMode='auto',
        rentPhases=[dict(months=months, gross=sum(payments), frequency=1, timing='arrears')],
        policy='按2025年10月至2027年9月共24个自然月核算，期末付款；首月按完整一期计息及折旧。'
               '原表头结束日为2027-10-05，经确认按明细于2027年9月末结束并处置。'
               '韩元金额四舍五入至整数，末期结清尾差。'
               '租金按现有核算金额登记，不另行换算税额；出租方、押金及面积待补充。',
        advanced=dict(notes='原表每月折旧1,364,050韩元，末期剩余3韩元在最后一期一并计提。'
                            '本次仅接入当前合同，不补录以前的已结束合同。'))
    result = calculate(params)
    checks = []
    for i, row in enumerate(result['rows'], 2):
        for key, column, sign in [
            ('payment', 'H', 1), ('interest', 'I', -1), ('depreciation', 'L', 1),
            ('closingAsset', 'N', 1), ('closingLiability', 'O', -1),
        ]:
            checks.append(dict(period=i-1, item=key, cell=f'{lead.title}!{column}{i}',
                               system=row[key], source=float(lead[f'{column}{i}'].value)*sign))
    for key, column, sign in [('asset', 'F', 1), ('liability', 'G', -1)]:
        checks.append(dict(item=key, cell=f'{lead.title}!{column}2',
                           system=result['initial'][key], source=float(lead[f'{column}2'].value)*sign))
    differences = [dict(c, difference=round(c['system']-c['source'], 2))
                   for c in checks if abs(c['system']-c['source']) > .005]
    expected = {(24, 'depreciation'): 3, (24, 'closingAsset'): -3}
    assert {(c.get('period'), c['item']): c['difference'] for c in differences} == expected, differences
    report = dict(checked=len(checks), roundingDifferences=differences, unexpectedDifferences=[],
                  initial=result['initial'], totals=result['totals'],
                  sourceEnd=params['sourceContractEnd'], selectedEnd=params['end'])
    save(ROOT / 'analysis/disclosures/korea-audit.json', report)
    # June excludes the retired old lease; earlier notes include unavailable history.
    sheet = read(ROOT / '25.使用权资产260630-OK.xlsx')['韩国']
    reference = {str(row): float(sheet.cell(row, 8).value or 0) for row in KEYS.values()}
    ref_path = ROOT / 'analysis/disclosures/contract-reference.json'
    references = {}
    if ref_path.exists():
        with open(ref_path, 'r', encoding='utf-8') as f:
            references = json.load(f)
    references[params['company']] = {'2026-06': reference}
    save(ref_path, references)
    save(ROOT / 'analysis/workspace-contracts/LS-KR-2025-001.json', params)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
