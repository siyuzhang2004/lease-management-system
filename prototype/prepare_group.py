"""Read group disclosures and trial balance; preserve source files unchanged."""
import json
from pathlib import Path
from prepare_international import read, save, KEYS, COMPANIES

ROOT = Path(__file__).resolve().parent.parent
KEYS = {**KEYS, 'costFx':11, 'depFx':20}


def main():
    reports = {}
    opening = {}
    for month, stamp in [('2026-06','260630'), ('2026-09','260930')]:
        name = f'25.使用权资产{stamp}-OK.xlsx'
        w = read(ROOT/name)
        values = lambda s: {key:float(s.cell(row,3).value or 0) for key,row in KEYS.items()}
        group, malaysia = values(w['使用权资产汇总-调整']), values(w['马来西亚'])
        reports[month] = dict(source=name, sheet='使用权资产汇总-调整', excludedSheet='马来西亚',
                             group=group, excluded=malaysia,
                             expected={k:round(group[k]-malaysia[k],2) for k in group})
        for sheet in ['欧洲','日本','韩国']:
            s=w[sheet]
            # Carry the reported opening instead of retranslating last year's balance.
            item=dict(original={key:float(s.cell(KEYS[key],8).value or 0)
                                for key in ['costOpening','depOpening','impOpening']},
                      reported={key:round(float(s.cell(KEYS[key],3).value or 0),2)
                                for key in ['costOpening','depOpening','impOpening']},
                      source=name+' / '+sheet+'!C4、C15、C24')
            company=COMPANIES[sheet][0]
            if company in opening:
                assert opening[company]['original']==item['original']
                assert opening[company]['reported']==item['reported']
            else:
                opening[company]=item
    # Freeze only the historical translation difference, not the current contract balances.
    # EU has three sources; the separately rounded baseline is .01 below aggregate rounding.
    with open(ROOT/'analysis/disclosures/international.json',encoding='utf-8') as f: rates=json.load(f)['rates']
    for company,item in opening.items():
        code=next(code for _,(name,code) in COMPANIES.items() if name==company)
        rate=rates['2025-12'][code]['value']
        baseline={k:round(v*rate,2) for k,v in item['original'].items()}
        if company==COMPANIES['欧洲'][0]:
            # Derive per-source rounding from the imported EUR contracts and old lease.
            from lease_engine import calculate
            results=[]
            for path in (ROOT/'analysis/workspace-contracts').glob('LS-EU-*.json'):
                with open(path,encoding='utf-8') as f: results.append(calculate(json.load(f)))
            assert len(results)==2
            cost=[214482.46]+[r['initial']['asset'] for r in results]
            dep=[214482.46]+[round(sum(row['depreciation'] for row in r['rows'] if row['end']<'2026-01-01'),2) for r in results]
            assert round(sum(cost),2)==item['original']['costOpening']
            assert round(sum(dep),2)==item['original']['depOpening']
            baseline['costOpening']=round(sum(round(v*rate,2) for v in cost),2)
            baseline['depOpening']=round(sum(round(v*rate,2) for v in dep),2)
        item['adjustment']={k:round(item['reported'][k]-baseline[k],2) for k in baseline}
    trial_name='00 合并报表-普源精电科技股份有限公司 2026 09.xlsx'
    s=read(ROOT/trial_name)['1.1合并试算表 (母子) ']
    reports['2026-09']['trialBalance']=dict(source=trial_name,sheet=s.title,
        groupCell='AK61',excludedCell='AE61',group=float(s['AK61'].value),
        excluded=float(s['AE61'].value),expected=round(s['AK61'].value-s['AE61'].value,2))
    save(ROOT/'analysis/disclosures/group-reference.json',reports)
    save(ROOT/'analysis/disclosures/opening-carry.json',{'2026':opening})
    print(json.dumps({m:dict(net=r['expected']['netClosing'],opening=r['expected']['netOpening'])
                      for m,r in reports.items()},ensure_ascii=False))


if __name__=='__main__':
    main()
