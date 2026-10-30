import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { growth, rub, num, esc, cityTableRows, reasonRows } from '../assets/model.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const data = JSON.parse(await readFile(path.join(root, 'data/2026-10.json'), 'utf8'));
const template = await readFile(path.join(root, 'template.html'), 'utf8');
const core = growth(data, 120000, false);
const expand = growth(data, 150000, true);
const range = (a,b) => `${Math.round(a)}–${Math.round(b)}`;
const moneyRange = (a,b) => `${num(Math.round(a/1000))}–${num(Math.round(b/1000))} тыс. ₽`;
const primary = ['Самара', 'Саратов', 'Волгоград', 'Сочи', 'Тамбов'].map(name => data.cities.find(c=>c.name===name));
const maxBar = Math.max(...primary.flatMap(c => [c.spend, c.revenue]));
const bars = primary.map(c => `<div class="bar-item"><div class="bar-item-label"><span>${esc(c.name)}</span><strong>${rub(c.revenue)} / ${rub(c.spend)}</strong></div><div class="bar-pair" role="img" aria-label="${esc(c.name)}: оплаты ${rub(c.revenue)}, расходы ${rub(c.spend,2)}"><div class="bar-value" style="width:${c.revenue / maxBar * 100}%"></div><div class="bar-value spend" style="width:${c.spend / maxBar * 100}%"></div></div></div>`).join('');
const values = {
  CITY_OPTIONS: data.cities.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join(''),
  CITY_ROWS: cityTableRows(data.cities),
  CITY_BARS: bars,
  REASON_ROWS: reasonRows(data.cities, data.reasonGroups),
  FORECAST_PAID: range(core.cautiousPaid, core.basePaid),
  FORECAST_REVENUE: moneyRange(core.cautiousRevenue, core.baseRevenue),
  FORECAST_BALANCE: moneyRange(core.cautiousBalance, core.baseBalance),
  PLAN_CORE_PAID: range(core.cautiousPaid, core.basePaid),
  PLAN_CORE_REVENUE: moneyRange(core.cautiousRevenue, core.baseRevenue),
  PLAN_EXPAND_PAID: range(expand.cautiousPaid, expand.basePaid),
  PLAN_EXPAND_REVENUE: moneyRange(expand.cautiousRevenue, expand.baseRevenue),
  ALLOCATION: core.allocation.map(c => `<div class="allocation-item"><span>${esc(c.name)}</span><strong>${rub(c.spend)}</strong></div>`).join('') + '<div class="allocation-item"><span>Новые города</span><strong>0 ₽</strong></div>',
  REPORT_DATA: JSON.stringify(data).replaceAll('<','\\u003c'),
};
for (const [relative, prefix, archive] of [['index.html','./','./reports/2026-10.html'],['reports/2026-10.html','../','./2026-10.html']]) {
  const substitutions = { ...values, ASSET_PREFIX: prefix, ARCHIVE_LINK: archive };
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in substitutions)) throw new Error(`Unknown template key ${key}`);
    return substitutions[key];
  });
  const output = path.join(root, relative);
  await mkdir(path.dirname(output), { recursive:true });
  await writeFile(output, html);
}
await writeFile(path.join(root,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log(JSON.stringify({built:['index.html','reports/2026-10.html'], forecast120:{paid:[core.cautiousPaid,core.basePaid],revenue:[core.cautiousRevenue,core.baseRevenue]},forecast150:{paid:[expand.cautiousPaid,expand.basePaid],revenue:[expand.cautiousRevenue,expand.baseRevenue]}}, null, 2));
