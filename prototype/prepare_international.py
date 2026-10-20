"""Read supplied finance workbooks; prepare local data and reconcile Japan.

Original workbooks remain unchanged. Generated financial data stays in analysis/.
"""
import json
from datetime import datetime
from pathlib import Path
import openpyxl
from lease_engine import calculate

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'analysis' / 'disclosures'
COMPANIES = {'欧洲': ('RIGOL TECHNOLOGIES EU GmbH', 'EUR'),
             '美国': ('RIGOL TECHNOLOGIES, USA INC.', 'USD'),
             '日本': ('ディー・エイチ・エル・ジャパン株式会社', 'JPY'), '香港': ('香港', 'HKD'),
             '韩国': ('RIGOL KOREA CO,. LTD.', 'KRW'),
             '马来西亚': ('RIGOL TECHNOLOGIES（MALAYSIA）SDN.BHD.', 'MYR')}
KEYS = {'costOpening':4,'costIncrease':5,'newLease':6,'acquisition':7,
        'costDecrease':9,'disposal':10,'costClosing':13,'depOpening':15,
        'depIncrease':16,'depCharge':17,'depDecrease':18,'depDisposal':19,
        'depClosing':22,'impOpening':24,'impIncrease':25,'impCharge':26,
        'impDecrease':27,'impDisposal':28,'impClosing':29,'netClosing':31,'netOpening':32}

def read(path):
    with open(path, 'rb') as f:
        return openpyxl.load_workbook(f, data_only=True)

def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, allow_nan=False)

def main():
    fx = read(ROOT / 'FX rate list.xlsx')['Rate']
    rates = {}
    for row in range(2,84):
        year, month = fx.cell(row,1).value, fx.cell(row,2).value
        if not isinstance(year,(int,float)) or not str(month).strip().isdigit(): continue
        # A75 has a fractional year; adjacent monthly rows establish 2026.
        if row == 75: year = 2026
        if int(year) != year: raise ValueError(f'Unexpected year at A{row}')
        year, month = int(year), int(month)-1
        if month == 0: year, month = year-1, 12
        key = f'{year:04}-{month:02}'
        rates[key] = {}
        for code,col in {'USD':3,'EUR':4,'JPY':5,'HKD':6,'KRW':24,'MYR':27}.items():
            value = fx.cell(row,col).value
            if isinstance(value,(int,float)) and value>0:
                rates[key][code] = {'value':value,'cell':f'Rate!{openpyxl.utils.get_column_letter(col)}{row}'}
    snapshots = {}
    for file in ROOT.glob('25.使用权资产*-OK.xlsx'):
        stamp = file.name.split('资产')[1][:6]
        month = '20'+stamp[:2]+'-'+stamp[2:4]
        book = read(file)
        for sheet,(company,currency) in COMPANIES.items():
            if sheet not in book.sheetnames: continue
            s=book[sheet]
            values={key:float(s.cell(row,8).value or 0) for key,row in KEYS.items()}
            # Retain confirmed translated opening balances, including historical adjustments.
            carry={key:float(s.cell(KEYS[key],3).value or 0) for key in ('costOpening','depOpening','impOpening')}
            snapshots.setdefault(company,{})[month] = {
                'values':values,'translatedOpening':carry,'source':file.name,'sheet':sheet}
    # Historical overseas sheets are reference material, not active system data.
    save(OUT/'overseas-reference.json',snapshots)
    save(OUT/'international.json', {'rates':rates,
         'companies':[],'snapshots':{},'rateSource':'FX rate list.xlsx',
         'rateNotes':['Rate 标示月份对应上月末汇率。','A75 年份按相邻月份序列确认为 2026。']})
    jp = read(ROOT/'日本公司租赁'/'JP Lease Calculation 2024 .11.xlsx')['JP 2411-2610']
    params = dict(recordId='LS-JP-2024-001',contractId='LS-JP-2024-001',revision=1,
        company=COMPANIES['日本'][0],name='东京都丰岛区南大塚3-45-5办公室',lessor='成利企業有限公司',
        availableDate='2024-11-01',start='2024-11-01',end='2026-10-31',months=24,
        annualRate=.036,taxRate=.1,area=0,deposit=0,assetAdjustment=0,displayMode='auto',
        currency='JPY',calculationPrecision=0,
        policy='每月预付下月租金；日元现值、利息及折旧按整数截尾，末期结清尾差。',
        rentPhases=[dict(months=24,gross=556842*24,frequency=1,timing='advance')])
    result = calculate(params)
    checks=[]
    for key,cell in [('asset','V18'),('liability','R18'),('upfront','F18')]:
        checks.append({'item':key,'system':result['initial'][key],'source':jp[cell].value})
    for item,value,cell in [
        ('initialAssetJournal',result['initial']['asset'],'AF16'),
        ('unrecognisedInterest',result['totals']['interest'],'AF17'),
        ('grossLeasePayable',-(result['initial']['liability']+result['totals']['interest']),'AF18'),
        ('initialPrepayment',-result['initial']['upfront'],'AF19')]:
        checks.append({'item':item,'system':value,'source':jp[cell].value,'cell':cell})
    for index,row in enumerate(result['rows']):
        for key,col in [('payment','F'),('interest','P'),('depreciation','U'),
                        ('closingAsset','V'),('closingLiability','R'),('discountedPayment','N')]:
            checks.append({'period':index+1,'item':key,'system':row[key],'source':jp[f'{col}{19+index}'].value or 0})
        for key,offset in [('depreciation',0),('interest',3),('payment',6)]:
            for side,sign in [(0,1),(1,-1)]:
                cell=f'AF{21+index*9+offset+side}'
                checks.append({'period':index+1,'item':key,'cell':cell,
                               'system':row[key]*sign,'source':jp[cell].value or 0})
    differences=[c for c in checks if abs(c['system']-c['source'])>.001]
    audit={'checked':len(checks),'differences':differences,'initial':result['initial'],'totals':result['totals']}
    save(OUT/'japan-audit.json',audit)
    if differences: raise ValueError(differences)
    save(ROOT/'analysis'/'workspace-contracts'/'LS-JP-2024-001.json',params)
    print(json.dumps(audit,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
