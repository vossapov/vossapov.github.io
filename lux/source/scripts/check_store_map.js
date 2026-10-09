const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const products=JSON.parse(fs.readFileSync('demo/dist/catalog.json'));
const ctx=vm.createContext({products});vm.runInContext(fs.readFileSync('demo/dist/store-map.js','utf8'),ctx);
for(const p of products){ctx.p=p;const loc=vm.runInContext('productPlacement(p)',ctx);assert.ok(loc.row>=1&&loc.row<=15);assert.ok(loc.section>=1&&loc.section<=5);assert.ok(loc.shelf>=1);assert.ok(p.location.includes('Ряд '+loc.row));}
let routes=0;
for(let entry of [1,2])for(let row=1;row<=15;row++)for(let section=1;section<=5;section++){
 ctx.entry=entry;ctx.row=row;ctx.section=section;
 const points=vm.runInContext('demoPosition={x:300,y:entry===1?65:975};mapSelection={row,section};mapRoute()',ctx);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];assert.ok(a.x===b.x||a.y===b.y);
  for(let r=1;r<=15;r++)for(let s=1;s<=5;s++){
   const x=76+(s-1)*37,y=105+(r-1)*57;
   if(a.x===b.x)assert.ok(!(a.x>x&&a.x<x+33&&Math.max(a.y,b.y)>y&&Math.min(a.y,b.y)<y+30),'Route crosses shelf');
   else assert.ok(!(a.y>y&&a.y<y+30&&Math.max(a.x,b.x)>x&&Math.min(a.x,b.x)<x+33),'Route crosses shelf');
  }
 }
 routes++;
}
console.log(`Passed: ${products.length} product locations; ${routes} aisle routes avoid shelves.`);
