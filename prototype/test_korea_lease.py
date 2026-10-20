import unittest
from lease_engine import calculate


def korea_params():
    return dict(company='RIGOL KOREA CO,. LTD.', name='Korea lease', lessor='Pending',
                start='2025-10-05', end='2027-09-30', availableDate='2025-10-05',
                months=24, periodBasis='calendar-month', annualRate=.0251, taxRate=0,
                calculationPrecision=0, roundingPolicy='round-total-pv',
                rentPhases=[dict(months=24, gross=33600000, frequency=1, timing='arrears')])


class KoreaLeaseTests(unittest.TestCase):
    def test_integer_rounding_and_final_settlement(self):
        result = calculate(korea_params())
        self.assertEqual(result['initial']['asset'], 32737203)
        first, last = result['rows'][0], result['rows'][-1]
        self.assertEqual(first['interest'], 68475)
        self.assertEqual(first['depreciation'], 1364050)
        self.assertEqual(last['interest'], 2923)
        self.assertEqual(last['depreciation'], 1364053)
        self.assertEqual(last['closingLiability'], 0)
        self.assertEqual(last['closingAsset'], 0)
        self.assertEqual(last['end'], '2027-09-30')
        self.assertEqual(result['rows'][8]['closingAsset'], 20460753)

    def test_calendar_month_phases_and_invalid_duration(self):
        p = korea_params()
        p['rentPhases'] = [dict(months=12, gross=16800000, frequency=1, timing='arrears',
                               endDate='2026-09-30'),
                           dict(months=12, gross=16800000, frequency=1, timing='arrears',
                                endDate='2027-09-30')]
        self.assertEqual(calculate(p)['initial']['asset'], 32737203)
        p['end'] = '2027-10-05'
        with self.assertRaisesRegex(ValueError, '自然月'):
            calculate(p)

    def test_parameter_change_recalculates(self):
        p = korea_params()
        original = calculate(p)
        p['rentPhases'][0]['gross'] = 36000000
        changed = calculate(p)
        self.assertGreater(changed['initial']['asset'], original['initial']['asset'])
        self.assertEqual(changed['rows'][-1]['closingAsset'], 0)
