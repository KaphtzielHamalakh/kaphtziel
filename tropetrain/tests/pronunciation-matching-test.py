"""Exhaustively compare the production DP with literal path enumeration."""
from pathlib import Path
import itertools,sys,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from pronunciation_matching import forced_edges

def enumerate_paths(n,m,edges):
 paths=[]
 def visit(a,b,score,matches):
  if (a,b)==(n,m):paths.append((score,matches));return
  if a<n:visit(a+1,b,score,matches)
  if b<m:visit(a,b+1,score,matches)
  for e in edges:
   if e[:2]==(a,b):visit(e[2],e[3],score+e[4],matches|{e})
 visit(0,0,0,set())
 best=max(s for s,_ in paths);optimal=[p for s,p in paths if s==best]
 return {'score':best,'paths':len(optimal),'forced':sorted(set.intersection(*optimal))}

class ExactCorrespondence(unittest.TestCase):
 def test_all_small_repeated_and_missing_sequences(self):
  cases=0
  sequences=[p for n in range(4) for p in itertools.product('AB',repeat=n)]
  for source in sequences:
   for target in sequences:
    edges=[(a,b,a+1,b+1,1) for a,x in enumerate(source) for b,y in enumerate(target) if x==y]
    self.assertEqual(forced_edges(len(source),len(target),edges),enumerate_paths(len(source),len(target),edges),(source,target));cases+=1
  self.assertEqual(cases,225)
 def test_all_small_weighted_group_edge_subsets(self):
  candidates=[(0,0,1,1,2),(1,1,2,2,1),(0,0,2,1,3),(0,0,1,2,3),(0,1,1,2,1),(1,0,2,1,1),(0,0,2,2,3)]
  for mask in range(1<<len(candidates)):
   edges=[e for i,e in enumerate(candidates) if mask&(1<<i)]
   self.assertEqual(forced_edges(2,2,edges),enumerate_paths(2,2,edges),edges)
 def test_repetition_is_not_arbitrarily_assigned(self):
  result=forced_edges(1,2,[(0,0,1,1,2),(0,1,1,2,2)])
  self.assertEqual(result,{'score':2,'paths':2,'forced':[]})
 def test_invalid_edges_and_excessive_windows_refused(self):
  for n,m,edges in [(257,0,[]),(0,385,[]),(-1,1,[]),(1,1,[(0,0,0,1,1)]),(1,1,[(0,0,1,1,0)]),(1,1,[(0,0,1,1,1)]*2)]:
   with self.assertRaises(ValueError):forced_edges(n,m,edges)
if __name__=='__main__':unittest.main()
