import copy
import unittest

from lease_engine import calculate


class ScheduledLeaseTests(unittest.TestCase):
    def params(self):
        return dict(recordId='test', revision=1, company='Test', name='Office',
                    lessor='Owner', start='2024-08-05', end='2024-11-04',
                    availableDate='2024-08-05', months=3, annualRate=.0385,
                    taxRate=.05, area=1, deposit=100, assetAdjustment=0,
                    advanced=dict(freeEnabled=True, freePeriods=[dict(start='2024-08-05', end='2024-08-31')]),
                    paymentSchedule=dict(rentFreeBasis=[dict(start='2024-08-05', end='2024-08-31')],rents=[
                        dict(start='2024-08-05', end='2024-08-31', net=0),
                        dict(start='2024-09-01', end='2024-09-30', net=100),
                        dict(start='2024-10-01', end='2024-10-31', net=200),
                        dict(start='2024-11-01', end='2024-11-04', net=30)],
                        payments=[dict(period=0, rentIndices=[0,1]),
                                  dict(period=2, rentIndices=[2]),
                                  dict(period=3, rentIndices=[3])]))

    def test_cash_flow_and_final_true_up(self):
        p=self.params(); original=copy.deepcopy(p); result=calculate(p)
        self.assertEqual(p, original)
        self.assertEqual(result['initial']['upfront'],100)
        self.assertEqual(result['initial']['totalFixed'],330)
        self.assertEqual(result['rows'][-1]['closingLiability'],0)
        self.assertEqual(result['rows'][-1]['closingAsset'],0)
        self.assertEqual(result['rows'][0]['end'],'2024-08-31')
        self.assertEqual(result['rows'][-1]['end'],'2024-10-31')
        self.assertEqual(result['totals']['depreciation'],result['initial']['asset'])
        for row in result['rows']:
            self.assertAlmostEqual(row['closingLiability'],row['openingLiability']+row['interest']-row['payment'],2)

    def test_amount_and_rate_changes_recalculate(self):
        p=self.params(); initial=calculate(p)
        p['paymentSchedule']['rents'][2]['net']=250
        self.assertGreater(calculate(p)['initial']['liability'],initial['initial']['liability'])
        p=self.params();p['annualRate']=.1
        self.assertLess(calculate(p)['initial']['liability'],initial['initial']['liability'])

    def test_reject_duplicate_or_missing_allocations(self):
        p=self.params(); p['paymentSchedule']['payments'][1]['rentIndices']=[1,2]
        with self.assertRaises(ValueError): calculate(p)
        p=self.params(); p['paymentSchedule']['payments'].pop()
        with self.assertRaises(ValueError): calculate(p)

    def test_reject_invalid_dates_amounts_and_advanced_terms(self):
        for mutate in [lambda p:p['paymentSchedule']['rents'][0].update(net=-1),
                       lambda p:p['paymentSchedule']['rents'][1].update(start='2024-09-02'),
                       lambda p:p['advanced'].update(purchaseEnabled=True,purchaseDecision='yes')]:
            p=self.params();mutate(p)
            with self.assertRaises(ValueError): calculate(p)


if __name__=='__main__': unittest.main()
