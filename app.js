'use strict';

// ---------- Настройки ----------

// Зеркала Overpass API (данные OpenStreetMap). Перебираются по очереди, если одно не отвечает.
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Категории бизнеса: ключ OSM -> список значений ('*' = любое значение).
const CATEGORIES = [
  { id: 'beauty', label: 'Красота', on: true, tags: { shop: ['hairdresser', 'beauty', 'cosmetics', 'massage', 'tattoo'], amenity: ['spa'] } },
  { id: 'auto', label: 'Автосервис', on: true, tags: { shop: ['car_repair', 'tyres', 'car_parts', 'motorcycle'], amenity: ['car_wash'], craft: ['car_repair'] } },
  { id: 'food', label: 'Кафе и еда', on: true, tags: { amenity: ['cafe', 'restaurant', 'fast_food', 'bar', 'pub'] } },
  { id: 'foodshop', label: 'Продукты/пекарни', tags: { shop: ['bakery', 'butcher', 'confectionery', 'deli', 'pastry', 'greengrocer', 'seafood', 'cheese', 'beverages', 'alcohol'] } },
  { id: 'flowers', label: 'Цветы/подарки', tags: { shop: ['florist', 'gift', 'garden_centre'] } },
  { id: 'repair', label: 'Ремонт и бытовые услуги', on: true, tags: { shop: ['mobile_phone', 'computer', 'electronics', 'repair', 'dry_cleaning', 'laundry', 'locksmith', 'shoe_repair', 'tailor', 'copyshop', 'photo'], craft: ['shoemaker', 'tailor', 'key_cutter', 'electronics_repair', 'watchmaker', 'photographer'] } },
  { id: 'build', label: 'Стройка/мебель', tags: { shop: ['hardware', 'doityourself', 'furniture', 'doors', 'windows', 'flooring', 'tiles', 'paint', 'bathroom_furnishing', 'kitchen', 'curtain', 'lighting'], craft: ['carpenter', 'plumber', 'electrician', 'window_construction', 'roofer', 'builder', 'glaziery', 'upholsterer'] } },
  { id: 'health', label: 'Медицина/стоматология', tags: { amenity: ['dentist', 'clinic', 'doctors'], healthcare: ['dentist', 'clinic', 'doctor', 'physiotherapist', 'psychotherapist'], shop: ['optician', 'medical_supply', 'hearing_aids'] } },
  { id: 'pets', label: 'Ветеринария/зоо', tags: { amenity: ['veterinary'], shop: ['pet', 'pet_grooming'] } },
  { id: 'sport', label: 'Спорт/фитнес', tags: { leisure: ['fitness_centre', 'sports_centre', 'dance'], shop: ['sports'] } },
  { id: 'edu', label: 'Обучение/кружки', tags: { amenity: ['driving_school', 'language_school', 'music_school', 'training', 'kindergarten', 'childcare', 'prep_school'] } },
  { id: 'hotel', label: 'Гостиницы', tags: { tourism: ['hotel', 'guest_house', 'hostel', 'motel', 'apartment'] } },
  { id: 'clothes', label: 'Одежда/обувь', tags: { shop: ['clothes', 'shoes', 'boutique', 'fabric', 'jewelry', 'bag', 'second_hand', 'wedding'] } },
  { id: 'office', label: 'Офисы и услуги', tags: { office: ['company', 'lawyer', 'estate_agent', 'accountant', 'notary', 'insurance', 'travel_agent', 'tax_advisor', 'advertising_agency'], shop: ['travel_agency', 'funeral_directors'] } },
  { id: 'allshops', label: 'Все магазины', tags: { shop: '*' } },
  { id: 'allcraft', label: 'Все мастерские', tags: { craft: '*' } },
];

// Человекочитаемые названия частых типов.
const TYPE_RU = {
  hairdresser: 'Парикмахерская', beauty: 'Салон красоты', cosmetics: 'Косметика', massage: 'Массаж', tattoo: 'Тату', spa: 'СПА',
  car_repair: 'Автосервис', tyres: 'Шиномонтаж', car_parts: 'Автозапчасти', car_wash: 'Автомойка', motorcycle: 'Мото',
  cafe: 'Кафе', restaurant: 'Ресторан', fast_food: 'Фастфуд', bar: 'Бар', pub: 'Паб',
  bakery: 'Пекарня', butcher: 'Мясная лавка', confectionery: 'Кондитерская', deli: 'Деликатесы', greengrocer: 'Овощи-фрукты',
  seafood: 'Рыба', cheese: 'Сыры', beverages: 'Напитки', alcohol: 'Алкоголь', pastry: 'Кондитерская',
  florist: 'Цветы', gift: 'Подарки', garden_centre: 'Садовый центр',
  mobile_phone: 'Телефоны/ремонт', computer: 'Компьютеры', electronics: 'Электроника', repair: 'Ремонт', dry_cleaning: 'Химчистка',
  laundry: 'Прачечная', locksmith: 'Ключи/замки', shoe_repair: 'Ремонт обуви', tailor: 'Ателье', copyshop: 'Копицентр', photo: 'Фото',
  shoemaker: 'Ремонт обуви', key_cutter: 'Изготовление ключей', electronics_repair: 'Ремонт техники', watchmaker: 'Ремонт часов', photographer: 'Фотограф',
  hardware: 'Хозтовары', doityourself: 'Стройматериалы', furniture: 'Мебель', doors: 'Двери', windows: 'Окна', flooring: 'Полы',
  tiles: 'Плитка', paint: 'Краски', bathroom_furnishing: 'Сантехника', kitchen: 'Кухни', curtain: 'Шторы', lighting: 'Свет',
  carpenter: 'Столяр', plumber: 'Сантехник', electrician: 'Электрик', window_construction: 'Окна', roofer: 'Кровля', builder: 'Строители',
  glaziery: 'Стекольщик', upholsterer: 'Перетяжка мебели',
  dentist: 'Стоматология', clinic: 'Клиника', doctors: 'Врач', doctor: 'Врач', physiotherapist: 'Физиотерапия', psychotherapist: 'Психотерапевт',
  optician: 'Оптика', medical_supply: 'Медтехника', hearing_aids: 'Слуховые аппараты',
  veterinary: 'Ветклиника', pet: 'Зоомагазин', pet_grooming: 'Груминг',
  fitness_centre: 'Фитнес', sports_centre: 'Спорткомплекс', dance: 'Танцы', sports: 'Спорттовары',
  driving_school: 'Автошкола', language_school: 'Языковая школа', music_school: 'Музыкальная школа', training: 'Курсы',
  kindergarten: 'Детский сад', childcare: 'Детский центр', prep_school: 'Подготовка к школе',
  hotel: 'Гостиница', guest_house: 'Гостевой дом', hostel: 'Хостел', motel: 'Мотель', apartment: 'Апартаменты',
  clothes: 'Одежда', shoes: 'Обувь', boutique: 'Бутик', fabric: 'Ткани', jewelry: 'Ювелирный', bag: 'Сумки', second_hand: 'Секонд-хенд', wedding: 'Свадебный салон',
  company: 'Компания', lawyer: 'Юрист', estate_agent: 'Недвижимость', accountant: 'Бухгалтер', notary: 'Нотариус', insurance: 'Страхование',
  travel_agent: 'Турагентство', travel_agency: 'Турагентство', tax_advisor: 'Налоговый консультант', advertising_agency: 'Реклама',
  funeral_directors: 'Ритуальные услуги',
};

const STATUSES = [
  { id: 'new', label: 'Новый' },
  { id: 'contacted', label: 'Написал' },
  { id: 'interested', label: 'Интерес' },
  { id: 'client', label: 'Клиент' },
  { id: 'rejected', label: 'Отказ' },
];

const DEFAULT_TPL = 'Здравствуйте! Нашёл «{name}» на карте и заметил, что у вас пока нет своего сайта. ' +
  'Я делаю сайты для малого бизнеса — быстро и недорого, с записью/заказом онлайн и выходом в поиск Яндекса и Google. ' +
  'Могу показать примеры и сделать бесплатный макет. Интересно?';

// ---------- Хранилище (localStorage может быть недоступен) ----------

const store = {
  get(key, def) { try { const v = localStorage.getItem(key); return v == null ? def : JSON.parse(v); } catch { return def; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* приватный режим */ } },
};

let crm = store.get('leads.crm', {});       // { osmId: { status, note } }
let lastResults = [];                        // нормализованные объекты из последнего поиска

// ---------- Карта ----------

const $ = sel => document.querySelector(sel);
const view = store.get('leads.view', { lat: 55.7558, lng: 37.6173, z: 13 });
const map = L.map('map', { zoomControl: true }).setView([view.lat, view.lng], view.z);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '© участники OpenStreetMap',
}).addTo(map);
const cluster = L.markerClusterGroup({ maxClusterRadius: 45, showCoverageOnHover: false });
map.addLayer(cluster);
map.on('moveend', () => {
  const c = map.getCenter();
  store.set('leads.view', { lat: c.lat, lng: c.lng, z: map.getZoom() });
});

// ---------- Интерфейс фильтров ----------

const savedCats = store.get('leads.cats', null);
$('#cats').innerHTML = CATEGORIES.map(c => {
  const on = savedCats ? savedCats.includes(c.id) : !!c.on;
  return `<label class="chip"><input type="checkbox" value="${c.id}" ${on ? 'checked' : ''}>${c.label}</label>`;
}).join('');
$('#cats').addEventListener('change', () => store.set('leads.cats', selectedCats().map(c => c.id)));

$('#optStatus').insertAdjacentHTML('beforeend', STATUSES.map(s => `<option value="${s.id}">${s.label}</option>`).join(''));

const OPTS = ['optNoSite', 'optSocialOk', 'optPhone', 'optNoChains', 'optHideRejected'];
const savedOpts = store.get('leads.opts', {});
for (const id of OPTS) {
  if (id in savedOpts) $('#' + id).checked = savedOpts[id];
  $('#' + id).addEventListener('change', () => {
    store.set('leads.opts', Object.fromEntries(OPTS.map(o => [o, $('#' + o).checked])));
    render();
  });
}
$('#optStatus').addEventListener('change', render);

$('#tplText').value = store.get('leads.tpl', DEFAULT_TPL);
$('#tplText').addEventListener('input', e => store.set('leads.tpl', e.target.value));

$('#filtersBtn').addEventListener('click', () => $('#filters').classList.toggle('open'));

document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
function showTab(tab) {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
  $('#map').classList.toggle('active', tab === 'map');
  $('#list').classList.toggle('active', tab === 'list');
  if (tab === 'map') map.invalidateSize();
}

function selectedCats() {
  const ids = [...document.querySelectorAll('#cats input:checked')].map(i => i.value);
  return CATEGORIES.filter(c => ids.includes(c.id));
}

function setStatus(text) { $('#status').textContent = text; }

// ---------- Поиск города ----------

$('#cityForm').addEventListener('submit', async e => {
  e.preventDefault();
  const q = $('#cityInput').value.trim();
  if (!q) return;
  setStatus('Ищу «' + q + '»…');
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru&q=' + encodeURIComponent(q));
    const data = await r.json();
    if (!data.length) { setStatus('Место не найдено. Попробуйте написать иначе.'); return; }
    const [s, n, w, e2] = data[0].boundingbox.map(Number);
    map.fitBounds([[s, w], [n, e2]]);
    showTab('map');
    setStatus(data[0].display_name + ' — теперь нажмите «Искать». Для большого города лучше приблизить нужный район.');
  } catch {
    setStatus('Не удалось найти город (нет сети?). Можно просто подвинуть карту вручную.');
  }
});

$('#geoBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { setStatus('Геолокация недоступна в этом браузере.'); return; }
  setStatus('Определяю местоположение…');
  navigator.geolocation.getCurrentPosition(
    p => { map.setView([p.coords.latitude, p.coords.longitude], 15); showTab('map'); setStatus('Готово. Нажмите «Искать».'); },
    () => setStatus('Не удалось получить местоположение — разрешите доступ к геолокации.'),
    { enableHighAccuracy: true, timeout: 15000 },
  );
});

// ---------- Запрос к Overpass ----------

function buildQuery(cats, b) {
  const box = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
  const parts = [];
  for (const c of cats) {
    for (const [key, vals] of Object.entries(c.tags)) {
      const sel = vals === '*' ? `["${key}"]` : `["${key}"~"^(${vals.join('|')})$"]`;
      parts.push(`nwr${sel}["name"](${box});`);
    }
  }
  return `[out:json][timeout:120];(${parts.join('')});out center tags;`;
}

async function overpass(query) {
  let lastErr;
  for (const url of OVERPASS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 130000);
      const r = await fetch(url, {
        method: 'POST', body: 'data=' + encodeURIComponent(query), signal: ctrl.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (err) {
      lastErr = err;
      setStatus('Сервер не ответил, пробую другой…');
    }
  }
  throw lastErr;
}

$('#searchBtn').addEventListener('click', async () => {
  const cats = selectedCats();
  if (!cats.length) { setStatus('Отметьте хотя бы одну категорию в фильтрах.'); $('#filters').classList.add('open'); return; }
  const b = map.getBounds();
  const area = (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest());
  if (area > 1.5 && !confirm('Область очень большая — поиск может занять минуту и вернуть тысячи объектов. Продолжить?')) return;

  const btn = $('#searchBtn');
  btn.disabled = true;
  setStatus('Загружаю данные с карты…');
  try {
    const data = await overpass(buildQuery(cats, b));
    const seen = new Set();
    lastResults = data.elements
      .map(normalize)
      .filter(x => x && !seen.has(x.id) && seen.add(x.id));
    $('#csvBtn').disabled = !lastResults.length;
    render(true);
    $('#filters').classList.remove('open'); // на телефоне сворачиваем фильтры, чтобы освободить место
  } catch (err) {
    setStatus('Ошибка загрузки: ' + err.message + '. Попробуйте ещё раз или уменьшите область.');
  } finally {
    btn.disabled = false;
  }
});

// ---------- Обработка результатов ----------

function normalize(el) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || !t.name) return null;
  const typeKey = ['shop', 'amenity', 'craft', 'office', 'healthcare', 'leisure', 'tourism'].find(k => t[k]);
  const typeVal = typeKey ? t[typeKey] : '';
  const site = t.website || t['contact:website'] || t.url || '';
  const social = [
    t['contact:vk'] || t.vk, t['contact:instagram'] || t.instagram, t['contact:telegram'] || t.telegram,
    t['contact:facebook'] || t.facebook, t['contact:ok'], t['contact:whatsapp'],
  ].filter(Boolean);
  const isSocialSite = site && /(vk\.com|vkontakte|instagram\.com|facebook\.com|t\.me|ok\.ru|wa\.me|taplink|2gis|yandex\.ru\/maps|google\.[a-z.]+\/maps)/i.test(site);
  const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', ');
  const address = [t['addr:city'], street].filter(Boolean).join(', ') || t['addr:full'] || '';
  return {
    id: el.type + '/' + el.id,
    name: t.name,
    category: TYPE_RU[typeVal] || typeVal.replace(/_/g, ' '),
    lat, lng, address,
    phone: (t.phone || t['contact:phone'] || t['contact:mobile'] || t['phone:mobile'] || '').split(';')[0].trim(),
    email: t.email || t['contact:email'] || '',
    hours: t.opening_hours || '',
    site, social, isSocialSite,
    chain: !!(t.brand || t['brand:wikidata'] || t['operator:wikidata']),
  };
}

function hasRealSite(x, socialOk) {
  if (!x.site) return false;
  return !(socialOk && x.isSocialSite);
}

function filtered() {
  const noSite = $('#optNoSite').checked, socialOk = $('#optSocialOk').checked;
  const phone = $('#optPhone').checked, noChains = $('#optNoChains').checked;
  const hideRej = $('#optHideRejected').checked, st = $('#optStatus').value;
  return lastResults.filter(x => {
    if (noSite && hasRealSite(x, socialOk)) return false;
    if (phone && !x.phone) return false;
    if (noChains && x.chain) return false;
    const s = crm[x.id]?.status || 'new';
    if (hideRej && s === 'rejected' && st !== 'rejected') return false;
    if (st && s !== st) return false;
    return true;
  }).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, 'ru'));
}

// Чем больше контактов — тем «теплее» лид (до него проще достучаться).
function score(x) { return (x.phone ? 3 : 0) + (x.social.length || x.isSocialSite ? 2 : 0) + (x.email ? 1 : 0) + (x.hours ? 1 : 0); }

// ---------- Отрисовка ----------

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const digits = p => p.replace(/[^\d+]/g, '');
const waNumber = p => { let d = p.replace(/\D/g, ''); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); return d; };

function fillTpl(x) {
  return $('#tplText').value
    .replaceAll('{name}', x.name).replaceAll('{category}', x.category.toLowerCase()).replaceAll('{address}', x.address);
}

function linksHtml(x) {
  const q = encodeURIComponent(x.name + (x.address ? ' ' + x.address : ''));
  const parts = [];
  if (x.phone) {
    parts.push(`<a class="call" href="tel:${esc(digits(x.phone))}">📞 ${esc(x.phone)}</a>`);
    parts.push(`<a href="https://wa.me/${waNumber(x.phone)}?text=${encodeURIComponent(fillTpl(x))}" target="_blank" rel="noopener">WhatsApp</a>`);
  }
  if (x.email) parts.push(`<a href="mailto:${esc(x.email)}?subject=${encodeURIComponent('Сайт для ' + x.name)}&body=${encodeURIComponent(fillTpl(x))}">✉ Email</a>`);
  for (const s of x.social) {
    const href = /^https?:/.test(s) ? s : (s.startsWith('@') ? 'https://t.me/' + s.slice(1) : 'https://' + s.replace(/^\/+/, ''));
    parts.push(`<a href="${esc(href)}" target="_blank" rel="noopener">Соцсеть</a>`);
  }
  if (x.site) parts.push(`<a href="${esc(/^https?:/.test(x.site) ? x.site : 'https://' + x.site)}" target="_blank" rel="noopener">${x.isSocialSite ? 'Соцсеть' : '🌐 Сайт'}</a>`);
  parts.push(`<a href="https://yandex.ru/maps/?text=${q}&ll=${x.lng},${x.lat}&z=17" target="_blank" rel="noopener">Яндекс</a>`);
  parts.push(`<a href="https://2gis.ru/search/${q}" target="_blank" rel="noopener">2ГИС</a>`);
  parts.push(`<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Google</a>`);
  return parts.join('');
}

function siteTag(x) {
  if (!x.site) return '<span class="tag nosite">нет сайта</span>';
  if (x.isSocialSite) return '<span class="tag social">только соцсеть</span>';
  return '<span class="tag site">есть сайт</span>';
}

function render(fresh) {
  const items = filtered();
  $('#countBadge').textContent = lastResults.length ? `(${items.length})` : '';
  if (fresh || lastResults.length) {
    const noSiteTotal = lastResults.filter(x => !hasRealSite(x, $('#optSocialOk').checked)).length;
    setStatus(`Найдено объектов: ${lastResults.length}, из них без сайта: ${noSiteTotal}. Показано: ${items.length}.`);
  }

  cluster.clearLayers();
  for (const x of items) {
    const m = L.marker([x.lat, x.lng]);
    m.bindPopup(() => `<b>${esc(x.name)}</b><br>${esc(x.category)}<br>${esc(x.address)}<br>${x.phone ? esc(x.phone) + '<br>' : ''}<a data-goto="${x.id}">Открыть в списке →</a>`);
    cluster.addLayer(m);
  }

  const list = $('#list');
  if (!lastResults.length) return;
  if (!items.length) { list.innerHTML = '<p class="empty">Под фильтры ничего не подходит. Ослабьте фильтры или выберите другую область.</p>'; return; }
  list.innerHTML = items.map(x => {
    const c = crm[x.id] || {};
    const st = c.status || 'new';
    return `<article class="card st-${st}" id="c-${x.id.replace('/', '-')}" data-id="${x.id}">
      <h3>${esc(x.name)}</h3>
      <div class="meta">${esc(x.category)}${x.address ? ' · ' + esc(x.address) : ''}</div>
      <div class="meta">${siteTag(x)}${x.hours ? '🕒 ' + esc(x.hours) : ''}</div>
      <div class="row">${linksHtml(x)}</div>
      <div class="row">
        <select data-act="status">${STATUSES.map(s => `<option value="${s.id}" ${s.id === st ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
        <button type="button" data-act="copy">Копировать текст</button>
        <button type="button" data-act="show">На карте</button>
      </div>
      <textarea data-act="note" placeholder="Заметка: с кем говорил, когда перезвонить…">${esc(c.note || '')}</textarea>
    </article>`;
  }).join('');
}

function saveCrm(id, patch) {
  crm[id] = { ...crm[id], ...patch };
  store.set('leads.crm', crm);
}

$('#list').addEventListener('change', e => {
  const card = e.target.closest('.card');
  if (card && e.target.dataset.act === 'status') {
    saveCrm(card.dataset.id, { status: e.target.value });
    card.className = 'card st-' + e.target.value;
  }
});
$('#list').addEventListener('input', e => {
  const card = e.target.closest('.card');
  if (card && e.target.dataset.act === 'note') saveCrm(card.dataset.id, { note: e.target.value });
});
$('#list').addEventListener('click', async e => {
  const card = e.target.closest('.card');
  if (!card) return;
  const x = lastResults.find(r => r.id === card.dataset.id);
  if (e.target.dataset.act === 'show') {
    showTab('map');
    map.setView([x.lat, x.lng], 18);
  } else if (e.target.dataset.act === 'copy') {
    try { await navigator.clipboard.writeText(fillTpl(x)); e.target.textContent = 'Скопировано ✓'; }
    catch { prompt('Скопируйте текст:', fillTpl(x)); }
  }
});
map.on('popupopen', e => {
  const a = e.popup.getElement().querySelector('[data-goto]');
  if (!a) return;
  a.addEventListener('click', () => {
    showTab('list');
    const card = document.getElementById('c-' + a.dataset.goto.replace('/', '-'));
    if (!card) return;
    document.querySelectorAll('.card.focus').forEach(c => c.classList.remove('focus'));
    card.classList.add('focus');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

// ---------- Экспорт CSV (открывается в Excel / Google Таблицах) ----------

$('#csvBtn').addEventListener('click', () => {
  const rows = [['Название', 'Категория', 'Адрес', 'Телефон', 'Email', 'Соцсети', 'Сайт', 'Часы работы', 'Статус', 'Заметка', 'Широта', 'Долгота', 'Яндекс Карты']];
  for (const x of filtered()) {
    const c = crm[x.id] || {};
    rows.push([x.name, x.category, x.address, x.phone, x.email, x.social.join(' '), x.site, x.hours,
      STATUSES.find(s => s.id === (c.status || 'new')).label, c.note || '', x.lat, x.lng,
      `https://yandex.ru/maps/?text=${encodeURIComponent(x.name)}&ll=${x.lng},${x.lat}&z=17`]);
  }
  const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `клиенты-без-сайта-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// ---------- Установка как приложение ----------

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
