import { totals, growth, rub, num, percent, esc, cityTableRows, reasonRows } from './model.js';

const data = JSON.parse(document.getElementById('report-data').textContent);
const $ = id => document.getElementById(id);
let sortKey = null;
let sortDirection = -1;

function selectedCities(selectId) {
  const city = $(selectId).value;
  return city === 'all' ? data.cities : data.cities.filter(c => c.name === city);
}

function updateCities() {
  const selected = [...selectedCities('city-filter')];
  if (sortKey) selected.sort((a, b) => {
    if (a[sortKey] === null) return b[sortKey] === null ? 0 : 1;
    if (b[sortKey] === null) return -1;
    return sortDirection * (typeof a[sortKey] === 'string' ? a[sortKey].localeCompare(b[sortKey], 'ru') : a[sortKey] - b[sortKey]);
  });
  $('city-rows').innerHTML = cityTableRows(selected);
  const t = totals(selected);
  const hasSpend = selected.some(c => c.spend !== null);
  $('city-total-label').textContent = selected.length === 1 ? 'По городу' : 'Итого';
  $('city-total-requests').textContent = t.requests;
  $('city-total-paid').textContent = t.paid;
  $('city-total-spend').textContent = hasSpend ? rub(t.spend, 2) : '—';
  $('city-total-revenue').textContent = rub(t.revenue);
  $('city-total-conversion').textContent = percent(t.paid, t.requests);
  $('city-total-cpa').textContent = hasSpend && t.paid ? rub(t.spend / t.paid) : '—';
}

function updateReasons() {
  const selected = selectedCities('reason-city');
  $('reason-rows').innerHTML = reasonRows(selected, data.reasonGroups);
  $('reason-caption').textContent = `Закрыто без оплаты: ${totals(selected).closedUnpaid}`;
}

const countRange = (a, b) => `${Math.round(a)}–${Math.round(b)}`;
const moneyRange = (a, b) => `${num(Math.round(a / 1000))}–${num(Math.round(b / 1000))} тыс. ₽`;

function updateGrowth() {
  const budget = Number($('budget').value);
  const expand = $('expand-cities').checked;
  const result = growth(data, budget, expand);
  $('budget-output').value = rub(budget);
  $('forecast-paid').textContent = countRange(result.cautiousPaid, result.basePaid);
  $('forecast-revenue').textContent = moneyRange(result.cautiousRevenue, result.baseRevenue);
  $('forecast-balance').textContent = moneyRange(result.cautiousBalance, result.baseBalance);
  $('allocation').innerHTML = result.allocation.map(c => `<div class="allocation-item"><span>${esc(c.name)}</span><strong>${rub(c.spend)}</strong></div>`).join('') + `<div class="allocation-item"><span>${expand ? 'Новые города · 2 теста' : 'Новые города'}</span><strong>${rub(result.newBudget)}</strong>${expand ? `<small class="muted">по ${rub(result.newBudget / 2)}</small>` : ''}</div>`;
  document.querySelectorAll('[data-scenario]').forEach(button => {
    const active = button.dataset.scenario === 'core' ? budget === 120000 && !expand : budget === 150000 && expand;
    button.setAttribute('aria-pressed', String(active));
  });
}

$('city-filter').addEventListener('change', updateCities);
$('reason-city').addEventListener('change', updateReasons);
$('budget').addEventListener('input', updateGrowth);
$('expand-cities').addEventListener('change', updateGrowth);
$('print-report').addEventListener('click', () => window.print());

document.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.sort;
  sortDirection = sortKey === key ? sortDirection * -1 : (key === 'name' ? 1 : -1);
  sortKey = key;
  document.querySelectorAll('[data-sort]').forEach(other => other.closest('th').removeAttribute('aria-sort'));
  button.closest('th').setAttribute('aria-sort', sortDirection === 1 ? 'ascending' : 'descending');
  updateCities();
}));

document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => {
  const expand = button.dataset.scenario === 'expand';
  $('budget').value = expand ? 150000 : 120000;
  $('expand-cities').checked = expand;
  updateGrowth();
}));

$('download-csv').addEventListener('click', () => {
  const header = ['Город','Обращения','Оплаченные сделки','Расходы рекламы, руб.','Оплаты по CRM, руб.','Закрыты без оплаты','В работе'];
  const rows = selectedCities('city-filter').map(c => [c.name,c.requests,c.paid,c.spend ?? '',c.revenue,c.closedUnpaid,c.open]);
  const quote = v => `"${String(v).replaceAll('"','""')}"`;
  const text = '\uFEFF' + [header, ...rows].map(row => row.map(quote).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type:'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = 'masterzamkov-october-2026.csv';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('active', a.hash === `#${entry.target.id}`));
    }
  }, { rootMargin:'-15% 0px -65% 0px', threshold:0 });
  document.querySelectorAll('.nav a').forEach(a => { const section = document.querySelector(a.hash); if (section) observer.observe(section); });
}

updateCities();
updateReasons();
updateGrowth();
