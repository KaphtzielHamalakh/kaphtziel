"""Independent signal fixtures; only Python stdlib is needed for scalar checks."""
from pathlib import Path
import sys,math,random,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from pitch_measurement import difference_reference,estimate_difference
class PitchTests(unittest.TestCase):
 def signal(self,f,dc=0,harmonics=((1,1),)):
  return [dc+sum(a*math.sin(2*math.pi*f*h*i/16000+.13*h) for h,a in harmonics) for i in range(1024)]
 def hz(self,frame):return estimate_difference(difference_reference(frame,248),16000)
 def test_known_sines(self):
  for f in [66,73.4162,110,146.8324,220,440,590]:
   with self.subTest(f=f):
    result=self.hz(self.signal(f));self.assertIsNotNone(result);self.assertLess(abs(1200*math.log2(result[0]/f)),1.5);self.assertGreater(result[1],.98)
 def test_weak_fundamental(self):
  result=self.hz(self.signal(146.8324,harmonics=((1,.1),(2,1),(3,.7),(4,.2))));self.assertIsNotNone(result);self.assertLess(abs(1200*math.log2(result[0]/146.8324)),2)
 def test_dc_does_not_change_difference(self):
  a=difference_reference(self.signal(220),248);b=difference_reference(self.signal(220,dc=.8),248);self.assertLess(max(abs(x-y) for x,y in zip(a,b)),1e-9)
 def test_silence_abstains(self):self.assertIsNone(self.hz([0.]*1024))
 def test_noise_abstains(self):
  generator=random.Random(337);self.assertIsNone(self.hz([generator.uniform(-1,1) for _ in range(1024)]))
 def test_aperiodic_floor_has_no_global_minimum_fallback(self):self.assertIsNone(estimate_difference([0.]+[1.]*248,16000))
 def test_frequency_bounds_are_respected(self):
  self.assertIsNone(self.hz(self.signal(62)));self.assertIsNone(self.hz(self.signal(610)))
 def test_reference_difference_is_nonnegative_and_zero_at_origin(self):
  d=difference_reference(self.signal(125),248);self.assertEqual(d[0],0);self.assertTrue(all(x>=0 for x in d));self.assertLess(d[128],1e-20)
if __name__=='__main__':unittest.main()
