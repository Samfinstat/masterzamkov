import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { totals, growth, reasonRows } from '../assets/model.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = p => readFile(path.join(root,p),'utf8');
const data=JSON.parse(await read('data/2026-10.json'));
const total=totals(data.cities);
assert.equal(total.requests,151);assert.equal(total.paid,51);assert.equal(total.revenue,198500);
assert.equal(Math.round(total.spend*100),9388592);
assert.equal(total.closedUnpaid,98);assert.equal(total.open,2);
assert.equal(Math.round((total.revenue-total.spend)*100),10461408);
assert.equal(data.campaigns.reduce((a,c)=>a+c.conversions,0),91);
assert.equal(data.campaigns.reduce((a,c)=>a+c.clicks,0),497);
assert.equal(new Set(data.cities.map(c=>c.name)).size,data.cities.length);
const reasonCount={};
for(const city of data.cities){
  assert.equal(city.requests,city.paid+city.closedUnpaid+city.open);
  assert.equal(Object.values(city.reasons).reduce((a,b)=>a+b,0),city.closedUnpaid);
  for(const [key,n]of Object.entries(city.reasons))reasonCount[key]=(reasonCount[key]||0)+n;
}
assert.equal(reasonCount['Цена или отсутствие денег'],16);
assert.equal(reasonCount['Нет связи, сброс или молчание'],25);
assert.equal(reasonCount['Причина не заполнена'],1);
assert.equal(data.cities.find(c=>c.name==='Волгоград').requests,40);
assert.equal(data.cities.find(c=>c.name==='Новочеркасск').spend,null);
assert.equal(data.cities.find(c=>c.name==='Ростов-на-Дону').spend,0);
assert.equal(totals(data.cities.filter(c=>data.forecast.coreCities.includes(c.name))).paid,47);
for(const budget of [90000,120000,150000,250000])for(const expand of [false,true]){
  const r=growth(data,budget,expand);
  assert.equal(r.allocation.reduce((s,c)=>s+c.spend,0)+r.newBudget,budget);
  assert.ok(r.basePaid>=r.cautiousPaid&&r.cautiousPaid>0);
  assert.ok(r.baseRevenue>=r.cautiousRevenue);
  assert.equal(r.baseRevenue-r.baseBalance,budget);
}
assert.deepEqual(growth(data,120000,false).allocation.map(c=>c.spend),[60000,36000,24000]);
assert.equal(growth(data,150000,true).newBudget,30000);
assert.ok(reasonRows([data.cities.find(c=>c.name==='Симферополь')],data.reasonGroups).includes('нет закрытых'));
for(const relative of ['index.html','reports/2026-10.html']){
  const html=await read(relative);
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(html),'Unresolved template');
  assert.ok(!html.includes('КАЛИТА'),'Unrelated client content');
  assert.ok(!/dnozjskb|rest\/6\/|10014\d{4}|SOURCE_DESCRIPTION|CONTACT_ID|PW_CLIENT/.test(html),'Private or unrelated source data');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'Duplicate HTML ids');
  for(const id of ['city-filter','reason-city','budget','expand-cities','forecast-paid','forecast-revenue','download-csv','print-report'])assert.ok(ids.includes(id));
  for(const href of [...html.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]))assert.ok(ids.includes(href),`Missing anchor ${href}`);
  const embedded=JSON.parse(html.match(/<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(totals(embedded.cities),total);
  for(const ref of [...html.matchAll(/(?:src|href)="((?:\.\/|\.\.\/)[^"]+)"/g)].map(m=>m[1]))await stat(path.resolve(root,path.dirname(relative),ref.split('?')[0]));
}
console.log('Verified: source totals, all city balances, refusal coverage, forecast allocations and boundaries, both report pages, assets and no private CRM fields.');
