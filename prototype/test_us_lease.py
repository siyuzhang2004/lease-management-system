import unittest
from lease_engine import calculate

def us_params():
    return dict(company='Rigol US',name='Office',lessor='Tigard Sub',
        start='2021-09-01',end='2026-11-30',months=63,annualRate=.0325,taxRate=0,
        roundingPolicy='round-total-pv',recognizeDuringFreePeriod=True,
        freeStart='2021-09-01',freeEnd='2021-11-30',displayMode='auto',
        rentPhases=[dict(months=n,gross=n*rent,frequency=1,timing='arrears')
            for n,rent in [(3,0),(9,3434),(12,3537),(12,3643),(12,3753),(12,3865),(3,3981)]])

class USLeaseTests(unittest.TestCase):
    def test_rounding_and_free_period_recognition(self):
        result=calculate(us_params())
        self.assertEqual(result['initial']['asset'],201147.43)
        self.assertEqual(result['rows'][0]['payment'],0)
        self.assertEqual(result['rows'][0]['interest'],544.77)
        self.assertEqual(result['rows'][0]['depreciation'],3192.82)
        self.assertEqual(result['rows'][2]['closingLiability'],202786.18)
        self.assertEqual(result['rows'][3]['payment'],3434)
        self.assertEqual(result['rows'][-1]['depreciation'],3192.59)
        self.assertEqual(result['rows'][-1]['interest'],10.75)
        self.assertEqual(result['rows'][-1]['closingAsset'],0)
        self.assertEqual(result['rows'][-1]['closingLiability'],0)
        self.assertEqual(result['totals']['interest'],19277.57)

    def test_timing_changes_actual_calculation(self):
        p=us_params()
        for phase in p['rentPhases']:phase['timing']='advance'
        self.assertEqual(calculate(p)['initial']['asset'],201692.21)

    def test_free_period_cannot_have_fixed_rent(self):
        p=us_params();p['rentPhases'][0]['gross']=100
        with self.assertRaisesRegex(ValueError,'免租月份'):calculate(p)
        p=us_params();p['recognizeDuringFreePeriod']=False
        with self.assertRaisesRegex(ValueError,'简便口径'):calculate(p)

if __name__=='__main__':unittest.main()
