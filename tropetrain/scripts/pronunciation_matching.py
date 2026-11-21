"""Exact monotonic correspondence edges that occur on every best alignment.

Skip edges carry zero weight. Match weights count exact comparison letters;
no substitution, approximate spelling or arbitrary tie break is allowed.
Python integers count all optimal paths exactly, including alternative skips.
"""
def forced_edges(n,m,edges):
 if n<0 or m<0 or n>256 or m>384:raise ValueError('Correspondence window outside audited bounds.')
 outgoing={}
 for edge in edges:
  a,b,c,d,weight=edge
  if not (0<=a<c<=n and 0<=b<d<=m and isinstance(weight,int) and weight>0):raise ValueError('Invalid exact correspondence edge.')
  outgoing.setdefault((a,b),[]).append(edge)
 if len(set(edges))!=len(edges):raise ValueError('Duplicate exact correspondence edge.')
 score=[[0]*(m+1) for _ in range(n+1)];count=[[0]*(m+1) for _ in range(n+1)];count[0][0]=1
 def successors(a,b):
  if a<n:yield a+1,b,0,None
  if b<m:yield a,b+1,0,None
  for edge in outgoing.get((a,b),[]):yield edge[2],edge[3],edge[4],edge
 for a in range(n+1):
  for b in range(m+1):
   for c,d,w,_ in successors(a,b):
    value=score[a][b]+w
    if value>score[c][d]:score[c][d]=value;count[c][d]=count[a][b]
    elif value==score[c][d]:count[c][d]+=count[a][b]
 tail=[[0]*(m+1) for _ in range(n+1)];ways=[[0]*(m+1) for _ in range(n+1)];ways[n][m]=1
 for a in range(n,-1,-1):
  for b in range(m,-1,-1):
   if (a,b)==(n,m):continue
   options=[(w+tail[c][d],ways[c][d]) for c,d,w,_ in successors(a,b)]
   tail[a][b]=max(v for v,_ in options);ways[a][b]=sum(k for v,k in options if v==tail[a][b])
 optimum=score[n][m];total=count[n][m]
 assert tail[0][0]==optimum and ways[0][0]==total
 forced=[edge for edge in edges if score[edge[0]][edge[1]]+edge[4]+tail[edge[2]][edge[3]]==optimum and count[edge[0]][edge[1]]*ways[edge[2]][edge[3]]==total]
 return {'score':optimum,'paths':total,'forced':sorted(forced)}
