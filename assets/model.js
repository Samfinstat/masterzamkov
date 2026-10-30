export function totals(cities) {
  return cities.reduce((a, c) => ({
    requests: a.requests + c.requests,
    paid: a.paid + c.paid,
    closedUnpaid: a.closedUnpaid + c.closedUnpaid,
    open: a.open + c.open,
    revenue: a.revenue + c.revenue,
    spend: a.spend + (c.spend ?? 0),
  }), { requests: 0, paid: 0, closedUnpaid: 0, open: 0, revenue: 0, spend: 0 });
}

export function growth(data, budget = 120000, expand = false) {
  const f = data.forecast;
  const newBudget = expand ? budget * 0.2 : 0;
  const coreBudget = budget - newBudget;
  const allocation = f.coreCities.map((name, i) => {
    const c = data.cities.find(x => x.name === name);
    const spend = coreBudget * f.weights[i];
    const cpa = c.spend / c.paid;
    const averageOrder = c.revenue / c.paid;
    const basePaid = spend / cpa;
    const cautiousPaid = spend / (cpa * (1 + f.existingCpaIncrease));
    return { name, spend, cpa, averageOrder, basePaid, cautiousPaid,
      baseRevenue: basePaid * averageOrder,
      cautiousRevenue: cautiousPaid * averageOrder };
  });
  let basePaid = allocation.reduce((s, x) => s + x.basePaid, 0);
  let cautiousPaid = allocation.reduce((s, x) => s + x.cautiousPaid, 0);
  let baseRevenue = allocation.reduce((s, x) => s + x.baseRevenue, 0);
  let cautiousRevenue = allocation.reduce((s, x) => s + x.cautiousRevenue, 0);
  basePaid += newBudget / f.newCpaBase;
  cautiousPaid += newBudget / f.newCpaCautious;
  baseRevenue += newBudget / f.newCpaBase * f.newAverageOrder;
  cautiousRevenue += newBudget / f.newCpaCautious * f.newAverageOrder;
  return { budget, newBudget, coreBudget, allocation, basePaid, cautiousPaid,
    baseRevenue, cautiousRevenue, baseBalance: baseRevenue - budget,
    cautiousBalance: cautiousRevenue - budget };
}

export const rub = (n, digits = 0) => new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: digits,
  minimumFractionDigits: digits,
}).format(n).replaceAll('\u00a0', ' ');
export const num = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n);
export const percent = (n, d) => d ? `${num(n / d * 100)}%` : '—';
export const esc = s => String(s).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));

export function cityTableRows(cities) {
  return cities.map(c => `<tr><th scope="row">${esc(c.name)}</th><td>${c.requests}</td><td>${c.paid}</td><td>${c.spend === null ? '<span class="muted">—</span>' : rub(c.spend, 2)}</td><td class="teal">${rub(c.revenue)}</td><td>${percent(c.paid, c.requests)}</td><td>${c.spend === null || !c.paid ? '—' : rub(c.spend / c.paid)}</td></tr>`).join('');
}

export function reasonRows(cities, groupOrder) {
  const counts = {};
  for (const city of cities) for (const [key, n] of Object.entries(city.reasons)) counts[key] = (counts[key] || 0) + n;
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  return groupOrder.filter(key => counts[key]).sort((a, b) => counts[b] - counts[a]).map(key => {
    const n = counts[key];
    return `<div class="reason-row"><div class="reason-caption"><span>${esc(key)}</span><strong>${n}<small>${percent(n, sum)}</small></strong></div><div class="reason-track"><span style="width:${n / sum * 100}%"></span></div></div>`;
  }).join('') || '<p class="muted">В выбранном городе нет закрытых неоплаченных сделок.</p>';
}
