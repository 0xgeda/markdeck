export function changedLines(before,after){
  const a=before.split('\n'),b=after.split('\n'),old=new Set(),fresh=new Set();
  // ponytail: bound LCS memory for very large reports; highlight the changed region beyond 2M cells.
  if((a.length+1)*(b.length+1)>2_000_000){let first=0,endA=a.length,endB=b.length;while(first<endA&&first<endB&&a[first]===b[first])first++;while(endA>first&&endB>first&&a[endA-1]===b[endB-1]){endA--;endB--;}for(let i=first;i<endA;i++)old.add(i);for(let i=first;i<endB;i++)fresh.add(i);return {old,fresh};}
  const width=b.length+1,table=new Uint32Array((a.length+1)*width);
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i*width+j]=a[i]===b[j]?1+table[(i+1)*width+j+1]:Math.max(table[(i+1)*width+j],table[i*width+j+1]);
  let i=0,j=0;while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){i++;j++;}else if(i<a.length&&(j===b.length||table[(i+1)*width+j]>=table[i*width+j+1]))old.add(i++);else fresh.add(j++);}
  return {old,fresh};
}
