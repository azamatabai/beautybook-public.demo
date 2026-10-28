"use strict";

/* =====================================================================
   НАСТРОЙКИ САЛОНА
   ===================================================================== */

// ПУБЛИЧНАЯ ДЕМОВЕРСИЯ: заявка только показывается в окне на сайте.
// Отправка в WhatsApp и любые сетевые запросы из этой версии удалены.
const DEMO_MODE = true;

const SLOT_STEP_MIN = 30; // шаг сетки времени, минут
const BOOKING_DAYS_AHEAD = 60; // на сколько дней вперёд можно выбрать дату
const MIN_LEAD_MIN = 60; // на сегодня — не раньше чем через час

/* =====================================================================
   ДАННЫЕ (демонстрационные)
   ===================================================================== */

const CATEGORIES = {
  nails: "Ногти",
  hair: "Волосы",
  brows: "Брови и ресницы",
  makeup: "Макияж",
};

const SERVICES = [
  { id: "manicure-classic", category: "nails", name: "Классический маникюр", desc: "Обработка кутикулы, форма и уход за ногтями без покрытия.", duration: 60, price: 6000 },
  { id: "manicure-gel", category: "nails", name: "Маникюр с покрытием гель-лаком", desc: "Аппаратный маникюр, выравнивание и стойкое покрытие в один тон.", duration: 90, price: 9000 },
  { id: "pedicure-gel", category: "nails", name: "Педикюр с покрытием", desc: "Аккуратная обработка стоп и ногтей, покрытие гель-лаком.", duration: 120, price: 12000 },
  { id: "haircut-women", category: "hair", name: "Женская стрижка", desc: "Консультация, мытьё головы, стрижка и лёгкая укладка.", duration: 60, price: 8000 },
  { id: "hair-color", category: "hair", name: "Окрашивание в один тон", desc: "Подбор оттенка и окрашивание. Цена зависит от длины волос.", duration: 150, price: 20000, priceFrom: true },
  { id: "styling", category: "hair", name: "Укладка", desc: "Укладка на брашинг, локоны или гладкие волосы.", duration: 60, price: 6000 },
  { id: "brows", category: "brows", name: "Оформление бровей", desc: "Коррекция формы и окрашивание бровей.", duration: 30, price: 5000 },
  { id: "lash-lamination", category: "brows", name: "Ламинирование ресниц", desc: "Изгиб, питание и окрашивание натуральных ресниц.", duration: 60, price: 10000 },
  { id: "makeup-day", category: "makeup", name: "Дневной макияж", desc: "Лёгкий естественный макияж на каждый день или для фотосессии.", duration: 60, price: 12000 },
  { id: "makeup-evening", category: "makeup", name: "Вечерний макияж", desc: "Выразительный образ для мероприятия.", duration: 90, price: 16000 },
];

// Вымышленные демо-профили и графики — не реальные люди.
// days: 0 — воскресенье, 1 — понедельник … 6 — суббота.
const MASTERS = [
  {
    id: "aliya", name: "Алия", role: "Мастер ногтевого сервиса", about: "Маникюр, педикюр и стойкие покрытия.",
    categories: ["nails"], colors: ["#d9cbb8", "#a48b68"],
    schedule: { days: [1, 2, 3, 4, 5, 6], start: "10:00", end: "19:00", breaks: [["14:00", "14:30"]] },
  },
  {
    id: "dana", name: "Дана", role: "Стилист-парикмахер", about: "Стрижки, окрашивание и укладки.",
    categories: ["hair"], colors: ["#cdb9a6", "#86656a"],
    schedule: { days: [0, 2, 3, 4, 5, 6], start: "11:00", end: "21:00", breaks: [["15:00", "15:30"]] },
  },
  {
    id: "madina", name: "Мадина", role: "Бровист и лэшмейкер", about: "Брови и ресницы с естественным результатом.",
    categories: ["brows"], colors: ["#e1d5c4", "#b39a72"],
    schedule: { days: [1, 3, 5, 6], start: "10:00", end: "18:00", breaks: [["13:30", "14:00"]] },
  },
  {
    id: "kamila", name: "Камила", role: "Визажист-стилист", about: "Макияж и укладки для особых случаев.",
    categories: ["makeup", "hair"], colors: ["#d6c4b4", "#754c52"],
    schedule: { days: [0, 4, 5, 6], start: "12:00", end: "21:00", breaks: [] },
  },
];

const ANY_MASTER = "any";
const STEPS = ["Услуга", "Мастер", "Дата и время", "Контакты", "Итог"];

/* =====================================================================
   УТИЛИТЫ
   ===================================================================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const WEEKDAYS_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const WEEKDAYS_IN = ["в воскресенье", "в понедельник", "во вторник", "в среду", "в четверг", "в пятницу", "в субботу"];
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const formatPrice = (value) => value.toLocaleString("ru-RU").replace(/ /g, " ") + " ₸";
const priceLabel = (s) => `${s.priceFrom ? "от " : ""}${formatPrice(s.price)}`;

function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const fromMinutes = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

// Дата в формате YYYY-MM-DD по локальному времени (toISOString дал бы UTC)
function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? date : null;
}

const todayISO = () => toISODate(new Date());

function maxISO() {
  const d = new Date();
  d.setDate(d.getDate() + BOOKING_DAYS_AHEAD);
  return toISODate(d);
}

function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function formatDateRu(value, withWeekday = true) {
  const date = parseISODate(value);
  if (!date) return value;
  const opts = withWeekday ? { day: "numeric", month: "long", weekday: "long" } : { day: "numeric", month: "long" };
  const text = date.toLocaleDateString("ru-RU", opts);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// [1,2,3,4,5,6] → «Пн–Сб», [1,3,5,6] → «Пн, Ср, Пт, Сб»
function formatWorkDays(days) {
  const order = [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d));
  const groups = [];
  order.forEach((d) => {
    const pos = (d + 6) % 7;
    const last = groups[groups.length - 1];
    if (last && last.end === pos - 1) last.end = pos;
    else groups.push({ start: pos, end: pos });
  });
  const name = (pos) => WEEKDAYS_SHORT[(pos + 1) % 7];
  return groups
    .map((g) => {
      if (g.end - g.start >= 2) return `${name(g.start)}–${name(g.end)}`;
      if (g.end > g.start) return `${name(g.start)}, ${name(g.end)}`;
      return name(g.start);
    })
    .join(", ");
}

const scheduleLabel = (m) => `${formatWorkDays(m.schedule.days)}, ${m.schedule.start}–${m.schedule.end}`;

const getService = (id) => SERVICES.find((s) => s.id === id);
const getMaster = (id) => MASTERS.find((m) => m.id === id);

const mastersForService = (service) =>
  service ? MASTERS.filter((m) => m.categories.includes(service.category)) : MASTERS;

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* =====================================================================
   ВЫМЫШЛЕННОЕ РАСПИСАНИЕ
   Занятость генерируется детерминированно из id мастера и даты,
   чтобы при каждом открытии сайта картина была одинаковой.
   Это не данные реальной системы бронирования.
   ===================================================================== */

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const worksOn = (master, date) => master.schedule.days.includes(date.getDay());

const busyCache = new Map();

// Занятые интервалы мастера на дату: [[начало, конец], …] в минутах
function getBusy(master, iso) {
  const key = master.id + iso;
  if (busyCache.has(key)) return busyCache.get(key);

  const start = toMinutes(master.schedule.start);
  const end = toMinutes(master.schedule.end);
  const rnd = seededRandom(hashString(key));
  const busy = master.schedule.breaks.map(([s, e]) => [toMinutes(s), toMinutes(e)]);

  for (let t = start; t < end; ) {
    if (rnd() < 0.2) {
      const len = (1 + Math.floor(rnd() * 3)) * SLOT_STEP_MIN;
      busy.push([t, Math.min(t + len, end)]);
      t += len;
    } else {
      t += SLOT_STEP_MIN;
    }
  }

  busyCache.set(key, busy);
  return busy;
}

// Состояние начала услуги в момент t у одного мастера
function slotStateFor(master, iso, t, duration) {
  const start = toMinutes(master.schedule.start);
  const end = toMinutes(master.schedule.end);
  if (t < start || t + SLOT_STEP_MIN > end) return "off";

  const busy = getBusy(master, iso);
  const overlaps = (a, b) => busy.some(([s, e]) => a < e && b > s);
  if (overlaps(t, t + SLOT_STEP_MIN)) return "busy";
  if (t + duration > end || overlaps(t, t + duration)) return "short";
  return "free";
}

/* =====================================================================
   СОСТОЯНИЕ
   ===================================================================== */

const state = {
  serviceId: "",
  masterId: "",
  date: "",
  time: "",
  assignedMasterId: "", // для варианта «Любой мастер»
};

let currentStep = 1;
let serviceFilter = "all";
const notices = { master: "", time: "" };
const calView = { y: new Date().getFullYear(), m: new Date().getMonth() };

function candidateMasters() {
  const service = getService(state.serviceId);
  if (!service) return [];
  if (state.masterId === ANY_MASTER) return mastersForService(service);
  const master = getMaster(state.masterId);
  return master && master.categories.includes(service.category) ? [master] : [];
}

// Все слоты дня для выбранных услуги и мастера
function getDaySlots(iso) {
  const service = getService(state.serviceId);
  const date = parseISODate(iso);
  const working = candidateMasters().filter((m) => worksOn(m, date));
  if (!service || !working.length) return { status: "off", slots: [], free: 0 };

  const from = Math.min(...working.map((m) => toMinutes(m.schedule.start)));
  const to = Math.max(...working.map((m) => toMinutes(m.schedule.end)));
  const isToday = iso === todayISO();
  const now = new Date();
  const earliest = now.getHours() * 60 + now.getMinutes() + MIN_LEAD_MIN;

  const slots = [];
  for (let t = from; t + SLOT_STEP_MIN <= to; t += SLOT_STEP_MIN) {
    if (isToday && t < earliest) continue;
    const states = working
      .map((m) => ({ m, s: slotStateFor(m, iso, t, service.duration) }))
      .filter((x) => x.s !== "off");
    if (!states.length) continue;

    const freeFor = states.find((x) => x.s === "free");
    const slotState = freeFor ? "free" : states.some((x) => x.s === "short") ? "short" : "busy";
    slots.push({ time: fromMinutes(t), minutes: t, state: slotState, master: freeFor ? freeFor.m : null });
  }

  const free = slots.filter((s) => s.state === "free").length;
  let status = "open";
  if (!slots.length) status = isToday ? "over" : "full";
  else if (!free) status = "full";
  return { status, slots, free };
}

function findSlot(iso, time) {
  return getDaySlots(iso).slots.find((s) => s.time === time);
}

function findNextOpenDate(fromISO) {
  const last = maxISO();
  let iso = fromISO < todayISO() ? todayISO() : fromISO;
  while (iso <= last) {
    if (getDaySlots(iso).status === "open") return iso;
    iso = addDays(iso, 1);
  }
  return "";
}

/* =====================================================================
   ЭЛЕМЕНТЫ
   ===================================================================== */

const form = $("#bookingForm");
const fields = {
  name: $("#name"),
  phone: $("#phone"),
  comment: $("#comment"),
};
const statusBox = $("#formStatus");
const stepErrorEl = $("#stepError");
const backBtn = $("#backBtn");
const nextBtn = $("#nextBtn");

const FINAL_LABEL = "Записаться";

/* =====================================================================
   КАТАЛОГ: УСЛУГИ И МАСТЕРА
   ===================================================================== */

function renderServices() {
  $("#servicesList").innerHTML = SERVICES.map(
    (s) => `
      <li class="service reveal" data-category="${s.category}" data-service="${s.id}">
        <span class="service__cat">${CATEGORIES[s.category]}</span>
        <h3>${escapeHTML(s.name)}</h3>
        <p class="service__desc">${escapeHTML(s.desc)}</p>
        <div class="service__meta">
          <span class="service__price">${priceLabel(s)}</span>
          <span class="service__time">${formatDuration(s.duration)}</span>
        </div>
        <button type="button" class="link-btn" data-pick-service="${s.id}">Выбрать услугу <span aria-hidden="true">→</span></button>
      </li>`
  ).join("");
}

function renderMasters() {
  $("#mastersList").innerHTML = MASTERS.map(
    (m) => `
      <article class="master reveal" data-master="${m.id}">
        <div class="master__photo" style="--c1:${m.colors[0]};--c2:${m.colors[1]}" aria-hidden="true">
          <span class="master__demo">Демо-профиль</span>
          <span class="master__initial">${m.name.charAt(0)}</span>
        </div>
        <div class="master__body">
          <h3>${escapeHTML(m.name)}</h3>
          <p class="master__role">${escapeHTML(m.role)}</p>
          <p class="master__about">${escapeHTML(m.about)}</p>
          <p class="master__schedule">График (демо): <b>${scheduleLabel(m)}</b></p>
          <ul class="tags">${m.categories.map((c) => `<li>${CATEGORIES[c]}</li>`).join("")}</ul>
          <button type="button" class="link-btn" data-pick-master="${m.id}">Записаться к мастеру <span aria-hidden="true">→</span></button>
        </div>
      </article>`
  ).join("");
}

// Подсветка выбранной услуги и мастера в каталоге
function updateCatalogHighlight() {
  $$(".service[data-service]").forEach((card) => {
    const selected = card.dataset.service === state.serviceId;
    card.classList.toggle("is-selected", selected);
    setBadge(card, selected);
    const btn = $("[data-pick-service]", card);
    btn.innerHTML = selected ? "Услуга выбрана ✓" : 'Выбрать услугу <span aria-hidden="true">→</span>';
  });
  $$(".master[data-master]").forEach((card) => {
    const selected = card.dataset.master === state.masterId;
    card.classList.toggle("is-selected", selected);
    setBadge(card, selected);
  });
}

function setBadge(card, show) {
  const badge = $(".selected-badge", card);
  if (show && !badge) card.insertAdjacentHTML("afterbegin", '<span class="selected-badge">Выбрано</span>');
  if (!show && badge) badge.remove();
}

$("#filters").addEventListener("click", (event) => {
  const btn = event.target.closest(".filter");
  if (!btn) return;
  const filter = btn.dataset.filter;

  $$(".filter").forEach((b) => {
    const active = b === btn;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", String(active));
  });

  $$(".service").forEach((card) => {
    const show = filter === "all" || card.dataset.category === filter;
    card.classList.toggle("is-hidden", !show);
    if (show) card.classList.add("is-visible");
  });
});

/* =====================================================================
   ШАГ 1. УСЛУГА
   ===================================================================== */

function renderServiceStep() {
  const chips = [["all", "Все"], ...Object.entries(CATEGORIES)];
  $("#serviceChips").innerHTML = chips
    .map(([key, label]) => `<button type="button" class="chip" data-chip="${key}" aria-pressed="${key === serviceFilter}">${label}</button>`)
    .join("");

  const list = SERVICES.filter((s) => serviceFilter === "all" || s.category === serviceFilter);
  $("#serviceChoices").innerHTML = list
    .map((s) => {
      const selected = s.id === state.serviceId;
      return `
        <label class="choice${selected ? " is-selected" : ""}">
          <input type="radio" name="service" value="${s.id}"${selected ? " checked" : ""}>
          <span class="choice__body">
            <span class="choice__title">${escapeHTML(s.name)}</span>
            <span class="choice__meta">${CATEGORIES[s.category]} · ${formatDuration(s.duration)}</span>
          </span>
          <span class="choice__price">${priceLabel(s)}</span>
          <span class="choice__check" aria-hidden="true"></span>
        </label>`;
    })
    .join("");
}

$("#serviceChips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-chip]");
  if (!chip) return;
  serviceFilter = chip.dataset.chip;
  renderServiceStep();
});

$("#serviceChoices").addEventListener("change", (e) => {
  if (e.target.name === "service") setService(e.target.value);
});

function setService(id) {
  const service = getService(id);
  if (!service) return;
  state.serviceId = id;

  const master = getMaster(state.masterId);
  if (master && !master.categories.includes(service.category)) {
    notices.master = `${master.name} не выполняет услугу «${service.name}» — выберите другого мастера.`;
    state.masterId = "";
  }
  revalidateTime("услуги");
  refresh();
}

/* =====================================================================
   ШАГ 2. МАСТЕР
   ===================================================================== */

function renderMasterStep() {
  const service = getService(state.serviceId);
  const list = mastersForService(service);
  const notice = $("#masterNotice");
  notice.hidden = !notices.master;
  notice.textContent = notices.master;

  const anySelected = state.masterId === ANY_MASTER;
  const anyCard = `
    <label class="choice${anySelected ? " is-selected" : ""}">
      <input type="radio" name="master" value="${ANY_MASTER}"${anySelected ? " checked" : ""}>
      <span class="choice__avatar choice__avatar--any" aria-hidden="true">✦</span>
      <span class="choice__body">
        <span class="choice__title">Любой мастер</span>
        <span class="choice__meta">Больше свободного времени — подходящий мастер подбирается по графику</span>
      </span>
      <span class="choice__check" aria-hidden="true"></span>
    </label>`;

  $("#masterChoices").innerHTML =
    anyCard +
    list
      .map((m) => {
        const selected = m.id === state.masterId;
        return `
          <label class="choice${selected ? " is-selected" : ""}">
            <input type="radio" name="master" value="${m.id}"${selected ? " checked" : ""}>
            <span class="choice__avatar" style="--c1:${m.colors[0]};--c2:${m.colors[1]}" aria-hidden="true">${m.name.charAt(0)}</span>
            <span class="choice__body">
              <span class="choice__title">${escapeHTML(m.name)} · ${escapeHTML(m.role)}</span>
              <span class="choice__meta">${scheduleLabel(m)}</span>
            </span>
            <span class="choice__check" aria-hidden="true"></span>
          </label>`;
      })
      .join("");
}

$("#masterChoices").addEventListener("change", (e) => {
  if (e.target.name === "master") setMaster(e.target.value);
});

function setMaster(id) {
  state.masterId = id;
  notices.master = "";
  revalidateTime("мастера");
  refresh();
}

// После смены услуги или мастера проверяем, подходит ли выбранное время
function revalidateTime(reason) {
  if (!state.date || !state.time) {
    state.assignedMasterId = "";
    return;
  }
  const slot = state.serviceId && state.masterId ? findSlot(state.date, state.time) : null;
  if (slot && slot.state === "free") {
    state.assignedMasterId = slot.master.id;
    return;
  }
  notices.time = `Время ${state.time} не подходит после смены ${reason} — выберите другое.`;
  state.time = "";
  state.assignedMasterId = "";
}

/* =====================================================================
   ШАГ 3. КАЛЕНДАРЬ И ВРЕМЯ
   ===================================================================== */

function renderCalendar() {
  const { y, m } = calView;
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const minDay = todayISO();
  const maxDay = maxISO();
  const minDate = parseISODate(minDay);
  const maxDate = parseISODate(maxDay);
  const monthIndex = y * 12 + m;
  const prevDisabled = monthIndex <= minDate.getFullYear() * 12 + minDate.getMonth();
  const nextDisabled = monthIndex >= maxDate.getFullYear() * 12 + maxDate.getMonth();

  let cells = "";
  for (let i = 0; i < lead; i++) cells += "<span></span>";

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISODate(new Date(y, m, d));
    const cls = ["cal__day"];
    let disabled = false;
    let note = "";

    if (iso < minDay) {
      disabled = true;
      note = "прошедшая дата";
    } else if (iso > maxDay) {
      disabled = true;
      note = "запись пока не открыта";
    } else {
      const { status, free } = getDaySlots(iso);
      if (status === "off") {
        cls.push("is-off");
        note = "мастер не работает";
      } else if (status === "open") {
        cls.push("is-open");
        note = `свободных окон: ${free}`;
      } else {
        cls.push("is-full");
        note = "нет свободного времени";
      }
    }
    if (iso === minDay) cls.push("is-today");
    if (iso === state.date) cls.push("is-selected");

    const label = `${formatDateRu(iso)} — ${note}`;
    cells += `<button type="button" class="${cls.join(" ")}" data-date="${iso}" aria-label="${label}" title="${label}" aria-pressed="${iso === state.date}"${disabled ? " disabled" : ""}>${d}</button>`;
  }

  const week = [1, 2, 3, 4, 5, 6, 0].map((i) => `<span>${WEEKDAYS_SHORT[i]}</span>`).join("");

  $("#calendar").innerHTML = `
    <div class="cal__head">
      <button type="button" class="cal__nav" data-cal="-1" aria-label="Предыдущий месяц"${prevDisabled ? " disabled" : ""}>‹</button>
      <p class="cal__title" aria-live="polite">${MONTHS[m]} ${y}</p>
      <button type="button" class="cal__nav" data-cal="1" aria-label="Следующий месяц"${nextDisabled ? " disabled" : ""}>›</button>
    </div>
    <div class="cal__week" aria-hidden="true">${week}</div>
    <div class="cal__grid">${cells}</div>
    <ul class="legend">
      <li><i class="lg-open"></i>Есть время</li>
      <li><i class="lg-full"></i>Всё занято</li>
      <li><i class="lg-off"></i>Выходной мастера</li>
    </ul>`;
}

function renderSlots() {
  const box = $("#slots");
  if (!state.date) {
    box.innerHTML = `<p class="slots__empty">Выберите дату в календаре —<br>здесь появится свободное время.</p>`;
    return;
  }

  const service = getService(state.serviceId);
  const master = getMaster(state.masterId);
  const date = parseISODate(state.date);
  const day = getDaySlots(state.date);
  let html = `<p class="slots__date">${formatDateRu(state.date)}</p>
    <p class="slots__meta">${escapeHTML(service.name)} · ${formatDuration(service.duration)}${master ? ` · ${escapeHTML(master.name)}` : " · любой мастер"}</p>`;

  if (notices.time) html += `<p class="slots__message">${escapeHTML(notices.time)}</p>`;

  if (day.status !== "open") {
    let msg;
    if (day.status === "off") {
      msg = master
        ? `${master.name} не работает ${WEEKDAYS_IN[date.getDay()]}. Рабочие дни мастера: ${formatWorkDays(master.schedule.days)}.`
        : `${WEEKDAYS_IN[date.getDay()].replace(/^./, (c) => c.toUpperCase())} мастера по этой услуге не работают.`;
    } else if (day.status === "over") {
      msg = "На сегодня запись уже закрыта.";
    } else {
      msg = `На эту дату нет свободного времени для услуги длительностью ${formatDuration(service.duration)}.`;
    }
    const next = findNextOpenDate(addDays(state.date, 1));
    html += `<div class="slots__message"><p style="margin:0">${escapeHTML(msg)}</p>${
      next ? `<button type="button" class="link-btn" data-jump="${next}">Ближайшая свободная дата: ${formatDateRu(next, false)} →</button>` : ""
    }</div>`;
  }

  if (day.slots.length) {
    const groups = [
      ["Утро", (t) => t < 720],
      ["День", (t) => t >= 720 && t < 1020],
      ["Вечер", (t) => t >= 1020],
    ];
    html += groups
      .map(([title, test]) => {
        const items = day.slots.filter((s) => test(s.minutes));
        if (!items.length) return "";
        return `<div class="slots__group">
          <p class="slots__group-title">${title}</p>
          <div class="slots__grid">${items.map(slotButton).join("")}</div>
        </div>`;
      })
      .join("");

    html += `<ul class="legend">
      <li><i class="lg-free"></i>Свободно</li>
      <li><i class="lg-busy"></i>Занято</li>
      <li><i class="lg-short"></i>Не хватает времени на услугу</li>
      <li><i class="lg-selected"></i>Ваш выбор</li>
    </ul>`;
  }

  if (state.time) {
    const end = fromMinutes(toMinutes(state.time) + service.duration);
    html += `<p class="slots__picked">Вы выбрали: <b>${formatDateRu(state.date, false)}, ${state.time}–${end}</b></p>`;
  }

  box.innerHTML = html;
}

function slotButton(slot) {
  const selected = slot.time === state.time;
  if (slot.state === "free") {
    return `<button type="button" class="slot is-free${selected ? " is-selected" : ""}" data-time="${slot.time}" aria-pressed="${selected}" aria-label="${slot.time}, свободно">
      <span>${slot.time}</span>${selected ? "<small>выбрано</small>" : ""}</button>`;
  }
  const label = slot.state === "busy" ? "занято" : "мало времени";
  const title = slot.state === "busy" ? "Время занято" : "Услуга не успевает закончиться до следующей записи или конца смены";
  return `<button type="button" class="slot is-${slot.state}" disabled aria-label="${slot.time}, ${label}" title="${title}">
    <span>${slot.time}</span><small>${label}</small></button>`;
}

function renderDateTime() {
  renderCalendar();
  renderSlots();
}

function selectDate(iso) {
  state.date = iso;
  notices.time = "";
  if (state.time) {
    const slot = findSlot(iso, state.time);
    if (!slot || slot.state !== "free") state.time = "";
    else state.assignedMasterId = slot.master.id;
  }
  const d = parseISODate(iso);
  calView.y = d.getFullYear();
  calView.m = d.getMonth();
  stepErrorEl.textContent = "";
  renderDateTime();
  renderPicked();

  // На телефоне календарь и слоты идут друг под другом — показываем слоты
  if (window.innerWidth < 640) {
    $("#slots").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function selectTime(time) {
  const slot = findSlot(state.date, time);
  if (!slot || slot.state !== "free") return;
  state.time = time;
  state.assignedMasterId = slot.master.id;
  notices.time = "";
  stepErrorEl.textContent = "";
  renderSlots();
  renderPicked();
  renderStepper();
}

$("#calendar").addEventListener("click", (e) => {
  const nav = e.target.closest("[data-cal]");
  if (nav && !nav.disabled) {
    const next = new Date(calView.y, calView.m + Number(nav.dataset.cal), 1);
    calView.y = next.getFullYear();
    calView.m = next.getMonth();
    renderCalendar();
    return;
  }
  const day = e.target.closest("[data-date]");
  if (day && !day.disabled) selectDate(day.dataset.date);
});

$("#slots").addEventListener("click", (e) => {
  const slot = e.target.closest("[data-time]");
  if (slot && !slot.disabled) {
    selectTime(slot.dataset.time);
    return;
  }
  const jump = e.target.closest("[data-jump]");
  if (jump) selectDate(jump.dataset.jump);
});

/* =====================================================================
   ШАГ 4. КОНТАКТЫ
   ===================================================================== */

// Приводит ввод к 11 цифрам, начинающимся с 7 (8 7XX… → 7 7XX…)
function normalizePhoneDigits(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits && !digits.startsWith("7")) digits = "7" + digits;
  return digits.slice(0, 11);
}

function formatPhone(digits) {
  if (!digits) return "";
  const d = digits.slice(1);
  let out = "+7";
  if (d.length > 0) out += " (" + d.slice(0, 3);
  if (d.length >= 3) out += ")";
  if (d.length > 3) out += " " + d.slice(3, 6);
  if (d.length > 6) out += "-" + d.slice(6, 8);
  if (d.length > 8) out += "-" + d.slice(8, 10);
  return out;
}

fields.phone.addEventListener("input", () => {
  fields.phone.value = formatPhone(normalizePhoneDigits(fields.phone.value));
});

fields.phone.addEventListener("focus", () => {
  if (!fields.phone.value) fields.phone.value = "+7 (";
});

fields.phone.addEventListener("blur", () => {
  if (normalizePhoneDigits(fields.phone.value).length <= 1) fields.phone.value = "";
});

fields.comment.addEventListener("input", () => {
  $("#commentCount").textContent = fields.comment.value.length;
});

const NAME_RE = /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]+(?:[ '\-][A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]+)*$/;

const validators = {
  name(value) {
    const v = value.trim().replace(/\s+/g, " ");
    if (!v) return "Укажите ваше имя.";
    if (v.length < 2) return "Имя слишком короткое.";
    if (!NAME_RE.test(v)) return "Имя может содержать только буквы, пробел или дефис.";
    return "";
  },
  phone(value) {
    const digits = normalizePhoneDigits(value);
    if (digits.length <= 1) return "Укажите номер телефона.";
    if (digits.length !== 11) return "Номер должен быть в формате +7 (7XX) XXX-XX-XX.";
    return "";
  },
};

function setFieldError(name, message) {
  const input = fields[name];
  input.closest(".field").classList.toggle("has-error", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
  $(`#${name}-error`).textContent = message;
}

function validateField(name) {
  const message = validators[name](fields[name].value);
  setFieldError(name, message);
  return !message;
}

// Ошибка поля показывается после первого взаимодействия с ним
const touched = new Set();

Object.keys(validators).forEach((name) => {
  const input = fields[name];
  input.addEventListener("blur", () => {
    touched.add(name);
    validateField(name);
  });
  input.addEventListener("input", () => {
    if (touched.has(name)) validateField(name);
  });
});

/* =====================================================================
   ШАГ 5. ИТОГ
   ===================================================================== */

function collectData() {
  const service = getService(state.serviceId);
  const master = getMaster(state.masterId);
  const assigned = getMaster(state.assignedMasterId);
  let masterLabel = master ? master.name : "";
  if (state.masterId === ANY_MASTER) {
    masterLabel = `Любой мастер${assigned ? ` (по графику свободен: ${assigned.name})` : ""}`;
  }
  return {
    service,
    masterLabel,
    date: state.date,
    time: state.time,
    endTime: service && state.time ? fromMinutes(toMinutes(state.time) + service.duration) : "",
    name: fields.name.value.trim().replace(/\s+/g, " "),
    phone: formatPhone(normalizePhoneDigits(fields.phone.value)),
    comment: fields.comment.value.trim(),
  };
}

function reviewRows(data, withEdit) {
  const rows = [
    ["Услуга", data.service.name, 1],
    ["Стоимость", priceLabel(data.service), 1],
    ["Длительность", formatDuration(data.service.duration), 1],
    ["Мастер", data.masterLabel, 2],
    ["Дата", formatDateRu(data.date), 3],
    ["Время", `${data.time}–${data.endTime}`, 3],
    ["Имя", data.name, 4],
    ["Телефон", data.phone, 4],
    ["Комментарий", data.comment || "—", 4],
  ];
  return rows
    .map(
      ([k, v, step]) => `
      <div class="review__row">
        <dt>${k}</dt>
        <dd>${escapeHTML(v)}</dd>
        ${withEdit ? `<button type="button" class="review__edit" data-goto="${step}" aria-label="Изменить: ${k}">Изменить</button>` : ""}
      </div>`
    )
    .join("");
}

function renderReview() {
  $("#review").innerHTML = reviewRows(collectData(), true);
}

$("#review").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-goto]");
  if (btn) goToStep(Number(btn.dataset.goto));
});

/* =====================================================================
   НАВИГАЦИЯ ПО ШАГАМ
   ===================================================================== */

// Ошибка шага или пустая строка; silent — без подсветки полей
function stepProblem(n, silent = false) {
  switch (n) {
    case 1:
      return state.serviceId ? "" : "Выберите услугу, чтобы продолжить.";
    case 2:
      return state.masterId ? "" : "Выберите мастера или вариант «Любой мастер».";
    case 3: {
      if (!state.date) return "Выберите дату в календаре.";
      if (!state.time) return "Выберите свободное время.";
      const slot = findSlot(state.date, state.time);
      return slot && slot.state === "free" ? "" : "Это время уже недоступно — выберите другое.";
    }
    case 4: {
      const bad = Object.keys(validators).filter((name) =>
        silent ? validators[name](fields[name].value) : !validateField(name)
      );
      return bad.length ? "Проверьте контактные данные." : "";
    }
    default:
      return "";
  }
}

const canReach = (n) => Array.from({ length: n - 1 }, (_, i) => i + 1).every((i) => !stepProblem(i, true));

function renderStepper() {
  $("#stepper").innerHTML = STEPS.map((label, i) => {
    const n = i + 1;
    const cls = n === currentStep ? "is-current" : n < currentStep || (!stepProblem(n, true) && canReach(n)) ? "is-done" : "";
    const reachable = n !== currentStep && canReach(n);
    return `<li class="${cls}"${n === currentStep ? ' aria-current="step"' : ""}>
      <button type="button" class="stepper__btn" data-step="${n}"${reachable ? "" : " disabled"} aria-label="Шаг ${n}: ${label}">
        <span class="stepper__num">${n}</span>
        <span class="stepper__label">${label}</span>
      </button>
    </li>`;
  }).join("");
  $("#stepCount").innerHTML = `Шаг <b>${currentStep}</b> из ${STEPS.length} · ${STEPS[currentStep - 1]}`;
}

$("#stepper").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-step]");
  if (btn && !btn.disabled) goToStep(Number(btn.dataset.step));
});

function renderPicked() {
  const box = $("#picked");
  const service = getService(state.serviceId);
  const parts = [];
  if (service) parts.push(["Услуга", service.name]);
  if (state.masterId) parts.push(["Мастер", state.masterId === ANY_MASTER ? "любой" : getMaster(state.masterId).name]);
  if (state.date) parts.push(["Дата", formatDateRu(state.date, false) + (state.time ? `, ${state.time}` : "")]);

  const show = currentStep > 1 && currentStep < 5 && parts.length > 0;
  box.hidden = !show;
  box.innerHTML = show ? parts.map(([k, v]) => `<span>${k}: <b>${escapeHTML(v)}</b></span>`).join("") : "";
}

function renderCurrentStep() {
  if (currentStep === 1) renderServiceStep();
  if (currentStep === 2) renderMasterStep();
  if (currentStep === 3) renderDateTime();
  if (currentStep === 5) renderReview();
}

// Перерисовать всё, что зависит от выбора
function refresh() {
  renderCurrentStep();
  renderStepper();
  renderPicked();
  updateCatalogHighlight();
  stepErrorEl.textContent = "";
}

function goToStep(n, { focus = true } = {}) {
  currentStep = n;
  $$(".wstep").forEach((s) => (s.hidden = Number(s.dataset.step) !== n));

  if (n === 3) {
    const base = parseISODate(state.date || todayISO());
    calView.y = base.getFullYear();
    calView.m = base.getMonth();
  }

  refresh();
  backBtn.classList.toggle("is-invisible", n === 1);
  nextBtn.innerHTML = n === STEPS.length ? FINAL_LABEL : 'Далее <span aria-hidden="true">→</span>';
  nextBtn.classList.toggle("btn--accent", n === STEPS.length);
  statusBox.textContent = "";
  statusBox.className = "form__status";

  if (focus) {
    const wizard = $("#wizard");
    const top = wizard.getBoundingClientRect().top;
    const headerSpace = $("#header").getBoundingClientRect().bottom;
    if (top < headerSpace || top > window.innerHeight * 0.6) {
      wizard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const title = $(`#step${n}-title`);
    if (title) setTimeout(() => title.focus({ preventScroll: true }), 50);
  }
}

function showStepError(message) {
  stepErrorEl.textContent = message;
  stepErrorEl.classList.remove("shake");
  void stepErrorEl.offsetWidth; // перезапуск анимации
  stepErrorEl.classList.add("shake");
}

backBtn.addEventListener("click", () => {
  if (currentStep > 1) goToStep(currentStep - 1);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (currentStep < STEPS.length) {
    if (currentStep === 4) Object.keys(validators).forEach((n) => touched.add(n));
    const problem = stepProblem(currentStep);
    if (problem) {
      showStepError(problem);
      if (currentStep === 4) {
        const firstBad = Object.keys(validators).find((n) => validators[n](fields[n].value));
        if (firstBad) fields[firstBad].focus();
      }
      return;
    }
    goToStep(currentStep + 1);
    return;
  }

  finish();
});

/* =====================================================================
   ЗАВЕРШЕНИЕ: ДЕМО-ОКНО (ничего не отправляется)
   ===================================================================== */

function finish() {
  for (let n = 1; n < STEPS.length; n++) {
    const problem = stepProblem(n);
    if (problem) {
      goToStep(n);
      showStepError(problem);
      return;
    }
  }

  openDemoModal(collectData());
}

function openDemoModal(data) {
  let dialog = $("#demoModal");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "demoModal";
    dialog.className = "modal";
    dialog.setAttribute("aria-labelledby", "demoModalTitle");
    document.body.append(dialog);

    dialog.addEventListener("click", (e) => {
      if (e.target === dialog || e.target.closest("[data-modal='close']")) dialog.close();
      if (e.target.closest("[data-modal='retry']")) {
        dialog.close();
        resetBooking();
      }
    });
  }

  dialog.innerHTML = `
    <div class="modal__box">
      <button type="button" class="modal__close" data-modal="close" aria-label="Закрыть">×</button>
      <div class="modal__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.2 4.2L19 7"/></svg>
      </div>
      <span class="modal__badge">Демонстрация</span>
      <h3 id="demoModalTitle">Детали заявки</h3>
      <dl class="review review--modal">${reviewRows(data, false)}</dl>
      <p class="modal__text">Это демонстрация процесса записи.<br>Реальная запись не создана.</p>
      <button type="button" class="btn btn--accent btn--block" data-modal="retry">Попробовать ещё раз</button>
    </div>`;

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  $("[data-modal='retry']", dialog).focus();
}

function resetBooking() {
  Object.assign(state, { serviceId: "", masterId: "", date: "", time: "", assignedMasterId: "" });
  notices.master = "";
  notices.time = "";
  serviceFilter = "all";
  form.reset();
  touched.clear();
  Object.keys(validators).forEach((name) => setFieldError(name, ""));
  $("#commentCount").textContent = "0";
  goToStep(1);
}

/* =====================================================================
   ВЫБОР ИЗ КАТАЛОГА
   ===================================================================== */

document.addEventListener("click", (event) => {
  const serviceBtn = event.target.closest("[data-pick-service]");
  if (serviceBtn) {
    const service = getService(serviceBtn.dataset.pickService);
    serviceFilter = "all";
    setService(service.id);
    goToStep(state.masterId ? 3 : 2, { focus: false });
    $("#booking").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const masterBtn = event.target.closest("[data-pick-master]");
  if (masterBtn) {
    const master = getMaster(masterBtn.dataset.pickMaster);
    const service = getService(state.serviceId);
    // Если выбранная услуга не подходит мастеру — сбрасываем услугу
    if (service && !master.categories.includes(service.category)) state.serviceId = "";
    serviceFilter = state.serviceId ? "all" : master.categories[0];
    state.masterId = master.id;
    notices.master = "";
    revalidateTime("мастера");
    goToStep(state.serviceId ? 3 : 1, { focus: false });
    $("#booking").scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

/* =====================================================================
   НАВИГАЦИЯ, ШАПКА, АНИМАЦИИ
   ===================================================================== */

const burger = $("#burger");
const nav = $("#nav");

function setMenu(open) {
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  nav.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
}

burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
nav.addEventListener("click", (e) => {
  if (e.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false);
});
window.addEventListener("resize", () => {
  if (window.innerWidth > 860 && nav.classList.contains("is-open")) setMenu(false);
});

const header = $("#header");
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
window.addEventListener("scroll", onScroll, { passive: true });

function setupReveal() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
    observer.observe(el);
  });
}

/* =====================================================================
   ЗАПУСК
   ===================================================================== */

document.documentElement.classList.add("js");
renderServices();
renderMasters();
goToStep(1, { focus: false });
setupReveal();
onScroll();
$("#year").textContent = new Date().getFullYear();
