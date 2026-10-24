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

// Поисковые запросы 2ГИС для тех же категорий (2ГИС ищет по рубрикам/тексту, а не по тегам OSM).
const QUERIES_2GIS = {
  beauty: ['Парикмахерские', 'Салоны красоты', 'Ногтевые студии', 'Барбершопы', 'Массаж', 'Тату-салоны', 'Косметология'],
  auto: ['Автосервисы', 'Шиномонтаж', 'Автомойки', 'Автозапчасти', 'Кузовной ремонт', 'Автоэлектрики'],
  food: ['Кафе', 'Рестораны', 'Быстрое питание', 'Кофейни', 'Бары', 'Доставка еды', 'Суши-бары', 'Шаурма'],
  foodshop: ['Пекарни', 'Кондитерские', 'Мясные магазины', 'Рыбные магазины', 'Продуктовые магазины', 'Торты на заказ'],
  flowers: ['Цветы', 'Подарки', 'Воздушные шары'],
  repair: ['Ремонт телефонов', 'Ремонт бытовой техники', 'Ремонт компьютеров', 'Химчистки', 'Ремонт обуви', 'Ателье', 'Изготовление ключей', 'Фотоуслуги'],
  build: ['Строительные материалы', 'Мебель на заказ', 'Окна', 'Двери', 'Ремонт квартир', 'Натяжные потолки', 'Сантехника', 'Кухни на заказ'],
  health: ['Стоматологии', 'Медицинские центры', 'Оптика', 'Психологи', 'Массажные салоны'],
  pets: ['Ветеринарные клиники', 'Зоомагазины', 'Груминг'],
  sport: ['Фитнес-клубы', 'Йога', 'Школы танцев', 'Спортивные секции', 'Единоборства'],
  edu: ['Автошколы', 'Языковые школы', 'Детские развивающие центры', 'Репетиторы', 'Курсы', 'Частные детские сады'],
  hotel: ['Гостиницы', 'Хостелы', 'Базы отдыха', 'Посуточная аренда'],
  clothes: ['Одежда', 'Обувь', 'Ювелирные магазины', 'Свадебные салоны', 'Секонд-хенды'],
  office: ['Юридические услуги', 'Бухгалтерские услуги', 'Агентства недвижимости', 'Страхование', 'Туристические агентства', 'Ритуальные услуги', 'Клининг'],
  allshops: ['Магазины'],
  allcraft: ['Мастерские', 'Изготовление на заказ'],
};
// Типы контактов 2ГИС -> наши типы мессенджеров/соцсетей.
const SOCIAL_2GIS = { telegram: 'telegram', whatsapp: 'whatsapp', viber: 'viber', vkontakte: 'vk', instagram: 'instagram', odnoklassniki: 'ok', facebook: 'facebook', youtube: 'youtube', twitter: 'other' };
// Теги OSM с мессенджерами/соцсетями.
const SOCIAL_OSM = {
  telegram: ['contact:telegram', 'telegram'], whatsapp: ['contact:whatsapp', 'whatsapp'], viber: ['contact:viber', 'viber'],
  vk: ['contact:vk', 'vk'], instagram: ['contact:instagram', 'instagram'], ok: ['contact:ok', 'ok'],
  facebook: ['contact:facebook', 'facebook'], youtube: ['contact:youtube'],
};
// Как подписать кнопку и как собрать ссылку из ника/номера.
const MESSENGERS = {
  telegram: { label: 'Telegram', base: 'https://t.me/' },
  whatsapp: { label: 'WhatsApp', base: 'https://wa.me/' },
  viber: { label: 'Viber', base: 'viber://chat?number=%2B' },
  vk: { label: 'VK', base: 'https://vk.com/' },
  instagram: { label: 'Instagram', base: 'https://instagram.com/' },
  ok: { label: 'Одноклассники', base: 'https://ok.ru/' },
  facebook: { label: 'Facebook', base: 'https://facebook.com/' },
  youtube: { label: 'YouTube', base: 'https://youtube.com/' },
  other: { label: 'Соцсеть', base: 'https://' },
};
const TYPE_BY_DOMAIN = [
  [/t\.me\/|telegram/i, 'telegram'], [/wa\.me\/|whatsapp/i, 'whatsapp'], [/vk\.com|vk\.link|vkontakte/i, 'vk'],
  [/instagram/i, 'instagram'], [/ok\.ru/i, 'ok'], [/facebook/i, 'facebook'], [/youtu/i, 'youtube'], [/viber/i, 'viber'],
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
let lastSource = '';                         // откуда пришли результаты: '2gis' или 'osm'

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
  return `<label class="chip"><input type="checkbox" value="${c.id}" ${on ? 'checked' : ''}><span>${c.label}</span></label>`;
}).join('');
$('#cats').addEventListener('change', () => store.set('leads.cats', selectedCats().map(c => c.id)));

$('#optStatus').insertAdjacentHTML('beforeend', STATUSES.map(s => `<option value="${s.id}">${s.label}</option>`).join(''));

// Источник данных и ключ 2ГИС (ключ хранится только в этом браузере).
const src = store.get('leads.src', { source: '2gis', key: '', pages: 5 });
$('#optSource').value = src.source;
document.querySelector(`input[name=src][value="${src.source}"]`).checked = true;
$('#gisKey').value = src.key;
$('#gisPages').value = src.pages;
function saveSrc() {
  $('#optSource').value = document.querySelector('input[name=src]:checked').value;
  store.set('leads.src', { source: $('#optSource').value, key: $('#gisKey').value.trim(), pages: +$('#gisPages').value || 5 });
  document.body.classList.toggle('src-2gis', $('#optSource').value === '2gis');
}
['#gisKey', '#gisPages'].forEach(id => $(id).addEventListener('change', saveSrc));
document.querySelectorAll('input[name=src]').forEach(r => r.addEventListener('change', saveSrc));
saveSrc();

const OPTS = ['optNoSite', 'optSocialOk', 'optPhone', 'optMsg', 'optNoChains', 'optHideRejected'];
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

const openSettings = () => $('#filters').showModal();
$('#filtersBtn').addEventListener('click', openSettings);
$('#filters').addEventListener('close', saveSrc);
// Клик по затемнённому фону закрывает окно настроек.
$('#filters').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
function showTab(tab) {
  document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
  document.body.classList.toggle('tab-map', tab === 'map');
  if (tab === 'map') map.invalidateSize();
}

function selectedCats() {
  const ids = [...document.querySelectorAll('#cats input:checked')].map(i => i.value);
  return CATEGORIES.filter(c => ids.includes(c.id));
}

function setStatus(text, isError) {
  $('#status').textContent = text;
  $('#status').classList.toggle('error', !!isError);
  if (text) $('#stats').innerHTML = '';
}

function setLoading(on) {
  document.body.classList.toggle('loading', on);
  ['#goBtn', '#searchBtn'].forEach(id => { $(id).disabled = on; });
  if (on) $('#list').innerHTML = '<div class="skel"></div>'.repeat(4);
}

// ---------- Поиск: город → карта → организации ----------

let lastPlace = '';
$('#cityForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#cityInput').blur();
  const q = $('#cityInput').value.trim();
  if (q && q !== lastPlace) {
    setStatus('Ищу «' + q + '»…');
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru&q=' + encodeURIComponent(q));
      const data = await r.json();
      if (!data.length) { setStatus('Место «' + q + '» не найдено', true); return; }
      const [s, n, w, e2] = data[0].boundingbox.map(Number);
      map.fitBounds([[s, w], [n, e2]]);
      lastPlace = q;
    } catch {
      setStatus('Не удалось найти город — проверьте интернет', true);
      return;
    }
  }
  runSearch();
});

$('#geoBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { setStatus('Геолокация недоступна', true); return; }
  setStatus('Определяю местоположение…');
  navigator.geolocation.getCurrentPosition(
    p => { map.setView([p.coords.latitude, p.coords.longitude], 15); lastPlace = ''; runSearch(); },
    () => setStatus('Разрешите доступ к геолокации', true),
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
      setStatus('Сервер занят, пробую другой…');
    }
  }
  throw lastErr;
}

// ---------- Запрос к 2ГИС (Catalog API 3.0) ----------

async function search2gis(queries, b, key, maxPages) {
  const c = b.getCenter();
  // 2ГИС ищет по кругу; берём круг, описанный вокруг видимой области (не больше 40 км).
  const radius = Math.min(40000, Math.ceil(map.distance(c, b.getNorthEast())));
  const fields = 'items.point,items.contact_groups,items.rubrics,items.org,items.schedule';
  let pageSize = 50;
  const out = [];
  for (const [qi, q] of queries.entries()) {
    for (let page = 1; page <= maxPages; page++) {
      setStatus(`${q} · ${qi + 1}/${queries.length} · найдено ${out.length}`);
      const params = new URLSearchParams({
        q, point: `${c.lng},${c.lat}`, radius, type: 'branch', fields, page, page_size: pageSize, locale: 'ru_RU', key,
      });
      const r = await fetch('https://catalog.api.2gis.com/3.0/items?' + params);
      const data = await r.json();
      const code = data.meta?.code;
      if (code === 404) break; // по запросу ничего нет
      if (code !== 200) {
        const msg = data.meta?.error?.message || 'код ' + code;
        if (code === 400 && pageSize > 10 && /page_size/i.test(msg)) { pageSize = 10; page--; continue; } // демо-ключ: до 10 на страницу
        if (code === 400 && page > 1) break; // упёрлись в лимит страниц ключа
        if (code === 403 || code === 401) throw new Error('ключ 2ГИС не принят (' + msg + ')');
        throw new Error(msg);
      }
      const items = data.result?.items || [];
      out.push(...items);
      if (items.length < pageSize || page * pageSize >= (data.result?.total || 0)) break;
    }
  }
  return out;
}

$('#searchBtn').addEventListener('click', runSearch);

async function runSearch() {
  const cats = selectedCats();
  if (!cats.length) { setStatus('Выберите хотя бы одну сферу', true); return; }
  const b = map.getBounds();
  const use2gis = $('#optSource').value === '2gis';
  const key = $('#gisKey').value.trim();
  if (use2gis && !key) { setStatus('Нужен ключ 2ГИС — вставьте его в настройках', true); openSettings(); return; }
  const queries = [...new Set(cats.flatMap(c => QUERIES_2GIS[c.id] || []))];
  const pages = Math.max(1, Math.min(20, +$('#gisPages').value || 5));
  const area = (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest());
  if (!use2gis && area > 1.5 && !confirm('Область очень большая — поиск может занять минуту. Продолжить?')) return;
  if (use2gis && queries.length * pages > 60 &&
      !confirm(`До ${queries.length * pages} запросов к 2ГИС — это расходует лимит ключа. Продолжить?`)) return;

  setLoading(true);
  setStatus('Загружаю…');
  try {
    const raw = use2gis
      ? (await search2gis(queries, b, key, pages)).map(normalize2gis).filter(x => x && b.contains([x.lat, x.lng]))
      : (await overpass(buildQuery(cats, b))).elements.map(normalize);
    const seen = new Set();
    lastResults = raw.filter(x => x && !seen.has(x.id) && seen.add(x.id));
    lastSource = use2gis ? '2gis' : 'osm';
    $('#csvBtn').disabled = !lastResults.length;
    setStatus('');
    render();
    showTab('list');
    $('#list').scrollTop = 0;
  } catch (err) {
    $('#list').innerHTML = '';
    setStatus('Ошибка: ' + err.message, true);
  } finally {
    setLoading(false);
  }
}

// ---------- Обработка результатов ----------

// «Сайт», который на деле страница в соцсети или в справочнике.
const SOCIAL_SITE_RE = /(vk\.com|vk\.link|vkontakte|instagram\.com|facebook\.com|t\.me|ok\.ru|wa\.me|taplink|2gis|yandex\.ru\/(maps|profile)|google\.[a-z.]+\/maps)/i;

function normalize(el) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || !t.name) return null;
  const typeKey = ['shop', 'amenity', 'craft', 'office', 'healthcare', 'leisure', 'tourism'].find(k => t[k]);
  const typeVal = typeKey ? t[typeKey] : '';
  const site = t.website || t['contact:website'] || t.url || '';
  const isSocialSite = !!site && SOCIAL_SITE_RE.test(site);
  const social = Object.entries(SOCIAL_OSM).map(([type, keys]) => socialLink(type, keys.map(k => t[k]).find(Boolean)));
  if (isSocialSite) social.push(socialLink('other', site));
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
    site, social: uniqSocial(social), isSocialSite,
    chain: !!(t.brand || t['brand:wikidata'] || t['operator:wikidata']),
  };
}

function normalize2gis(it) {
  if (!it.point || !it.name) return null;
  const contacts = (it.contact_groups || []).flatMap(g => g.contacts || []);
  const first = type => contacts.find(c => c.type === type);
  const siteC = first('website');
  const site = siteC ? (siteC.text || siteC.value || '') : '';
  const phoneC = first('phone');
  const emailC = first('email');
  const sch = it.schedule;
  let hours = '';
  if (sch?.is_24x7) hours = 'круглосуточно';
  else if (sch) {
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].find(d => sch[d]?.working_hours?.length);
    if (day) hours = sch[day].working_hours.map(h => h.from + '–' + h.to).join(', ') + (sch.Sat || sch.Sun ? '' : ', сб-вс выходной');
  }
  const firmId = String(it.id).split('_')[0];
  return {
    id: '2gis/' + firmId,
    gisUrl: 'https://2gis.ru/firm/' + firmId,
    name: it.name,
    category: it.rubrics?.find(r => r.kind === 'primary')?.name || it.rubrics?.[0]?.name || '',
    lat: it.point.lat, lng: it.point.lon,
    address: it.address_name || '',
    phone: phoneC ? (phoneC.text || phoneC.value || '') : '',
    email: emailC ? (emailC.value || emailC.text || '') : '',
    hours,
    site,
    social: uniqSocial([
      ...contacts.filter(c => SOCIAL_2GIS[c.type]).map(c => socialLink(SOCIAL_2GIS[c.type], c.url || c.value || c.text)),
      SOCIAL_SITE_RE.test(site) ? socialLink('other', site) : null,
    ]),
    isSocialSite: !!site && SOCIAL_SITE_RE.test(site),
    chain: (it.org?.branch_count || 1) >= 3,
    noContactData: !it.contact_groups, // 2ГИС не прислал блок контактов (ограничение ключа)
  };
}

// Собирает ссылку на мессенджер/соцсеть из того, что лежит в базе: URL, @ника или номера.
function socialLink(type, raw) {
  let v = String(raw || '').split(';')[0].trim();
  if (!v) return null;
  if (/^(https?:|viber:|tg:)/i.test(v)) { /* уже ссылка */ }
  else if (/^[\w-]+(\.[\w-]+)+\//.test(v)) v = 'https://' + v;
  else if (type === 'whatsapp' || type === 'viber') { const n = waNumber(v); if (n.length < 10) return null; v = MESSENGERS[type].base + n; }
  else v = MESSENGERS[type].base + v.replace(/^@/, '');
  if (type === 'other') type = TYPE_BY_DOMAIN.find(([re]) => re.test(v))?.[1] || 'other';
  return { type, url: v };
}

function uniqSocial(list) {
  const seen = new Set();
  return list.filter(s => s && !seen.has(s.url) && seen.add(s.url));
}

// Российский мобильный (+7 9xx…) — на него обычно есть WhatsApp/Telegram.
const isMobile = phone => /^79\d{9}$/.test(waNumber(phone || ''));

// Куда можно написать: найденные в базе мессенджеры + догадки по мобильному номеру.
function messengers(x) {
  const list = [...x.social];
  if (isMobile(x.phone)) {
    const n = waNumber(x.phone);
    if (!list.some(s => s.type === 'whatsapp')) list.push({ type: 'whatsapp', url: 'https://wa.me/' + n, guess: true });
    if (!list.some(s => s.type === 'telegram')) list.push({ type: 'telegram', url: 'https://t.me/+' + n, guess: true });
  }
  const order = Object.keys(MESSENGERS);
  return list.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || !!a.guess - !!b.guess);
}

function hasRealSite(x, socialOk) {
  if (!x.site) return false;
  return !(socialOk && x.isSocialSite);
}

function filtered() {
  const noSite = $('#optNoSite').checked, socialOk = $('#optSocialOk').checked;
  const phone = $('#optPhone').checked, canWrite = $('#optMsg').checked, noChains = $('#optNoChains').checked;
  const hideRej = $('#optHideRejected').checked, st = $('#optStatus').value;
  return lastResults.filter(x => {
    if (noSite && hasRealSite(x, socialOk)) return false;
    if (phone && !x.phone) return false;
    if (canWrite && !x.social.length && !isMobile(x.phone) && !x.email) return false;
    if (noChains && x.chain) return false;
    const s = crm[x.id]?.status || 'new';
    if (hideRej && s === 'rejected' && st !== 'rejected') return false;
    if (st && s !== st) return false;
    return true;
  }).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, 'ru'));
}

// Чем больше контактов — тем «теплее» лид (до него проще достучаться).
function score(x) { return (x.social.length ? 4 : 0) + (x.phone ? 3 : 0) + (isMobile(x.phone) ? 1 : 0) + (x.email ? 1 : 0) + (x.hours ? 1 : 0); }

// ---------- Отрисовка ----------

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const digits = p => p.replace(/[^\d+]/g, '');
const waNumber = p => { let d = p.replace(/\D/g, ''); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); return d; };

function fillTpl(x) {
  return $('#tplText').value
    .replaceAll('{name}', x.name).replaceAll('{category}', x.category.toLowerCase()).replaceAll('{address}', x.address);
}

// Иконки мессенджеров (упрощённые силуэты).
const ICONS = {
  telegram: '<svg viewBox="0 0 24 24"><path d="M21.5 4.3 2.9 11.5c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.5zM9 14.2l9.4-6c.4-.3.8-.1.5.2l-7.6 7-.3 3.3L9 14.2z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.7-.1 1.4z"/></svg>',
  vk: '<svg viewBox="0 0 24 24"><path d="M13 18c-6.6 0-10.4-4.5-10.5-12h3.3c.1 5.5 2.5 7.8 4.4 8.3V6h3.1v4.7c1.9-.2 3.9-2.4 4.5-4.7h3.1a9.2 9.2 0 0 1-4.2 6 9.5 9.5 0 0 1 4.9 6h-3.4c-.7-2.3-2.5-4-4.9-4.3V18H13z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm4.9-8.9a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM12 2c-2.7 0-3.1 0-4.1.1-3.7.2-5.6 2-5.8 5.8C2 8.9 2 9.3 2 12s0 3.1.1 4.1c.2 3.7 2 5.6 5.8 5.8 1 .1 1.4.1 4.1.1s3.1 0 4.1-.1c3.7-.2 5.6-2 5.8-5.8.1-1 .1-1.4.1-4.1s0-3.1-.1-4.1c-.2-3.7-2-5.6-5.8-5.8C15.1 2 14.7 2 12 2zm0 1.8c2.7 0 3 0 4 .1 2.7.1 4 1.4 4.1 4.1.1 1 .1 1.4.1 4s0 3-.1 4c-.1 2.7-1.4 4-4.1 4.1-1 .1-1.4.1-4 .1s-3 0-4-.1c-2.7-.1-4-1.4-4.1-4.1-.1-1-.1-1.4-.1-4s0-3 .1-4C3.9 5.3 5.3 4 8 3.9c1-.1 1.3-.1 4-.1z"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>',
  email: '<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2zm8 7.2L20 6H4l8 5.2zM4 8v10h16V8l-8 5.2L4 8z"/></svg>',
};

// Кнопки «куда писать»: мессенджеры, соцсети, email, телефон.
function contactsHtml(x) {
  const parts = [];
  for (const m of messengers(x)) {
    let href = m.url;
    if (m.type === 'whatsapp' && href.startsWith('https://wa.me/') && !href.includes('?')) href += '?text=' + encodeURIComponent(fillTpl(x));
    const title = m.guess ? 'Нет в базе — пробуем по мобильному номеру' : m.url;
    parts.push(`<a class="mb m-${m.type}${m.guess ? ' guess' : ''}" data-act="msg" href="${esc(href)}" title="${esc(title)}" target="_blank" rel="noopener">${ICONS[m.type] || ''}${MESSENGERS[m.type].label}${m.guess ? '<sup>?</sup>' : ''}</a>`);
  }
  if (x.email) parts.push(`<a class="mb m-email" data-act="msg" href="mailto:${esc(x.email)}?subject=${encodeURIComponent('Сайт для ' + x.name)}&body=${encodeURIComponent(fillTpl(x))}" title="${esc(x.email)}">${ICONS.email}Email</a>`);
  if (x.phone) parts.push(`<a class="mb m-phone" href="tel:${esc(digits(x.phone))}">${ICONS.phone}${esc(x.phone)}</a>`);
  if (!parts.length) return `<div class="c-none">Контактов нет в базе · <a href="${esc(x.gisUrl || 'https://2gis.ru/search/' + encodeURIComponent(x.name))}" target="_blank" rel="noopener">искать в 2ГИС ↗</a></div>`;
  return `<div class="c-contacts">${parts.join('')}</div>`;
}

function linksHtml(x) {
  const q = encodeURIComponent(x.name + (x.address ? ' ' + x.address : ''));
  const parts = [];
  if (x.site && !x.isSocialSite) parts.push(`<a class="site" href="${esc(/^https?:/.test(x.site) ? x.site : 'https://' + x.site)}" target="_blank" rel="noopener">Сайт ↗</a>`);
  parts.push(`<a href="https://yandex.ru/maps/?text=${q}&ll=${x.lng},${x.lat}&z=17" target="_blank" rel="noopener">Яндекс</a>`);
  parts.push(`<a href="${x.gisUrl || 'https://2gis.ru/search/' + q}" target="_blank" rel="noopener">2ГИС</a>`);
  parts.push(`<button type="button" data-act="show">На карте</button>`);
  parts.push(`<button type="button" data-act="copy">Копировать</button>`);
  parts.push(`<button type="button" data-act="note">Заметка</button>`);
  return parts.join('');
}

function siteTag(x) {
  if (!x.site) return '<span class="tag nosite">Нет сайта</span>';
  if (x.isSocialSite) return '<span class="tag social">Только соцсеть</span>';
  return '<span class="tag site">Есть сайт</span>';
}

function render() {
  const items = filtered();
  const socialOk = $('#optSocialOk').checked;
  $('#countBadge').textContent = lastResults.length ? items.length : '';
  if (lastResults.length && !$('#status').textContent) {
    const noSite = lastResults.filter(x => !hasRealSite(x, socialOk)).length;
    const writable = lastResults.filter(x => !hasRealSite(x, socialOk) && (x.social.length || isMobile(x.phone) || x.email)).length;
    $('#stats').innerHTML = `<b>${items.length}</b> из ${lastResults.length}<span class="dot">·</span><b>${writable}</b> можно написать`;
    $('#stats').title = `Показано ${items.length}, без сайта ${noSite}, можно написать ${writable}`;
  }

  cluster.clearLayers();
  for (const x of items) {
    const m = L.marker([x.lat, x.lng]);
    const ms = messengers(x).filter(m => !m.guess).map(m => MESSENGERS[m.type].label).join(', ');
    m.bindPopup(() => `<b>${esc(x.name)}</b><br>${esc(x.category)}${x.phone ? '<br>' + esc(x.phone) : ''}${ms ? '<br>' + ms : ''}<br><a data-goto="${x.id}">Открыть карточку →</a>`);
    cluster.addLayer(m);
  }

  const list = $('#list');
  if (!lastResults.length) {
    list.innerHTML = '<div class="empty"><div class="empty-ico">🔍</div><h2>Здесь ничего не нашлось</h2><p>Выберите другие сферы или сдвиньте карту</p></div>';
    return;
  }
  const banner = noContactsBanner();
  if (!items.length) {
    list.innerHTML = banner + `<div class="empty"><div class="empty-ico">🙈</div><h2>Найдено ${lastResults.length}, но всех скрыли фильтры</h2>
      <p>${hiddenReasons()}</p><button type="button" class="btn primary" data-act="reset" style="margin-top:14px">Показать всех</button></div>`;
    return;
  }
  list.innerHTML = banner + items.map(x => {
    const c = crm[x.id] || {};
    const st = c.status || 'new';
    return `<article class="card st-${st}${c.note ? ' has-note' : ''}" id="c-${x.id.replace('/', '-')}" data-id="${x.id}">
      <div class="c-top">
        <div class="c-title"><h3>${esc(x.name)}</h3><div class="c-sub">${esc(x.category)}${x.address ? ' · ' + esc(x.address) : ''}</div></div>
        <select class="st-pill st-${st}" data-act="status" aria-label="Статус">${STATUSES.map(s => `<option value="${s.id}" ${s.id === st ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
      </div>
      <div class="c-tags">${siteTag(x)}${x.hours ? `<span class="tag">${esc(x.hours)}</span>` : ''}</div>
      ${contactsHtml(x)}
      <div class="c-foot">${linksHtml(x)}</div>
      <textarea class="c-note" data-act="note" placeholder="С кем говорил, когда перезвонить…">${esc(c.note || '')}</textarea>
    </article>`;
  }).join('');
}

// 2ГИС вернул фирмы без контактов вообще — значит, ключ не даёт к ним доступа.
function noContactsBanner() {
  if (lastSource !== '2gis' || !lastResults.length || !lastResults.every(x => x.noContactData)) return '';
  return `<div class="banner"><b>2ГИС не прислал контакты.</b> Похоже, у вашего ключа нет доступа к телефонам и сайтам
    (так бывает на демо-ключе). Поэтому нельзя понять, у кого нет сайта и куда писать.
    Проверяйте фирмы кнопкой «2ГИС» в карточке, переключитесь на OpenStreetMap в настройках
    или включите доступ к контактам в кабинете platform.2gis.ru.</div>`;
}

// Почему всё скрыто: считаем, сколько отсекает каждый включённый фильтр.
function hiddenReasons() {
  const socialOk = $('#optSocialOk').checked;
  const r = [];
  if ($('#optNoSite').checked) r.push(`с сайтом: ${lastResults.filter(x => hasRealSite(x, socialOk)).length}`);
  if ($('#optMsg').checked) r.push(`некуда написать: ${lastResults.filter(x => !x.social.length && !isMobile(x.phone) && !x.email).length}`);
  if ($('#optPhone').checked) r.push(`без телефона: ${lastResults.filter(x => !x.phone).length}`);
  if ($('#optNoChains').checked) r.push(`сетевые: ${lastResults.filter(x => x.chain).length}`);
  if ($('#optStatus').value) r.push('фильтр по статусу');
  return r.length ? 'Отсеяно — ' + r.join(', ') : 'Ослабьте фильтры';
}

function saveCrm(id, patch) {
  crm[id] = { ...crm[id], ...patch };
  store.set('leads.crm', crm);
}

$('#list').addEventListener('change', e => {
  const card = e.target.closest('.card');
  if (card && e.target.dataset.act === 'status') {
    saveCrm(card.dataset.id, { status: e.target.value });
    card.className = card.className.replace(/st-\w+/, 'st-' + e.target.value);
    e.target.className = 'st-pill st-' + e.target.value;
  }
});
$('#list').addEventListener('input', e => {
  const card = e.target.closest('.card');
  if (card && e.target.dataset.act === 'note') saveCrm(card.dataset.id, { note: e.target.value });
});
$('#list').addEventListener('click', async e => {
  if (e.target.dataset.act === 'reset') {
    ['optNoSite', 'optMsg', 'optPhone'].forEach(id => { $('#' + id).checked = false; });
    $('#optStatus').value = '';
    store.set('leads.opts', Object.fromEntries(OPTS.map(o => [o, $('#' + o).checked])));
    render();
    return;
  }
  const card = e.target.closest('.card');
  if (!card) return;
  const x = lastResults.find(r => r.id === card.dataset.id);
  const msg = e.target.closest('[data-act="msg"]');
  if (msg) {
    // В Telegram/VK/Instagram нельзя передать текст в ссылке — кладём его в буфер, чтобы просто вставить в чат.
    if (await copyText(fillTpl(x))) toast('Текст скопирован — вставьте его в чат');
    return;
  }
  const act = e.target.closest('button')?.dataset.act;
  if (act === 'note') {
    card.classList.toggle('note-open');
    if (card.classList.contains('note-open')) card.querySelector('.c-note').focus();
  } else if (act === 'show') {
    showTab('map');
    map.setView([x.lat, x.lng], 18);
  } else if (act === 'copy') {
    if (await copyText(fillTpl(x))) toast('Текст скопирован');
    else prompt('Скопируйте текст:', fillTpl(x));
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

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* старый браузер или нет доступа */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* ignore */ }
  ta.remove();
  return ok;
}

function toast(text) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.append(el); }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2500);
}

// ---------- Экспорт CSV (открывается в Excel / Google Таблицах) ----------

$('#csvBtn').addEventListener('click', () => {
  const rows = [['Название', 'Категория', 'Адрес', 'Телефон', 'Email', 'Telegram', 'WhatsApp', 'VK', 'Instagram', 'Viber', 'Другие соцсети', 'Сайт', 'Часы работы', 'Статус', 'Заметка', 'Широта', 'Долгота', 'Яндекс Карты']];
  for (const x of filtered()) {
    const c = crm[x.id] || {};
    const ms = messengers(x);
    const col = type => ms.filter(m => m.type === type).map(m => m.url + (m.guess ? ' (по номеру)' : '')).join(' ');
    const other = ms.filter(m => !['telegram', 'whatsapp', 'vk', 'instagram', 'viber'].includes(m.type)).map(m => m.url).join(' ');
    rows.push([x.name, x.category, x.address, x.phone, x.email, col('telegram'), col('whatsapp'), col('vk'), col('instagram'), col('viber'), other, x.site, x.hours,
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
