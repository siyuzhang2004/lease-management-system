"""Read-only extraction of reported liability balances; references never feed the model."""
import json
from pathlib import Path
from openpyxl import load_workbook

BASE = Path(__file__).resolve().parent.parent
COMPANIES = [
    ('深圳普源精电科技有限公司', 10, 'CNY'),
    ('西安普源精电科技有限公司', 16, 'CNY'),
    ('RIGOL TECHNOLOGIES, USA INC.', 22, 'USD'),
    ('RIGOL TECHNOLOGIES EU GmbH', 28, 'EUR'),
    ('ディー・エイチ・エル・ジャパン株式会社', 34, 'JPY'),
    ('RIGOL KOREA CO,. LTD.', 40, 'KRW'),
]


def read(path):
    with open(path, 'rb') as file:
        return load_workbook(file, data_only=True)


def prepare():
    refs = {}
    for month, suffix in [('2026-06', '0630'), ('2026-09', '0930')]:
        path = BASE / f'47.租赁负债{suffix}-OK.xlsx'
        ws = read(path).active
        companies = {}
        for name, row, currency in COMPANIES:
            values = {}
            for col, keys in [(3, ['closing', 'current', 'noncurrent']), (4, ['opening', 'currentOpening', 'noncurrentOpening'])]:
                for offset, key in enumerate(keys):
                    # Korea's blank current opening is recorded as zero in the supplied subtotal.
                    values[key] = ws.cell(row + offset, col).value or 0
            companies[name] = dict(values=values, currency=currency, source=path.name, sheet=ws.title, range=f'C{row}:D{row+2}')
        values = {}
        for col, keys, rate in [(3, ['closing', 'current', 'noncurrent'], ws['H8'].value), (4, ['opening', 'currentOpening', 'noncurrentOpening'], ws['G8'].value)]:
            for offset, key in enumerate(keys):
                values[key] = round(ws.cell(4 + offset, col).value - ws.cell(60 + offset, col).value * rate, 2)
        refs[month] = dict(companies=companies, group=dict(values=values, currency='CNY', source=path.name, sheet=ws.title, range='C4:D6', excluded='马来西亚'))
    path = BASE / '00 合并报表-普源精电科技股份有限公司 2026 09.xlsx'
    ws = read(path)['1.1合并试算表 (母子) ']
    refs['2026-09']['trial'] = dict(
        source=path.name, sheet=ws.title,
        noncurrent=round(ws['AK96'].value - ws['AE96'].value, 2),
        current=round(ws['AK90'].value - ws['AE90'].value - ws['T90'].value, 2),
        excludedMalaysia=ws['AE90'].value, excludedParentOther=ws['T90'].value,
        range='T90:AK96')
    out = BASE / 'analysis/disclosures/liability-reference.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'w', encoding='utf-8') as file:
        json.dump(refs, file, ensure_ascii=False, indent=2, allow_nan=False)
    print(out)


if __name__ == '__main__':
    prepare()
