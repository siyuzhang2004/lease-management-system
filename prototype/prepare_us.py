"""Prepare the authorized US lease from Rent information and audit Lead."""
import copy
import json
from pathlib import Path
from prepare_international import read, save, KEYS
from lease_engine import calculate

ROOT=Path(__file__).resolve().parent.parent

def main():
    source=ROOT/'US Lease Calculation 2021.0914.new office.xlsx'
    book=read(source)
    info,lead,interest=book['Rent information'],book['Lead'],book['Interest ']
    start,end=info['K2'].value.date(),info['L2'].value.date()
    months=(end.year-start.year)*12+end.month-start.month+1
    # User explicitly chose the existing calculation's arrears convention.
    # Keep the conflicting source term visible; do not infer it from the result.
    phases=[dict(months=int(info[f'P{row}'].value),
                 gross=float(info[f'P{row}'].value)*float(info[f'R{row}'].value),
                 frequency=1,timing='arrears') for row in range(5,12)]
    assert sum(p['months'] for p in phases)==months
    assert sum(p['gross'] for p in phases)==info['R2'].value
    params=dict(recordId='LS-US-2021-001',contractId='LS-US-2021-001',revision=1,
        company='RIGOL TECHNOLOGIES, USA INC.',name=info['E2'].value,lessor=info['J2'].value,
        start=start.isoformat(),end=end.isoformat(),availableDate=start.isoformat(),months=months,
        currency=info['M2'].value,annualRate=interest['C2'].value,taxRate=0,
        area=round(3615*.09290304,2),deposit=7962,assetAdjustment=0,
        displayMode='auto',roundingPolicy='round-total-pv',recognizeDuringFreePeriod=True,
        freeStart='2021-09-01',freeEnd='2021-11-30',rentPhases=phases,
        contractPaymentTiming='advance',paymentTimingDecision='use-existing-arrears',
        policy='条款登记为期初付；经确认沿用现有核算的期末付款口径。2021年9月至11月免租，纳入确认、计息及折旧期间。物业费单独核算。',
        advanced=dict(freeEnabled=True,freePeriods=[dict(start='2021-09-01',end='2021-11-30')],servicePolicy='separate'))
    result=calculate(params)
    checks=[]
    for i,row in enumerate(result['rows'],2):
        for key,col,sign in [('payment','H',1),('interest','I',-1),('depreciation','L',1),
                             ('closingAsset','N',1),('closingLiability','O',-1)]:
            checks.append(dict(period=i-1,item=key,cell='Lead!'+col+str(i),
                               system=row[key],source=(lead[f'{col}{i}'].value or 0)*sign))
    for key,col,sign in [('asset','F',1),('liability','G',-1)]:
        checks.append(dict(item=key,cell='Lead!'+col+'2',system=result['initial'][key],source=lead[col+'2'].value*sign))
    differences=[c for c in checks if abs(c['system']-c['source'])>.005]
    alternative=copy.deepcopy(params)
    for phase in alternative['rentPhases']:phase['timing']='advance'
    advance=calculate(alternative)
    report=dict(checked=len(checks),differences=differences,initial=result['initial'],totals=result['totals'],
                sourcePaymentTiming=info['O2'].value,selectedTiming='arrears',
                advanceInitial=advance['initial'],
                timingDifference=round(advance['initial']['asset']-result['initial']['asset'],2))
    references={}
    for file in ROOT.glob('25.使用权资产*-OK.xlsx'):
        stamp=file.name.split('资产')[1][:6];month='20'+stamp[:2]+'-'+stamp[2:4]
        s=read(file)['美国']
        references[month]={str(row):float(s.cell(row,8).value or 0) for row in KEYS.values()}
    save(ROOT/'analysis/disclosures/us-audit.json',report)
    if differences:raise ValueError(differences)
    save(ROOT/'analysis/disclosures/us-reference.json',references)
    ref_path=ROOT/'analysis/disclosures/contract-reference.json'
    contract_refs={}
    if ref_path.exists():
        with open(ref_path,'r',encoding='utf-8') as f:contract_refs=json.load(f)
    contract_refs[params['company']]=references
    save(ref_path,contract_refs)
    save(ROOT/'analysis/workspace-contracts/LS-US-2021-001.json',params)
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
