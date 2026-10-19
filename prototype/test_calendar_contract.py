import copy
import unittest

from lease_engine import calculate


class CalendarContractTests(unittest.TestCase):
    def params(self):
        return dict(recordId='quarterly-test',revision=1,company='Tenant',name='Office',lessor='Owner',
                    availableDate='2024-08-01',start='2024-08-01',end='2029-07-31',months=60,
                    annualRate=.0385,taxRate=.09,area=394.35,deposit=59974.06,assetAdjustment=0,
                    calendarTerms=dict(monthlyGross=59974.06,quarterlyGross=179922.19),
                    advanced=dict(freeEnabled=True,freePeriods=[dict(start='2024-08-01',end='2024-09-30')]))

    def test_contract_quarter_price_and_payment_periods(self):
        p=self.params(); original=copy.deepcopy(p);r=calculate(p)
        self.assertEqual(p,original)
        self.assertEqual(r['initial']['asset'],2907552.23)
        self.assertEqual(r['initial']['liability'],2907552.23)
        self.assertEqual(r['initial']['totalFixed'],3191280.44)
        payments=[(x['period'],x['payment']) for x in r['rows'] if x['payment']]
        self.assertEqual([a for a,b in payments],list(range(2,59,3))+[59])
        self.assertEqual(payments[0][1],165066.23)
        self.assertEqual(payments[-1][1],55022.07)
        self.assertEqual(r['rows'][0]['monthlyRent'],0)
        self.assertEqual(r['rows'][1]['monthlyRent'],0)
        self.assertEqual(r['rows'][-1]['closingAsset'],0)
        self.assertEqual(r['rows'][-1]['closingLiability'],0)
        self.assertEqual(r['totals']['interest'],283728.21)

    def test_information_contract_price_is_not_three_rounded_months(self):
        p=self.params();p['calendarTerms']=dict(monthlyGross=63811.13,quarterlyGross=191433.38)
        r=calculate(p)
        self.assertEqual(r['rows'][1]['payment'],175626.95)
        self.assertEqual(r['initial']['asset'],3093573.63)
        self.assertEqual(r['initial']['totalFixed'],3395454.37)
        self.assertEqual(r['totals']['interest'],301880.74)

    def test_parameters_recalculate_without_retaining_generated_schedule(self):
        p=self.params();r=calculate(p)
        self.assertNotIn('paymentSchedule',r['params'])
        p['calendarTerms']['quarterlyGross']+=100
        self.assertGreater(calculate(p)['initial']['liability'],r['initial']['liability'])
        p=self.params();p['taxRate']=.05
        self.assertGreater(calculate(p)['initial']['liability'],r['initial']['liability'])
        p=self.params();p['advanced']['freePeriods'][0]['end']='2024-12-31'
        self.assertLess(calculate(p)['initial']['liability'],r['initial']['liability'])

    def test_partial_free_cycle_and_invalid_prices(self):
        p=self.params();p['advanced']['freePeriods'][0]['end']='2024-10-31'
        result=calculate(p)
        self.assertEqual(result['rows'][2]['payment'],110044.15)
        p=self.params();p['calendarTerms']['quarterlyGross']=float('nan')
        with self.assertRaises(ValueError):calculate(p)

    def test_frequency_and_timing_regenerate_payment_months(self):
        for frequency in (1,3,6,12):
            for timing in ('advance','arrears'):
                p=self.params();p['calendarTerms'].update(frequency=frequency,timing=timing)
                r=calculate(p)
                self.assertEqual(r['rows'][-1]['closingLiability'],0)
                self.assertEqual(r['rows'][-1]['closingAsset'],0)
                first=next(x['period'] for x in r['rows'] if x['payment'])
                self.assertEqual(first,2 if timing=='advance' else (3 if frequency==1 else 5))
        p=self.params();p['calendarTerms']['frequency']=2
        with self.assertRaises(ValueError):calculate(p)


if __name__=='__main__':unittest.main()
