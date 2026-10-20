"""Load authorized EU leases and immutable reported legacy balances, without editing sources."""
import json
from pathlib import Path
from prepare_international import read, save, KEYS
from lease_engine import calculate

ROOT = Path(__file__).resolve().parent.parent
COMPANY = 'RIGOL TECHNOLOGIES EU GmbH'


def main():
    book = read(ROOT / '欧洲公司租赁/EU Lease Calculation.xlsx')
    records, audits = [], {}
    specifications = [
        ('LS-EU-2025-001', 'Office rent', '欧洲办公室', '待补充', 61, '2030-05-30',
         [dict(months=1, gross=0, frequency=1, timing='arrears'),
          dict(months=60, gross=348197.40, frequency=1, timing='arrears')]),
        ('LS-EU-2025-002', 'Warehouse rent', 'Friedrichshafener Straße 2 仓库', 'AERO-Bildungs GmbH',
         20, '2026-12-31', [dict(months=20, gross=15667.60, frequency=1, timing='arrears')]),
    ]
    for id, sheet, name, lessor, months, end, phases in specifications:
        p = dict(recordId=id, contractId=id, revision=1, company=COMPANY, name=name, lessor=lessor,
                 currency='EUR', start='2025-05-01', availableDate='2025-05-01', end=end,
                 months=months, periodBasis='calendar-month', annualRate=.0265, taxRate=0,
                 calculationPrecision=2, roundingPolicy='round-total-pv', assetAdjustment=0,
                 area=104.45 if months == 20 else 0, deposit=0, displayMode='auto', rentPhases=phases,
                 policy='经确认按固定租金、不递增、每月期末付款核算；年折现率2.65%按现有核算结果复核。'
                        '租金为不含税核算金额，服务费用单独核算；末期结清折旧及负债尾差。')
        if months == 61:
            p.update(recognizeDuringFreePeriod=True, freeStart='2025-05-01', freeEnd='2025-05-31',
                     advanced=dict(freeEnabled=True, freePeriods=[dict(start='2025-05-01', end='2025-05-31')],
                                   notes='付款约定为每月第4日前；经确认采用期末付款。出租方、面积及押金待补充。'))
        else:
            p['advanced'] = dict(notes='合同约定自2026年1月起每年递增2%，月初付款；经确认采用不涨租、期末付款口径。'
                                      '按当前租期至2026-12-31核算；续租条款未纳入当前租期。押金待补充。')
        result = calculate(p)
        differences = []
        for i, row in enumerate(result['rows'], 2):
            for key, col, sign in [('payment','H',1),('interest','I',-1),('depreciation','L',1),
                                   ('closingAsset','N',1),('closingLiability','O',-1)]:
                difference = round(row[key] - float(book[sheet][f'{col}{i}'].value) * sign, 2)
                if difference:
                    differences.append(dict(period=i-1, item=key, difference=difference))
        tail = .09 if months == 61 else -.08
        assert differences == [dict(period=months,item='depreciation',difference=tail),
                               dict(period=months,item='closingAsset',difference=-tail)], differences
        assert result['initial']['asset'] == round(book[sheet]['F2'].value, 2)
        assert result['initial']['liability'] == round(-book[sheet]['G2'].value, 2)
        audits[id] = dict(checked=months*5+2, differences=differences, initial=result['initial'])
        records.append(p)
    references = {}
    for file in ROOT.glob('25.使用权资产*-OK.xlsx'):
        stamp = file.name.split('资产')[1][:6]
        month = '20'+stamp[:2]+'-'+stamp[2:4]
        s = read(file)['欧洲']
        references[month] = {str(row):float(s.cell(row,8).value or 0) for row in KEYS.values()}
    march = {key:references['2025-03'][str(row)] for key,row in KEYS.items()}
    september = {key:references['2025-09'][str(row)] for key,row in KEYS.items()}
    # Remove independently recalculated new contracts to isolate the reported old lease.
    for key, value in dict(costIncrease=340371.28,newLease=340371.28,costClosing=340371.28,
                           depIncrease=30471.90,depCharge=30471.90,depClosing=30471.90,
                           netClosing=309899.38).items():
        september[key] = round(september[key]-value, 2)
    assert september['costClosing'] == september['depClosing'] == 214482.46
    history = dict(id='EU-LEGACY-OPENING',company=COMPANY,currency='EUR',name='欧洲旧租赁 · 固定历史数据',
                   firstMonth='2025-01',openingMonth='2026-01',opening=dict(cost=214482.46,dep=214482.46,imp=0),
                   snapshots={'2025-03':march,**{f'2025-{m:02}':september for m in range(9,13)}},
                   movements=[dict(month='2026-06',costDecrease=214482.46,disposal=214482.46,
                                   depDecrease=214482.46,depDisposal=214482.46)],
                   reference='欧洲公司历史附注 · 2025年3月、9月及2026年3月、6月',
                   note='按已提供附注固化旧租赁余额；处置计入2026年6月报告期，该月份不是对实际处置日期的认定。'
                        '2025年9月后已提足折旧，余额承接至年末；未提供的早期月份不反推合同参数。')
    path = ROOT/'analysis/disclosures/fixed-history.json'
    histories = []
    if path.exists():
        with open(path,encoding='utf-8') as f: histories = json.load(f)
    save(path,[h for h in histories if h['id'] != history['id']] + [history])
    ref_path = ROOT/'analysis/disclosures/contract-reference.json'
    with open(ref_path,encoding='utf-8') as f: all_references = json.load(f)
    all_references[COMPANY] = references
    save(ref_path,all_references)
    for p in records: save(ROOT/'analysis/workspace-contracts'/f"{p['recordId']}.json",p)
    save(ROOT/'analysis/disclosures/europe-audit.json',audits)
    print(json.dumps(audits,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
