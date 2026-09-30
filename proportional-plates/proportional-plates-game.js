// Proportional Plates - a cooking game about proportions (grades 6-8).
// You ARE the chef: walk with the arrow keys. Customers walk in all smiles; walk over and press Space to take their order,
// carry it into the kitchen (it goes up on the rail), press Space at the stove to cook it - scale the recipe (or work out the
// cost) and type the amount - then carry the plate back out and press Space to serve. The customer's face is the feedback:
// delighted when it's right, upset when it's close (within 25%), and comically FUMING when it's way off. While they wait,
// their smile slowly fades until they're steaming mad, and if they wait too long they storm out. Every wrong order and every
// walk-out is a 1-star review; three and the restaurant closes. Wrong orders are followed by a pop-up that shows the right
// method next to what the student did. Level rules are all in one place: search for "LEVEL SETTINGS".
(() => {
'use strict';
const W = 960, H = 540, FEET = 522;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
  get(k, d) { try { const v = localStorage.getItem('proportionalplates_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { if (window.proportionalPlatesResetting) return; try { localStorage.setItem('proportionalplates_' + k, JSON.stringify(v)); } catch (e) {} }
};
// LANGUAGE: English or Spanish, picked with the 🌐 button in the top bar (site-layout.js) and shared by every game.
// Every word a student sees goes through L('English', 'Spanish'); the recipes carry their own Spanish words (DISHES_ES).
// (../site-lang.js reads the choice and swaps in the page's own Spanish words from data-es / data-es-aria / data-es-title.)
const ES = !!window.SITE_ES;
const L = (en, es) => ES ? es : en;

/* ===================== FRACTIONS (every amount is kept exact) ===================== */
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const F = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
const fmul = (x, y) => F(x.n * y.n, x.d * y.d);
const fdiv = (x, y) => F(x.n * y.d, x.d * y.n);
const fval = x => x.n / x.d;
const fstr = x => { if (x.d === 1) return String(x.n); const w = Math.floor(x.n / x.d), r = x.n - w * x.d; return (w ? w + ' ' : '') + r + '/' + x.d; };
// the same amount as HTML with a stacked fraction (e.g. 1½ drawn as 1 and a small 1/2)
const fhtml = x => { if (x.d === 1) return String(x.n); const w = Math.floor(x.n / x.d), r = x.n - w * x.d; return (w ? w : '') + `<span class="fr" aria-label="${fstr(x)}"><span class="fn">${r}</span><span class="fd">${x.d}</span></span>`; };
// the same thing inside an SVG: a whole-number part, then the numerator over a bar over the denominator; returns the markup and its width
function svgAmount(x, head, px, cy, anchor, fs, col) {
  const cw = s => [...String(s)].reduce((a, ch) => a + (ch === ' ' ? 0.28 : 0.56), 0) * fs, t =(s, xx, yy, size) => `<text x="${xx}" y="${yy}" font-size="${size}" font-weight="900" fill="${col}">${s}</text>`;
  if (x.d === 1) { const s = head + x.n, w = cw(s); return { svg: t(s, anchor === 'middle' ? px - w / 2 : px, cy + fs * 0.36, fs), w }; }
  const whole = Math.floor(x.n / x.d), r = x.n - whole * x.d, lead = head + (whole || ''), ff = Math.round(fs * 0.74);
  const wl = lead ? cw(lead) + 1 : 0, wf =Math.max(String(r).length, String(x.d).length) * ff * 0.62 + 5, w = wl + wf;
  const x0 = anchor === 'middle' ? px - w / 2 : px, fx = x0 + wl + wf / 2, c = s => `text-anchor="middle"`;
  return { w, svg: (lead ? t(lead, x0, cy + fs * 0.36, fs) : '') +
    `<text x="${fx}" y="${cy - 2.5}" ${c()} font-size="${ff}" font-weight="900" fill="${col}">${r}</text>` +
    `<line x1="${fx - wf / 2 + 1}" x2="${fx + wf / 2 - 1}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<text x="${fx}" y="${cy + ff * 0.82 + 2}" ${c()} font-size="${ff}" font-weight="900" fill="${col}">${x.d}</text>` };
}
// what the student typed: whole numbers, decimals, fractions (3/4) and mixed numbers (1 1/2), with or without a $
function parseAns(s) {
  s = String(s || '').replace(/[$,]/g, '').trim().replace(/\s+/g, ' ');
  let m;
  if ((m = s.match(/^(\d+(?:\.\d+)?|\.\d+)$/))) return parseFloat(m[1]);
  if ((m = s.match(/^(\d+)\s*\/\s*(\d+)$/)) && +m[2]) return +m[1] / +m[2];
  if ((m = s.match(/^(\d+)[ -](\d+)\s*\/\s*(\d+)$/)) && +m[3]) return +m[1] + +m[2] / +m[3];
  return NaN;
}

/* ===================== RECIPES ===================== */
// c = countable (always a whole number, so never used in the fraction questions)
const DISHES = [
  { id: 'pancakes', name: 'Pancakes', noun: 'pancakes', one: 'pancake', food: 'stack', ings: [
    { q: 'cups of flour', u: 'cups', u1: 'cup' }, { q: 'cups of milk', u: 'cups', u1: 'cup' }, { q: 'eggs', u: 'eggs', u1: 'egg', c: 1 }, { q: 'tablespoons of sugar', u: 'tbsp', u1: 'tbsp' }] },
  { id: 'soup', name: 'Tomato Soup', noun: 'bowls', one: 'bowl', food: 'bowl', ings: [
    { q: 'cups of broth', u: 'cups', u1: 'cup' }, { q: 'tomatoes', u: 'tomatoes', u1: 'tomato', c: 1 }, { q: 'cloves of garlic', u: 'cloves', u1: 'clove', c: 1 }, { q: 'teaspoons of salt', u: 'tsp', u1: 'tsp' }] },
  { id: 'lemonade', name: 'Lemonade', noun: 'glasses', one: 'glass', food: 'glass', color: '#ffe066', ings: [
    { q: 'lemons', u: 'lemons', u1: 'lemon', c: 1 }, { q: 'cups of sugar', u: 'cups', u1: 'cup' }, { q: 'cups of water', u: 'cups', u1: 'cup' }] },
  { id: 'muffins', name: 'Blueberry Muffins', noun: 'muffins', one: 'muffin', food: 'pile', ings: [
    { q: 'cups of flour', u: 'cups', u1: 'cup' }, { q: 'eggs', u: 'eggs', u1: 'egg', c: 1 }, { q: 'cups of blueberries', u: 'cups', u1: 'cup' }, { q: 'tablespoons of butter', u: 'tbsp', u1: 'tbsp' }] },
  { id: 'smoothie', name: 'Berry Smoothies', noun: 'smoothies', one: 'smoothie', food: 'glass', color: '#ff7eb3', ings: [
    { q: 'bananas', u: 'bananas', u1: 'banana', c: 1 }, { q: 'cups of yogurt', u: 'cups', u1: 'cup' }, { q: 'strawberries', u: 'strawberries', u1: 'strawberry', c: 1 }, { q: 'cups of juice', u: 'cups', u1: 'cup' }] }
];
// the market, for the unit-price questions
const STORE_ITEMS = [
  { q: 'bags of flour', one: 'bag of flour', short: 'bags', dish: 'pancakes' }, { q: 'lemons', one: 'lemon', short: 'lemons', dish: 'lemonade' },
  { q: 'cartons of eggs', one: 'carton of eggs', short: 'cartons', dish: 'pancakes' }, { q: 'jars of honey', one: 'jar of honey', short: 'jars', dish: 'muffins' },
  { q: 'baskets of berries', one: 'basket of berries', short: 'baskets', dish: 'smoothie' }, { q: 'cans of tomatoes', one: 'can of tomatoes', short: 'cans', dish: 'soup' }
];
// the same recipes and market in Spanish (hm = the "how many" word that agrees with the ingredient: ¿Cuántas tazas? ¿Cuántos huevos?)
const DISHES_ES = {
  pancakes: { name: 'Panqueques', noun: 'panqueques', one: 'panqueque', ings: [
    { q: 'tazas de harina', u: 'tazas', u1: 'taza', hm: 'Cuántas' }, { q: 'tazas de leche', u: 'tazas', u1: 'taza', hm: 'Cuántas' }, { q: 'huevos', u: 'huevos', u1: 'huevo', hm: 'Cuántos' }, { q: 'cucharadas de azúcar', u: 'cdas', u1: 'cda', hm: 'Cuántas' }] },
  soup: { name: 'Sopa de tomate', noun: 'tazones', one: 'tazón', ings: [
    { q: 'tazas de caldo', u: 'tazas', u1: 'taza', hm: 'Cuántas' }, { q: 'tomates', u: 'tomates', u1: 'tomate', hm: 'Cuántos' }, { q: 'dientes de ajo', u: 'dientes', u1: 'diente', hm: 'Cuántos' }, { q: 'cucharaditas de sal', u: 'cdtas', u1: 'cdta', hm: 'Cuántas' }] },
  lemonade: { name: 'Limonada', noun: 'vasos', one: 'vaso', ings: [
    { q: 'limones', u: 'limones', u1: 'limón', hm: 'Cuántos' }, { q: 'tazas de azúcar', u: 'tazas', u1: 'taza', hm: 'Cuántas' }, { q: 'tazas de agua', u: 'tazas', u1: 'taza', hm: 'Cuántas' }] },
  muffins: { name: 'Muffins de arándanos', noun: 'muffins', one: 'muffin', ings: [
    { q: 'tazas de harina', u: 'tazas', u1: 'taza', hm: 'Cuántas' }, { q: 'huevos', u: 'huevos', u1: 'huevo', hm: 'Cuántos' }, { q: 'tazas de arándanos', u: 'tazas', u1: 'taza', hm: 'Cuántas' }, { q: 'cucharadas de mantequilla', u: 'cdas', u1: 'cda', hm: 'Cuántas' }] },
  smoothie: { name: 'Batidos de frutas', noun: 'batidos', one: 'batido', ings: [
    { q: 'plátanos', u: 'plátanos', u1: 'plátano', hm: 'Cuántos' }, { q: 'tazas de yogur', u: 'tazas', u1: 'taza', hm: 'Cuántas' }, { q: 'fresas', u: 'fresas', u1: 'fresa', hm: 'Cuántas' }, { q: 'tazas de jugo', u: 'tazas', u1: 'taza', hm: 'Cuántas' }] }
};
const STORE_ES = [
  { q: 'bolsas de harina', one: 'bolsa de harina', short: 'bolsas', short1: 'bolsa' }, { q: 'limones', one: 'limón', short: 'limones', short1: 'limón' },
  { q: 'cartones de huevos', one: 'cartón de huevos', short: 'cartones', short1: 'cartón' }, { q: 'frascos de miel', one: 'frasco de miel', short: 'frascos', short1: 'frasco' },
  { q: 'canastas de moras', one: 'canasta de moras', short: 'canastas', short1: 'canasta' }, { q: 'latas de tomates', one: 'lata de tomates', short: 'latas', short1: 'lata' }
];
if (ES) {
  DISHES.forEach(d => { const s = DISHES_ES[d.id]; Object.assign(d, { name: s.name, noun: s.noun, one: s.one }); d.ings.forEach((ing, i) => { ing.key = ing.u1; Object.assign(ing, s.ings[i]); }); });
  STORE_ITEMS.forEach((it, i) => Object.assign(it, STORE_ES[i]));
}
const howMany = ing => ing.hm || 'How many';                          // "How many" / "Cuántas" / "Cuántos"
const dishById = id => DISHES.find(d => d.id === id);

/* ---- LEVEL SETTINGS (edit these!) ----
   Level 1  Scale up:     the order is a whole-number multiple of the recipe (4 pancakes -> 12 pancakes)
   Level 2  Scale down:   ...and also a whole-number fraction of it (12 pancakes -> 4 pancakes)
   Level 3  Ratio tables: the order isn't a multiple either way (6 -> 15), so go through an equivalent ratio
   Level 4  Unit price:   the market sells 4 bags for $12 - what do 7 bags cost? (find the price of 1 first)
   Level 5  Fractions:    fractional amounts and scale factors like 1 1/2 or 2/3, mixed with everything else */
const LEVEL_NAMES = ES ? ['Aumentar', 'Aumentar y reducir', 'Tablas de razones', 'Precios unitarios', 'Fracciones y decimales']
  : ['Scaling up', 'Scaling up & down', 'Ratio tables', 'Unit prices', 'Fractions & decimals'];
const KINDS_BY_LEVEL = [['up'], ['up', 'down', 'down'], ['table', 'table', 'up', 'down'], ['rate', 'rate', 'table', 'down'], ['frac', 'frac', 'rate', 'table', 'up', 'down']];
const MAX_LEVEL = 5;
const ORDERS_PER_LEVEL = 8;                 // correct orders to reach the next level
const ARRIVE_SEC = [16, 15, 14, 13, 12];    // about how often a new customer walks in (when a table is free), by level
const PATIENCE_SEC = [85, 75, 68, 62, 56];  // how long a customer waits, from sitting down to getting their food, before storming out
const MAX_REVIEWS = 3;                      // 1-star reviews before the restaurant closes
const CLOSE = 0.25;                         // within 25% of the right amount = upset; further off = FUMING
const PRACTICE_TYPES = [
  { id: 'up', level: 1, name: L('Scale up', 'Aumentar'), desc: L('Multiply the recipe for a bigger order.', 'Multiplica la receta para un pedido más grande.') },
  { id: 'down', level: 2, name: L('Scale down', 'Reducir'), desc: L('Divide the recipe for a smaller order.', 'Divide la receta para un pedido más pequeño.') },
  { id: 'table', level: 3, name: L('Ratio tables', 'Tablas de razones'), desc: L('Orders that aren\'t a whole multiple.', 'Pedidos que no son un múltiplo exacto.') },
  { id: 'rate', level: 4, name: L('Unit prices', 'Precios unitarios'), desc: L('Find the price of one, then the total.', 'Halla el precio de uno y luego el total.') },
  { id: 'frac', level: 5, name: L('Fractions', 'Fracciones'), desc: L('Scale factors like 1½ and ⅔.', 'Factores de escala como 1½ y ⅔.') }
];

function mk(kind, dish, ing, baseN, baseQ, tgtN, extra) {
  return Object.assign({ kind, dish, ing, baseN, baseQ, tgtN, ans: F(baseQ.n * tgtN, baseQ.d * baseN) }, extra || {});
}
// every multiplication or division a student has to do stays inside the 10 x 10 times table (both factors 10 or less).
// Level 1 (and Practice) keeps scaling up easy: recipes of 2-5 dishes, scale factors of 2-5 and amounts of 1-5.
function genUp(easy) {                                                // order ÷ recipe = k, then amount × k
  const d = pick(DISHES), ing = pick(d.ings), baseN = easy ? rnd(2, 5) : rnd(2, 10), k = easy ? rnd(2, 5) : rnd(2, 10), q = easy ? rnd(1, 5) : rnd(1, 10);
  return mk('up', d, ing, baseN, F(q), baseN * k);
}
function genDown() {                                                  // recipe ÷ order = k, then amount ÷ k
  const d = pick(DISHES), ing = pick(d.ings), tgtN = rnd(1, 10), k = rnd(2, 10), m = rnd(1, 10);
  return mk('down', d, ing, tgtN * k, F(m * k), tgtN);
}
const TABLE_PAIRS = [[2, 3], [3, 2], [3, 4], [4, 3], [2, 5], [5, 2], [3, 5], [5, 3], [4, 5], [5, 4]];
function genTable() {
  for (let n = 0; n < 400; n++) {
    // kept small: go down to the amount for 1 (or 2) dishes, then back up - e.g. 3 muffins use 6 cups, so 1 uses 2, so 5 use 10
    // always through a WHOLE amount for 1 dish, so no fractions or decimals ever show up along the way
    const d = pick(DISHES), ing = pick(d.ings), g = 1, [a, b] = pick(TABLE_PAIRS), v = rnd(2, 6);
    return mk('table', d, ing, g * a, F(v * a), g * b, { extraCol: null });
  }
}
function genRate() {
  for (let n = 0; n < 400; n++) {
    // kept friendly: a whole-dollar price of $1-$5 each, 2-5 items on the sign, up to 10 in the order (total ÷ items = price of 1, then × order)
    const it = pick(STORE_ITEMS), p = rnd(1, 5), baseN = rnd(2, 5), tgtN = rnd(1, 10);
    if (tgtN === baseN) continue;
    return mk('rate', dishById(it.dish), null, baseN, F(p * baseN), tgtN, { item: it, money: true });
  }
}
const FRAC_PAIRS = [[4, 6], [2, 3], [4, 2], [6, 4], [6, 9], [8, 12], [4, 10], [2, 5], [6, 3], [8, 6], [3, 2], [4, 3], [6, 8], [2, 1], [4, 8], [3, 6]];
const FRAC_Q = [F(1, 2), F(1), F(3, 2), F(2), F(5, 2), F(3), F(1, 3), F(4, 3), F(1, 4), F(5, 4), F(1, 5), F(6, 5)];
// the only fractions students ever see are 1/2, 1/3, 1/4 and 1/5 (on their own or after a whole number, like 1 1/2)
const simpleFrac = x => x.d === 1 || ([2, 3, 4, 5].includes(x.d) && x.n % x.d === 1);
function genFrac() {
  for (let n = 0; n < 2000; n++) {
    const d = pick(DISHES), ing = pick(d.ings.filter(i => !i.c)), [baseN, tgtN] = pick(FRAC_PAIRS), baseQ = pick(FRAC_Q);
    const P = mk('frac', d, ing, baseN, baseQ, tgtN);
    if (fval(P.ans) > 12 || (P.ans.d === 1 && baseQ.d === 1)) continue;
    if (![P.baseQ, P.ans, F(tgtN, baseN), blocksOf(P).v].every(simpleFrac)) continue;   // the amounts, the scale factor and each step
    return P;
  }
  return genUp();
}
const GEN = { up: genUp, down: genDown, table: genTable, rate: genRate, frac: genFrac };
function genProblem(kind, easy) { return GEN[kind](easy); }

// how the numbers break into equal "blocks" (the tape diagram and the steps both use it):
// the recipe is a blocks, the order is b blocks, and every block is the same amount v
function blocksOf(P) {
  const g = P.kind === 'rate' ? 1 : gcd(P.baseN, P.tgtN), a = P.baseN / g, b = P.tgtN / g;
  return { g, a, b, v: F(P.baseQ.n, P.baseQ.d * a) };
}
const amtHTML = (P, x) => P.money ? '$' + fhtml(x) : fhtml(x);
const unitWord = (P, x) => P.money ? '' : (fval(x) === 1 ? P.ing.u1 : P.ing.u);
const qtyText = (P, x) => (amtHTML(P, x) + ' ' + unitWord(P, x)).trim();          // as HTML, so fractions are drawn stacked
const nounOf = (P, n) => P.money ? (n === 1 ? P.item.one : P.item.q) : (n === 1 ? P.dish.one : P.dish.noun);

// right, close (upset), or way off (FUMING) - thirds are accepted as decimals rounded to 2 places
function verdict(P, val) {
  const a = fval(P.ans), tol = P.ans.d === 3 ? 0.011 : 1e-9;
  if (Math.abs(val - a) <= tol) return 'ok';
  return Math.abs(val - a) / a <= CLOSE ? 'close' : 'off';
}
// a guess at WHY the answer was wrong, from the classic proportion mistakes
function mistakeOf(P, val) {
  const near = x => Math.abs(val - x) < 1e-6, q = fval(P.baseQ), diff = P.tgtN - P.baseN;
  if (diff && near(q + diff)) return 'add';
  if (P.tgtN !== P.baseN && near(q * P.baseN / P.tgtN)) return 'flip';
  if (P.baseN > 1 && P.tgtN > 1 && near(q * P.tgtN)) return 'timesN';
  if (P.money && P.tgtN > 1 && near(q / P.baseN)) return 'unit';
  return '';
}

/* ===================== GAME STATE ===================== */
let best = store.get('best_served', 0), bestLevel = store.get('best_level', 1), totalStars = store.get('stars', 0), muted = store.get('muted', false);
let G = null, screen = 'title', paused = false, cardAt = 0, orderNo = 0;
// The restaurant is seen from the front at an angle: a point on the floor is (x, y), where y is the depth (the back wall
// meets the floor at y = 200; bigger y = closer to you). Everyone is drawn smaller the further back they are.
const FLOOR_Y = 200;
const depth = y => 0.6 + 0.47 * (y - FLOOR_Y) / 320;                  // drawing scale at floor depth y
// No table stands right in front of another table or its serving spot (the dashed circle beside it), so nothing is ever hidden:
// the front row is too far forward to overlap the back row, and the middle row only uses the open space below the kitchen.
// Two evenly spaced rows with a wide open walkway between them (nothing in it), and wide aisles between neighbors.
// (side: which side of the table the chef stands on to serve - each back table uses the side the front row's customers
//  never reach, so every dashed circle stays in the open)
const SEATS = [{ tx: 540, ty: 320, side: -1 }, { tx: 695, ty: 320, side: 1 }, { tx: 860, ty: 320, side: 1 },  // back row, clear of the kitchen
  { tx: 150, ty: 482 }, { tx: 380, ty: 482 }, { tx: 610, ty: 482 }, { tx: 840, ty: 482 }]             // front row, from below the kitchen to the far right
  .map(s => Object.assign(s, { sy: s.ty - 14 }));                     // each customer sits just behind their table, facing you
const KITCHEN = { x: 400, y: 300 };  // the kitchen is the back-left corner (x < 400, y < 300): walking in hangs your orders on the rail
const COUNTER = { x: 286, y0: 288, y1: 318 };   // the kitchen's front counter - walk around its right end to get in
const DOOR = { x: 900, y: 214 };     // customers come in and leave through the door in the back wall
const CHEF_SPEED = 300, CHEF_SPEED_Y = 210;   // px per second (moving toward / away from you looks slower)
const SKINS = ['#ffd9b0', '#f0c9a0', '#d9a66c', '#c68642', '#8d5524', '#5c3a21'];
const HAIRS = ['#2b1b10', '#151515', '#a0522d', '#d9a441', '#7b5a3a', '#b9b9c4', '#4a3320'];
const SHIRTS = ['#5b8cff', '#2eb872', '#e0483c', '#9b51e0', '#f2994a', '#00a3a3', '#e0245e', '#3a4a6a'];
const TICKET_COLORS = ['#e0483c', '#2f80ed', '#1e9e57', '#9b51e0', '#f2994a', '#00a3a3', '#e0245e'];
const newLook = () => ({ skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS), style: pick(['short', 'long', 'bun', 'curly', 'pony', 'bald']) });
const keys = { left: false, right: false, up: false, down: false };
const clearKeys = () => { keys.left = keys.right = keys.up = keys.down = false; };
const coarse = () => matchMedia('(hover: none) and (pointer: coarse)').matches;

function newWorld(mode, level, kinds) {
  const lv = level || 1;
  return {
    mode, level: lv, kinds: kinds || null, startServed: (lv - 1) * ORDERS_PER_LEVEL, served: (lv - 1) * ORDERS_PER_LEVEL,
    correct: 0, wrong: 0, streak: 0, bestStreak: 0, stars: 0, reviews: 0, t: 0,
    custs: [], leavers: [], particles: [], activeId: null, nextT: 1, arrivals: 0, cooking: false, pending: null,
    pass: [],                                                           // cooked plates waiting on the kitchen counter (the chef's hands were full)
    chef: { x: 360, y: 345, dir: 1, walking: false, notepad: [], plates: [], target: null }, missed: [], state: 'play'
  };
}
const shiftServed = () => G.served - G.startServed;

/* ===================== CUSTOMERS ===================== */
// a customer's order goes: ready (wants to order) -> taken (in the chef's notepad) -> hung (on the kitchen rail)
//   -> carry (cooked: in the chef's hands, or waiting on the kitchen counter) -> served (they react; a right order
//   leaves happy, a wrong one goes back on the rail to be remade - customers only storm out when their patience runs out)
const MAX_HANDS = 2;                                                  // the chef can carry two plates at once
function spawnCustomer() {
  const used = new Set(G.custs.map(c => c.seat).concat(G.leavers.filter(l => l.walk < 0).map(l => l.seat)));
  const free = SEATS.map((_, i) => i).filter(s => !used.has(s));
  if (!free.length) return false;
  const kind = G.kinds ? pick(G.kinds) : pick(KINDS_BY_LEVEL[G.level - 1]);
  const P = genProblem(kind, G.mode === 'practice' || G.level === 1), pat = G.mode === 'run' ? PATIENCE_SEC[G.level - 1] : Infinity;
  orderNo++;
  G.custs.push({ id: orderNo, num: orderNo, P, seat: pick(free), look: newLook(), color: TICKET_COLORS[orderNo % TICKET_COLORS.length],
    state: 'ready', patience: pat, patMax: pat, mood: 'wait', bubble: '', arrive: 0, wx: DOOR.x, wy: DOOR.y, react: 0 });
  sfx.bell();
  if (orderNo === 1) toast(L('A customer walked in! Walk to their table with the arrow keys and press Space.', '¡Llegó un cliente! Camina a su mesa con las flechas y presiona Espacio.'), '');
  return true;
}
function walkOut(C) {
  const ch = G.chef, hadPlate = ch.plates.includes(C) || G.pass.includes(C);
  G.custs = G.custs.filter(c => c !== C);
  ch.notepad = ch.notepad.filter(c => c !== C);
  ch.plates = ch.plates.filter(c => c !== C); G.pass = G.pass.filter(c => c !== C);
  if (G.activeId === C.id) G.activeId = null;
  C.mood = 'fuming'; C.bubble = L('TOO SLOW!', '¡QUÉ LENTO!'); C.walk = -1;
  G.leavers.push(C);
  addReview(C);
  toast(L(`Order #${C.num} got tired of waiting and left!${hadPlate ? ' Their plate is wasted.' : ''} −1 ★ review`,
    `¡El pedido #${C.num} se cansó de esperar y se fue!${hadPlate ? ' Su plato se desperdició.' : ''} −1 ★ reseña`), 'bad');
  sfx.fume();
  if (G.cooking && !railOrders().length) closeCook();
  renderRail(); renderCook();
}
function addReview(C) {
  if (G.mode !== 'run') return;
  G.reviews++;
  const s = SEATS[C.seat], k = depth(s.ty);
  G.particles.push({ kind: 'review', x: Math.min(W - 40, s.tx + 50 * k), y: s.sy - 90 * k, vx: 18, vy: -34, life: 2.2 });
  updateHUD();
}
const railOrders = () => G.custs.filter(c => c.state === 'hung');
const inKitchen = () => G.chef.x < KITCHEN.x && G.chef.y < KITCHEN.y;
const atStove = inKitchen;                                            // anywhere in the kitchen counts as "at the stove"
const serveSpot = seat => ({ x: SEATS[seat].tx + 72 * (SEATS[seat].side || -1), y: SEATS[seat].ty + 4 });   // where the chef stands to serve a table: beside it
const KITCHEN_SPOT = { x: 330, y: 250 };                                         // just inside the kitchen, past the end of the counter
function nearCustomer() {                                             // the customer at the table the chef is standing next to (any side of it)
  if (inKitchen()) return null;
  let found = null, bd = 1;
  for (const c of G.custs) {
    if (c.arrive < 1 || c.state === 'served') continue;
    const s = SEATS[c.seat], d = ((G.chef.x - s.tx) / 105) ** 2 + ((G.chef.y - s.ty - 8) / 64) ** 2;
    if (d < bd) { bd = d; found = c; }
  }
  return found;
}
// walls, the kitchen counter and the tables (with the customer's chair behind each one) block the chef
// (each table's footprint is scaled to how big it's drawn, so there are no invisible walls around the far-away tables)
const tableFoot = s => { const k = depth(s.ty); return { x: s.tx, y: s.ty - 10, rx: 56 * k, ry: 24 * k }; };
function blocked(x, y) {
  if (x < COUNTER.x + 8 && y > COUNTER.y0 && y < COUNTER.y1) return true;
  for (const s of SEATS) { const f = tableFoot(s), dx = (x - f.x) / f.rx, dy = (y - f.y) / f.ry; if (dx * dx + dy * dy < 1) return true; }
  return false;
}
function obstacleNear(x, y) {                                         // the center of whatever the chef just bumped into
  if (x < COUNTER.x + 30 && Math.abs(y - (COUNTER.y0 + COUNTER.y1) / 2) < 40) return { x: 0, y: (COUNTER.y0 + COUNTER.y1) / 2 };   // always slide toward the gap at its right end
  let best = null, bd = Infinity;
  for (const s of SEATS) { const f = tableFoot(s), d = Math.hypot((x - f.x) / f.rx, (y - f.y) / f.ry); if (d < bd) { bd = d; best = f; } }
  return bd < 1.6 ? best : null;
}

/* ===================== WHAT SPACE DOES (take the order, cook, serve) ===================== */
function interact() {
  if (!G || G.state !== 'play' || paused || G.cooking) return;
  const ch = G.chef, near = nearCustomer();
  if (near) ch.dir = SEATS[near.seat].tx < ch.x ? -1 : 1;              // turn to face the table
  if (near && ch.plates.includes(near)) { deliver(near); return; }
  if (near && near.state === 'ready') { takeOrder(near); return; }
  if (inKitchen() && G.pass.length && ch.plates.length < MAX_HANDS) { pickUp(); return; }
  if (atStove() && railOrders().length) { openCook(); return; }
  if (ch.plates.length) {
    const nums = ch.plates.map(c => '#' + c.num).join(L(' and ', ' y '));
    toast(near ? L(`Your plates are for ${nums} - look for the matching flag.`, `Tus platos son para ${nums}: busca la bandera con ese número.`)
      : L(`Carry the plate${ch.plates.length > 1 ? 's' : ''} to ${nums}, then press Space at the table.`, `Lleva ${ch.plates.length > 1 ? 'los platos' : 'el plato'} a ${nums} y presiona Espacio en la mesa.`), near ? 'bad' : '');
    return;
  }
  if (near) { toast(near.state === 'taken' ? L(`Bring order #${near.num} to the kitchen first!`, `¡Primero lleva el pedido #${near.num} a la cocina!`) : L(`Order #${near.num} is on the rail - cook it at the stove.`, `El pedido #${near.num} está en el riel: cocínalo en la estufa.`), ''); return; }
  if (inKitchen()) toast(railOrders().length ? L('Walk over to the stove to cook.', 'Camina a la estufa para cocinar.') : ch.notepad.length ? L('Your orders go on the rail as you walk in.', 'Tus pedidos se cuelgan en el riel al entrar.') : L('No orders yet - walk to a customer and take their order.', 'Aún no hay pedidos: camina hacia un cliente y toma su pedido.'), '');
}
function takeOrder(C) {
  C.state = 'taken'; G.chef.notepad.push(C);
  sfx.go();
  const P = C.P;
  toast(L(`Order #${C.num}: ${P.money ? 'a supplies bill' : P.tgtN + ' ' + nounOf(P, P.tgtN)}. Take it to the kitchen (back left)!`,
    `Pedido #${C.num}: ${P.money ? 'una cuenta de ingredientes' : P.tgtN + ' ' + nounOf(P, P.tgtN)}. ¡Llévalo a la cocina (al fondo a la izquierda)!`), '');
}
function hangOrders() {                                               // walking into the kitchen puts every order in the notepad on the rail
  const ch = G.chef, n = ch.notepad.length;
  if (!n) return;
  ch.notepad.forEach(c => { c.state = 'hung'; });
  toast(L(`${n === 1 ? 'Order #' + ch.notepad[0].num + ' is' : n + ' orders are'} on the rail - press Space at the stove to cook.`,
    `${n === 1 ? 'El pedido #' + ch.notepad[0].num + ' está' : n + ' pedidos están'} en el riel: presiona Espacio en la estufa para cocinar.`), '');
  ch.notepad = [];
  sfx.ding(); renderRail();
}
function openCook() {
  G.cooking = true; clearKeys(); G.chef.walking = false; G.chef.target = G.chef.path = null;
  const r = railOrders();
  if (!r.some(c => c.id === G.activeId)) G.activeId = r[0].id;
  $('ans').value = '';
  renderRail(); renderCook();
  if (!coarse()) setTimeout(() => $('ans').focus(), 20);
}
function pickUp() {                                                   // take plates waiting on the kitchen counter (as many as the chef's hands hold)
  const ch = G.chef, took = [];
  while (G.pass.length && ch.plates.length < MAX_HANDS) { const C = G.pass.shift(); ch.plates.push(C); took.push('#' + C.num); }
  sfx.go();
  toast(L(`Picked up ${took.join(' and ')}.${G.pass.length ? ` ${G.pass.length} more waiting on the counter.` : ''}`,
    `Recogiste ${took.join(' y ')}.${G.pass.length ? ` Quedan ${G.pass.length} en el mostrador.` : ''}`), '');
}
// a wrong plate: after the "let's fix it" card, the customer stays put and the order goes back on the rail to be remade
function remakeOrder(C) {
  Object.assign(C, { state: 'hung', plated: false, mood: 'wait', bubble: '', handled: false, react: 0, remake: true, railed: false, result: null });
  toast(L(`Order #${C.num} is back on the rail - remake it in the kitchen before they run out of patience!`,
    `El pedido #${C.num} volvió al riel: ¡rehazlo en la cocina antes de que se le acabe la paciencia!`), '');
  renderRail();
}
function closeCook() { if (!G) return; G.cooking = false; $('ans').blur(); renderRail(); renderCook(); }
function setActive(id) {
  if (G.activeId === id) return;
  G.activeId = id; $('ans').value = '';
  renderRail(); renderCook();
}

/* ===================== THE TICKET RAIL + THE RECIPE CARD (DOM over the canvas) ===================== */
// the question as a picture (scale up / scale down): the recipe is one batch of dishes, the order is the same batch repeated
// (or, scaling down, the recipe is split into equal batches and the order is one of them) - so "how many batches?" is the scale factor
const svgI = body => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true">${body}</svg>`;
function foodIcon(d) {
  const o = 'stroke="#5a3a1a" stroke-width="1.2"';
  if (d.food === 'stack') return svgI(`<ellipse cx="10" cy="14" rx="8" ry="3.2" fill="#e3a857" ${o}/><ellipse cx="10" cy="10" rx="8" ry="3.2" fill="#e3a857" ${o}/><rect x="7.5" y="6.2" width="5" height="2.6" rx="1" fill="#fff3a8"/>`);
  if (d.food === 'bowl') return svgI(`<path d="M2 8 Q10 22 18 8 Z" fill="#f4f1ea" ${o}/><ellipse cx="10" cy="8.6" rx="7" ry="1.8" fill="#d9432f"/>`);
  if (d.food === 'pile') return svgI(`<path d="M4.5 10 L6 18 H14 L15.5 10 Z" fill="#e9c27a" ${o}/><path d="M7.5 11 L8 17 M10 11 V17 M12.5 11 L12 17" stroke="#b98a4a" stroke-width=".8"/><path d="M3 10.5 Q3 3 10 3 Q17 3 17 10.5 Z" fill="#c98a3f" ${o}/><circle cx="8" cy="7" r="1" fill="#4a4ab0"/><circle cx="12.5" cy="6" r="1" fill="#4a4ab0"/>`);
  return svgI(`<path d="M4 3 H16 L14.5 18 H5.5 Z" fill="${d.color || '#ffe066'}" ${o}/><path d="M13 3 L15 0.5" stroke="#e0483c" stroke-width="1.6"/>`);
}
const ING_COLORS = { egg: '#fff8e8', tomato: '#e0483c', clove: '#f3ead2', lemon: '#ffe066', banana: '#ffd84a', strawberry: '#e0245e' };
function ingIcon(ing) {
  const o = 'stroke="#5a3a1a" stroke-width="1.2"';
  if (ing.c) return svgI(`<circle cx="10" cy="11" r="7" fill="${ING_COLORS[ing.key || ing.u1] || '#f2c14e'}" ${o}/><path d="M9 4 Q10 1.5 12 2" stroke="#2e7d32" stroke-width="1.6" fill="none"/>`);
  if ((ing.key || ing.u1) === 'cup') return svgI(`<path d="M3 5 H14 L13 18 H4 Z" fill="#e8f3ff" ${o}/><path d="M14 7 Q18.5 8 14 13" fill="none" ${o}/><path d="M4 10 H13.5" stroke="#6aa9e0" stroke-width="1"/>`);
  return svgI(`<ellipse cx="7" cy="12" rx="5" ry="3.6" fill="#dfe4ea" ${o}/><path d="M11.5 10.5 L19 4" stroke="#5a3a1a" stroke-width="2.2" stroke-linecap="round"/>`);
}
function vizHTML(P) {
  if (!['up', 'down', 'table'].includes(P.kind)) return '';
  // the same equal groups as the tape diagram: the recipe is a groups, the order is b groups, each group is `per` dishes
  const { g: per, a, b } = blocksOf(P), cols = per <= 2 ? per : 2;
  const compact = per > 6 || Math.max(a, b) > 5;                      // too many to draw one by one: each batch is one icon and its count
  const batch = () => compact ? `<span class="vzG vzC">${foodIcon(P.dish)}<b>${per}</b></span>`
    : `<span class="vzG" style="grid-template-columns:repeat(${cols},1em)">${foodIcon(P.dish).repeat(per)}</span>`;
  const row = (label, n, dishes, amount) => `<span class="vzL">${label} &middot; <b>${dishes}</b> ${nounOf(P, dishes)}</span><span></span>` +
    `<span class="vzGs">${batch().repeat(n)}</span><span class="vzA">&#10140; ${ingIcon(P.ing)} ${amount}</span>`;
  return `<div class="viz">${row('Recipe', a, P.baseN, `<b>${fhtml(P.baseQ)}</b> ${fval(P.baseQ) === 1 ? P.ing.u1 : P.ing.u}`)}${row('Order', b, P.tgtN, `<b class="q">?</b> ${P.ing.u}`)}</div>`;
}
// The question as a picture, for every kind of order: the recipe and the order are two bars made of equal boxes
// (each box is the same number of dishes - or one item at the market), so students can SEE how many recipes the
// order is, or what part of one. The recipe bar shows its amount; the order bar asks for its amount.
function qbarHTML(P) {
  const { g: per, a, b } = blocksOf(P), maxN = Math.max(a, b);
  const unitLabel = n => P.money ? (n === 1 ? P.item.one : P.item.q) : nounOf(P, n);
  const box = () => {
    if (P.money) return `<span class="qbIn">1</span>`;
    // narrow boxes (more than 5 in a bar) just show how many dishes; the dishes are drawn one by one only when they all
    // fit inside their box (few boxes, few dishes each) - otherwise one dish and "×3", so nothing spills over the edges
    const icons = maxN > 5 ? `<b class="qbN">${per}</b>` : per <= 3 && per * maxN <= 8 ? foodIcon(P.dish).repeat(per) : `${foodIcon(P.dish)}<b>&times;${per}</b>`;
    return `<span class="qbIn">${icons}</span>`;
  };
  const amt = (x, ask) => P.money
    ? (ask ? `<b class="q">$ ?</b>` : `<b>$${fhtml(x)}</b>`)
    : `${ingIcon(P.ing)}${ask ? '<b class="q">?</b>' : `<b>${fhtml(x)}</b>`} ${ask ? P.ing.u : (fval(x) === 1 ? P.ing.u1 : P.ing.u)}`;
  const row = (cls, title, n, count, amount) =>
    `<div class="qbLab ${cls}">${title}<span><b>${count}</b> ${unitLabel(count)}</span></div>` +
    `<div class="qbBar ${cls}">${`<span class="qbBox" style="width:${(100 / maxN).toFixed(3)}%">${box()}</span>`.repeat(n)}</div>` +
    `<div class="qbAmt ${cls}">= ${amount}</div>`;
  const each = P.money ? L(`Every box is <b>1 ${P.item.one}</b>.`, `Cada caja es <b>1 ${P.item.one}</b>.`) : L(`Every box is <b>${per} ${nounOf(P, per)}</b>.`, `Cada caja es <b>${per} ${nounOf(P, per)}</b>.`);
  const how = a === 1 ? L(` The order is <b>${b}</b> boxes, so it needs ${b} times as much.`, ` El pedido es <b>${b}</b> cajas, así que necesita ${b} veces esa cantidad.`)
    : b === 1 ? L(` The order is just <b>1</b> of the recipe's ${a} boxes.`, ` El pedido es solo <b>1</b> de las ${a} cajas de la receta.`)
    : L(` Find what <b>1</b> box needs, then use it ${b} times.`, ` Halla lo que necesita <b>1</b> caja y úsalo ${b} veces.`);
  return `<div class="qbar">${row('rec', P.money ? L('Price', 'Precio') : L('Recipe', 'Receta'), a, P.baseN, amt(P.baseQ, false))}${row('ord', P.money ? L('You need', 'Necesitas') : L('Order', 'Pedido'), b, P.tgtN, amt(P.ans, true))}` +
    `<div class="qbNote">${each}${how}</div></div>`;
}
function fixActive() {                                              // the order being cooked left (walked out)? cook the next one, or close the stove
  if (!G || !G.cooking || activeOrder()) return;
  const r = railOrders();
  if (r.length) { G.activeId = r[0].id; $('ans').value = ''; } else { G.cooking = false; $('ans').blur(); }
}
function renderRail() {
  const rail = $('rail'); rail.innerHTML = '';
  if (!G) return;
  fixActive();
  const r = railOrders();
  if (!r.length) { rail.innerHTML = `<span class="railEmpty">${L('Order rail &mdash; bring orders into the kitchen', 'Riel de pedidos &mdash; lleva los pedidos a la cocina')}</span>`; return; }
  r.forEach(C => {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'tk' + (G.cooking && C.id === G.activeId ? ' on' : '') + (C.railed ? ' old' : '') + (C.remake ? ' remake' : '');   // only brand-new tickets slide in
    C.railed = true;
    const P = C.P, what = P.money ? `${P.tgtN} ${P.tgtN === 1 ? P.item.one : P.item.short}` : `${P.tgtN} ${nounOf(P, P.tgtN)}`;
    b.innerHTML = `<span class="tkNum" style="background:${C.color}">#${C.num}</span><span class="tkDish">${P.money ? L('Supplies', 'Compras') : P.dish.name}</span><span class="tkQty">${what}</span>${C.remake ? `<span class="tkRe">${L('Remake', 'Rehacer')}</span>` : ''}`;
    b.setAttribute('aria-label', L(`Order ${C.num}: ${P.money ? 'supplies bill' : P.dish.name}, ${what}`, `Pedido ${C.num}: ${P.money ? 'cuenta de compras' : P.dish.name}, ${what}`));
    b.onclick = () => {
      if (!G || G.state !== 'play') return;
      if (!G.cooking) { toast(atStove() ? L('Press Space to cook.', 'Presiona Espacio para cocinar.') : L('Walk to the stove, then press Space to cook.', 'Camina a la estufa y presiona Espacio para cocinar.'), ''); return; }
      setActive(C.id); if (!coarse()) $('ans').focus();
    };
    rail.appendChild(b);
  });
}
const b_ = s => `<b>${s}</b>`;
function activeOrder() { return G && G.custs.find(c => c.id === G.activeId && c.state === 'hung') || null; }
function renderCook() {
  fixActive();
  const C = activeOrder(), show = !!(G && G.cooking && C && G.state === 'play' && !paused);
  $('cook').classList.toggle('hidden', !show);
  $('touch').classList.toggle('hidden', !G || show || screen !== 'play');
  if (!C) return;
  const P = C.P;
  $('ckOrder').innerHTML = `<span class="ckNum" style="background:${C.color}">#${C.num}</span> ${C.remake ? `<span class="ckRe">${L('Remake', 'Rehacer')}</span> ` : ''}${P.money ? L('Supplies for ', 'Compras para ') + P.dish.name : P.dish.name}`;
  $('ckKind').textContent = G.mode === 'practice' ? L('Practice', 'Práctica') : L('Level ', 'Nivel ') + G.level;
  // every order is shown as the same picture (qbarHTML): a recipe bar and an order bar made of equal boxes
  let rec = '', ask = '';
  if (P.kind === 'rate') {
    rec = `<div class="rc market"><div class="rcHead">${L('Market price', 'Precio del mercado')} &middot; ${b_(P.baseN)} ${P.item.q} ${L('cost', 'cuestan')} ${b_('$' + fhtml(P.baseQ))}</div>${qbarHTML(P)}</div>`;
    ask = P.tgtN === 1 ? L(`What does ${b_('1 ' + P.item.one)} cost?`, `¿Cuánto cuesta ${b_('1 ' + P.item.one)}?`)
      : L(`This order needs ${b_(P.tgtN + ' ' + P.item.q)}. What do they cost?`, `Este pedido necesita ${b_(P.tgtN + ' ' + P.item.q)}. ¿Cuánto cuestan?`);
  } else if (P.kind === 'table') {
    const cols = [[P.baseN, P.baseQ]].concat(P.extraCol ? [P.extraCol] : []);
    rec = `<div class="rc"><div class="rcHead">${L('Recipe ratio table', 'Tabla de razones de la receta')}</div><table class="rt"><tr><th>${P.dish.noun}</th>${cols.map(c => `<td>${c[0]}</td>`).join('')}<td class="q">${P.tgtN}</td></tr>` +
      `<tr><th>${P.ing.q}</th>${cols.map(c => `<td>${fhtml(c[1])}</td>`).join('')}<td class="q">?</td></tr></table>${qbarHTML(P)}</div>`;
    ask = L(`How many ${b_(P.ing.q)} for ${b_(P.tgtN + ' ' + nounOf(P, P.tgtN))}?`, `¿${howMany(P.ing)} ${b_(P.ing.q)} para ${b_(P.tgtN + ' ' + nounOf(P, P.tgtN))}?`);
  } else {
    rec = `<div class="rc"><div class="rcHead">${L(`${P.dish.name} recipe`, `Receta: ${P.dish.name}`)}</div>${qbarHTML(P)}</div>`;
    ask = L(`Order #${C.num} wants ${b_(P.tgtN + ' ' + nounOf(P, P.tgtN))}. How many ${b_(P.ing.q)}?`,
      `El pedido #${C.num} quiere ${b_(P.tgtN + ' ' + nounOf(P, P.tgtN))}. ¿${howMany(P.ing)} ${b_(P.ing.q)}?`);
  }
  $('ckRecipe').innerHTML = rec; $('ckAsk').innerHTML = ask;
  // the answer row is the proportion itself: recipe amount / recipe size = [ answer ] / order size
  const per = n => P.money ? `<b>${n}</b> ${n === 1 ? (P.item.short1 || P.item.short.replace(/s$/, '')) : P.item.short}` : `<b>${n}</b> ${nounOf(P, n)}`;
  $('propL').innerHTML = `<span class="pn">${P.money ? '<b>$' + fhtml(P.baseQ) + '</b>' : `<b>${fhtml(P.baseQ)}</b> ${fval(P.baseQ) === 1 ? P.ing.u1 : P.ing.u}`}</span><span class="pd">${per(P.baseN)}</span>`;
  $('propR').innerHTML = per(P.tgtN);
  $('ansPre').textContent = P.money ? '$' : '';
  $('ansUnit').textContent = P.money ? '' : P.ing.u;
  $('ans').setAttribute('aria-label', L('Your answer', 'Tu respuesta') + (P.money ? L(' in dollars', ' en dólares') : L(' in ', ' en ') + P.ing.u));
  requestAnimationFrame(fitCook); setTimeout(fitCook, 150);
  renderWaiting();
}
// while cooking, the card covers part of the dining room - so its top bar shows every waiting customer's patience
function renderWaiting() {
  const el = $('ckWait'); if (!el) return;
  if (!G || !G.cooking || G.mode !== 'run') { el.innerHTML = ''; return; }
  el.innerHTML = G.custs.filter(c => c.arrive >= 1 && c.state !== 'served').sort((a, b) => a.patience - b.patience).map(c => {
    const fr = clamp(c.patience / c.patMax, 0, 1), col = fr > 0.5 ? '#35b24a' : fr > 0.25 ? '#e8a33a' : '#e0483c';
    return `<span class="wChip" title="${L('Order', 'Pedido')} #${c.num}"><b style="background:${c.color}">#${c.num}</b><i><u style="width:${Math.round(fr * 100)}%;background:${col}"></u></i></span>`;
  }).join('');
}
function fitCook() {                                                  // on a really crowded card, shrink the contents a little so nothing is cut off
  const ck = $('cook'), parts = [...ck.children];
  parts.forEach(p => { p.style.zoom = ''; });
  if (ck.classList.contains('hidden')) return;
  for (let z = 1, i = 0; i < 12 && ck.scrollHeight > ck.clientHeight + 1 && z > 0.7; i++) { z *= 0.96; parts.forEach(p => { p.style.zoom = z.toFixed(3); }); }
}

/* ===================== COOKING & SERVING ===================== */
function submit() {
  const C = G && G.cooking ? activeOrder() : null;
  if (!C || paused) return;
  const val = parseAns($('ans').value);
  if (!isFinite(val)) { const a = $('ans'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); return; }
  C.userAns = val; C.result = verdict(C.P, val); C.mistake = C.result === 'ok' ? '' : mistakeOf(C.P, val);
  C.state = 'carry'; C.ansText = $('ans').value.trim();
  const ch = G.chef, inHand = ch.plates.length < MAX_HANDS;
  if (inHand) ch.plates.push(C); else G.pass.push(C);                 // hands full: the plate waits on the counter
  $('ans').value = ''; G.activeId = null;
  sfx.go();
  const next = railOrders();
  if (next.length) {                                                  // more orders on the rail: keep cooking, one after another
    G.activeId = next[0].id; renderRail(); renderCook();
    if (!coarse()) setTimeout(() => $('ans').focus(), 20);
    toast(inHand ? L(`Order #${C.num} is in your hands. Next: order #${next[0].num}.`, `El pedido #${C.num} está en tus manos. Sigue: pedido #${next[0].num}.`)
      : L(`Hands full - order #${C.num} is waiting on the counter. Next: order #${next[0].num}.`, `Manos llenas: el pedido #${C.num} espera en el mostrador. Sigue: pedido #${next[0].num}.`), '');
  } else {
    closeCook();
    const nums = ch.plates.map(c => '#' + c.num).join(L(' and ', ' y '));
    toast(inHand ? L(`Carry ${nums} to ${ch.plates.length > 1 ? 'their tables' : 'the table'}.`, `Lleva ${nums} a ${ch.plates.length > 1 ? 'sus mesas' : 'la mesa'}.`)
      : L(`Hands full - order #${C.num} is waiting on the counter. Serve ${nums} first.`, `Manos llenas: el pedido #${C.num} espera en el mostrador. Primero sirve ${nums}.`), '');
  }
}
function deliver(C) {                                                 // plate on the table: the customer reacts
  const ok = C.result === 'ok', P = C.P, over = C.userAns > fval(P.ans);
  G.chef.plates = G.chef.plates.filter(c => c !== C); C.state = 'served'; C.plated = true; C.react = 0;
  if (!ok) G.chef.worry = 1.8;
  C.mood = ok ? 'happy' : C.result === 'close' ? 'upset' : 'fuming';
  if (ok) {
    C.bubble = pick(ES ? ['¡Perfecto!', '¡Delicioso!', '¡Justo lo que pedí!', '¡5 estrellas!', '¡Qué rico!', '¡Delicioso!']
      : ['Perfect!', 'Delicious!', '¡Delicioso!', 'Just right!', '5 stars!', 'Yum!', '¡Delicioso!']);
    G.correct++; G.served++; G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak); G.stars++;
    if (G.mode === 'run') { totalStars++; store.set('stars', totalStars); }
    const s = SEATS[C.seat], k = depth(s.ty);
    for (let i = 0; i < 5; i++) G.particles.push({ kind: 'star', x: s.tx + rnd(-20, 20), y: s.sy - 140 * k, vx: rnd(-40, 40), vy: -80 - rnd(0, 60), life: 1.2 });
    sfx.good();
    if (G.mode === 'run') {
      const lv = Math.min(MAX_LEVEL, 1 + Math.floor(G.served / ORDERS_PER_LEVEL));
      if (lv > G.level) {
        G.level = lv;
        if (lv > bestLevel) { bestLevel = lv; store.set('best_level', bestLevel); }
        setTimeout(() => toast(L(`🎉 Level ${lv}: ${LEVEL_NAMES[lv - 1]}! Customers come in faster.`, `🎉 ¡Nivel ${lv}: ${LEVEL_NAMES[lv - 1]}! Los clientes llegan más rápido.`), 'good'), 900);
      }
    }
  } else {
    G.wrong++; G.streak = 0;
    if (P.money) C.bubble = over ? (C.result === 'close' ? L('That\'s a bit much...', 'Es un poco caro...') : L('I\'M NOT PAYING THAT!', '¡NO VOY A PAGAR ESO!'))
      : (C.result === 'close' ? L('Hmm, that\'s not right.', 'Mmm, eso no está bien.') : L('THAT\'S NOT EVEN CLOSE!', '¡NI SE ACERCA!'));
    else if (C.result === 'close') C.bubble = over ? L('A little too much...', 'Un poco demasiado...') : L('Hmm, a bit skimpy.', 'Mmm, es muy poquito.');
    else C.bubble = over ? pick(ES ? ['¡ES DEMASIADO!', '¡¿QUÉ ES ESTO?!', '¡NO ME CABE TANTO!'] : ['WAY TOO MUCH!', 'WHAT IS THIS?!', 'I CAN\'T EAT ALL THAT!'])
      : pick(ES ? ['¡¿ES UNA BROMA?!', '¡¿QUÉ ES ESTO?!', '¡¿DÓNDE ESTÁ EL RESTO?!'] : ['IS THIS A JOKE?!', 'WHAT IS THIS?!', 'WHERE\'S THE REST?!']);
    if (C.result === 'off') sfx.fume(); else sfx.bad();
    G.missed.push(Object.assign({}, C));                              // a copy: the order gets remade, so its answer will change
  }
  updateHUD();
}
function finishOrder(C) {                                             // the customer leaves (happy or not) and the table frees up
  G.custs = G.custs.filter(c => c !== C);
  C.walk = C.mood === 'happy' ? -0.3 : -0.5;
  G.leavers.push(C);
}
function openExplain(C) {
  const body = explainHTML(C);                                          // built first, so a problem here can never leave the game stuck
  if (G.cooking) closeCook();
  G.state = 'explain'; G.pending = C; clearKeys(); G.chef.walking = false;
  $('exTitle').innerHTML = (C.result === 'off' ? '😤 ' : '😕 ') + L(`Let's fix order #${C.num}`, `Arreglemos el pedido #${C.num}`);
  $('exBody').innerHTML = body;
  $('explain').classList.remove('hidden'); cardAt = performance.now();
  setTimeout(() => $('btnExNext').focus(), 30);
}
function closeExplain() {
  if (!G || G.state !== 'explain') return;
  $('explain').classList.add('hidden');
  const C = G.pending; G.pending = null; G.state = 'play';
  if (C && G.custs.includes(C)) remakeOrder(C);
  if (G.mode === 'run' && G.reviews >= MAX_REVIEWS) { gameOver(); return; }
  renderCook();
}
/* ===================== THE "HOW TO FIX IT" POP-UP ===================== */
const chip = (txt, col, extra) => { const c = `<span class="chip" style="border-color:${col};color:${col}">${txt}</span>`; return extra ? `<span class="chipWrap">${c}<small class="chipNote">${extra}</small></span>` : c; };
const C_BASE = '#2f80ed', C_OK = '#1e9e57', C_K = '#ff7a1a', C_BAD = '#e04545';
function stepsHTML(P) {
  const { g, a, b, v } = blocksOf(P);
  const Q = x => P.money ? '$' + fhtml(x) : fhtml(x), per = L('for ', 'para ') + (g === 1 ? `1 ${nounOf(P, 1)}` : `${g} ${nounOf(P, g)}`);
  const SF = L('scale factor', 'factor de escala');
  if (P.kind === 'frac') {
    const k = F(P.tgtN, P.baseN);
    return `<div>${chip(P.tgtN, C_OK)} ÷ ${chip(P.baseN, C_BASE)} = ${chip('×' + fhtml(k), C_K, SF)}</div>` +
      `<div>${chip(Q(P.baseQ), C_BASE)} × ${fhtml(k)} = ${chip(Q(P.ans), C_OK)}</div>`;
  }
  if (a === 1) return `<div>${chip(P.tgtN, C_OK)} ÷ ${chip(P.baseN, C_BASE)} = ${chip('×' + b, C_K, SF)}</div><div>${chip(Q(P.baseQ), C_BASE)} × ${b} = ${chip(Q(P.ans), C_OK)}</div>`;
  if (b === 1 && !P.money) return `<div>${chip(P.baseN, C_BASE)} ÷ ${chip(P.tgtN, C_OK)} = ${chip('÷' + a, C_K, SF)}</div><div>${chip(Q(P.baseQ), C_BASE)} ÷ ${a} = ${chip(Q(P.ans), C_OK)}</div>`;
  return `<div>${chip(Q(P.baseQ), C_BASE)} ÷ ${a} = ${chip(Q(v), C_K, P.money ? L('per ', 'por ') + P.item.one : per)}</div>` +
    `<div>${chip(Q(v), C_K)} × ${b} = ${chip(Q(P.ans), C_OK, `${L('for', 'para')} ${P.tgtN} ${nounOf(P, P.tgtN)}`)}</div>`;
}
function mistakeHTML(T) {
  const P = T.P, diff = P.tgtN - P.baseN, noun = nounOf(P, Math.abs(diff)), more = fval(P.ans) > fval(P.baseQ), n = Math.abs(diff);
  const tips = ES ? {
    add: () => `El pedido tiene ${n} ${noun} ${diff > 0 ? 'más' : 'menos'} que ${P.money ? 'el precio de la lista' : 'la receta'}, así que parece que <b>${diff > 0 ? 'sumaste' : 'restaste'} ${n}</b>. Las proporciones no cambian sumando la misma cantidad &mdash; cada cantidad cambia por el <b>mismo factor</b>.`,
    flip: () => `Parece que ${more ? 'dividiste' : 'multiplicaste'} cuando necesitabas ${more ? 'multiplicar' : 'dividir'}. El pedido es ${more ? 'más grande' : 'más pequeño'} que ${P.money ? 'la cantidad de la lista' : 'la receta'}, así que la respuesta tiene que ser ${more ? 'mayor' : 'menor'}.`,
    timesN: () => `Parece que multiplicaste por ${P.tgtN} (el número de ${nounOf(P, P.tgtN)}) en lugar de por el factor de escala.`,
    unit: () => `$${fhtml(fdiv(P.baseQ, F(P.baseN)))} es el precio de solo <b>1</b> ${P.item.one}. Ahora multiplícalo por ${P.tgtN} para todo el pedido.`
  } : {
    add: () => `The order has ${n} ${diff > 0 ? 'more' : 'fewer'} ${noun} than the ${P.money ? 'price listed' : 'recipe'}, so it looks like you <b>${diff > 0 ? 'added' : 'subtracted'} ${n}</b>. Proportions don't change by adding the same amount &mdash; every amount changes by the <b>same factor</b>.`,
    flip: () => `It looks like you ${more ? 'divided' : 'multiplied'} when you needed to ${more ? 'multiply' : 'divide'}. The order is ${more ? 'bigger' : 'smaller'} than the ${P.money ? 'listed amount' : 'recipe'}, so the answer has to be ${more ? 'more' : 'less'}.`,
    timesN: () => `It looks like you multiplied by ${P.tgtN} (the number of ${nounOf(P, P.tgtN)}) instead of by the scale factor.`,
    unit: () => `$${fhtml(fdiv(P.baseQ, F(P.baseN)))} is the price of just <b>one</b> ${P.item.one}. Now multiply it by ${P.tgtN} for the whole order.`
  };
  if (tips[T.mistake]) return `<div class="note">💡 ${tips[T.mistake]()}</div>`;
  const d = Math.round(Math.abs(T.userAns - fval(P.ans)) * 100) / 100, over = T.userAns > fval(P.ans), unit = P.money ? L(' dollars', ' dólares') : ' ' + P.ing.u;
  return `<div class="note">💡 ${L(`You were ${over ? 'over' : 'under'} by ${d}${unit}. Find how many times bigger (or smaller) the order is, then change the amount by that same factor.`,
    `${over ? 'Te pasaste por' : 'Te faltaron'} ${d}${unit}. Halla cuántas veces más grande (o más pequeño) es el pedido y luego cambia la cantidad por ese mismo factor.`)}</div>`;
}
// the tape diagram: the recipe as equal blocks, the order as the same blocks repeated, and the student's amount as a bar underneath
function tapeSVG(P, userVal, compact) {
  const { g, a, b, v } = blocksOf(P), vv = fval(v), userU = clamp(userVal / vv, 0, Math.max(a, b) * 3);
  const X0 = compact ? 118 : 170, span = compact ? 360 : 430, maxU = Math.max(a, b, Math.min(userU, Math.max(a, b) * 2.2)), u = Math.min(64, span / maxU);
  const rowH = compact ? 30 : 36, gap = compact ? 16 : 24, fs = compact ? 12 : 14;
  const cur = P.money ? '$' : '';
  const rows = [
    { lab: P.money ? `${P.baseN} ${nounOf(P, P.baseN)}` : `${L("Recipe", "Receta")}: ${P.baseN} ${nounOf(P, P.baseN)}`, n: a, fill: '#dbe8ff', st: C_BASE, tot: P.baseQ },
    { lab: P.money ? `${P.tgtN} ${nounOf(P, P.tgtN)}` : `${L("Order", "Pedido")}: ${P.tgtN} ${nounOf(P, P.tgtN)}`, n: b, fill: '#d3f5df', st: C_OK, tot: P.ans }
  ];
  let y = 8, out = '';
  rows.forEach(r => {
    out += `<text x="${X0 - 10}" y="${y + rowH / 2 + 5}" text-anchor="end" font-size="${fs}" font-weight="800" fill="#1d2340">${r.lab}</text>`;
    for (let i = 0; i < r.n; i++) {
      out += `<rect x="${X0 + i * u}" y="${y}" width="${u}" height="${rowH}" fill="${r.fill}" stroke="${r.st}" stroke-width="2.5"/>`;
      if (u >= 28) out += svgAmount(v, cur, X0 + i * u + u / 2, y + rowH / 2, 'middle', u >= 44 ? fs : fs - 2, r.st).svg;
    }
    out += svgAmount(r.tot, '= ' + cur, X0 + r.n * u + 8, y + rowH / 2, 'start', fs + 1, r.st).svg;
    y += rowH + gap;
  });
  // the student's amount
  const ok = verdict(P, userVal) === 'ok', col = ok ? C_OK : verdict(P, userVal) === 'close' ? '#e8a33a' : C_BAD;
  const wUser = Math.min(userU, maxU * 1.15) * u, clipped = userU > maxU * 1.15;
  out += `<text x="${X0 - 10}" y="${y + rowH / 2 + 5}" text-anchor="end" font-size="${fs}" font-weight="800" fill="#1d2340">${L("You served", "Serviste")}</text>`;
  out += `<rect x="${X0}" y="${y}" width="${b * u}" height="${rowH}" fill="none" stroke="${C_OK}" stroke-width="2" stroke-dasharray="6 5"/>`;
  out += `<rect x="${X0}" y="${y + 4}" width="${Math.max(3, wUser)}" height="${rowH - 8}" rx="4" fill="${col}" opacity=".85"/>`;
  if (clipped) out += `<path d="M${X0 + wUser - 8},${y + 2} l12,${rowH / 2 - 2} l-12,${rowH / 2 - 2}" fill="${col}"/>`;
  out += `<text x="${X0 + Math.max(wUser, b * u) + 10}" y="${y + rowH / 2 + 5}" font-size="${fs + 1}" font-weight="900" fill="${col}">= ${P.money ? '$' : ''}${Math.round(userVal * 100) / 100}</text>`;
  y += rowH;
  // the "each block = ..." note goes under the diagram as HTML, so its fraction can be drawn stacked
  const eb = L("each block", "cada bloque"), fr = L("for", "para");
  const note = P.money ? `${eb} = $${fhtml(v)} ${fr} 1 ${P.item.one}` : `${eb} = ${fhtml(v)} ${unitWord(P, v)} ${fr} ${g} ${nounOf(P, g)}`;
  return `<svg class="tape" viewBox="0 0 ${X0 + span + 90} ${y + 8}" role="img" aria-label="${L("tape diagram comparing the right amount with yours", "diagrama de cinta que compara la cantidad correcta con la tuya")}">${out}</svg>` +
    `<div class="tapeNote" style="padding-left:${(X0 / (X0 + span + 90) * 100).toFixed(1)}%">${note}</div>`;
}
// the scale factor from the recipe to the order, as it's written on the card: ×4, ÷3, or ×3/2
const kLabel = P => { const k = F(P.tgtN, P.baseN); return k.n === 1 && k.d > 1 ? '÷' + k.d : '×' + fhtml(k); };
// the picture: the recipe card and the order card side by side, the dishes drawn on each, joined by a big "×k" arrow
function scaleCardsHTML(P) {
  const icons = n => P.money ? `<b class="sfBig">${n}</b>` : n <= 12 ? foodIcon(P.dish).repeat(n) : `${foodIcon(P.dish)}<b>&times;${n}</b>`;
  const label = n => P.money ? (n === 1 ? P.item.one : P.item.q) : nounOf(P, n);
  const amt = x => P.money ? `<b>$${fhtml(x)}</b>` : `${ingIcon(P.ing)}<b>${fhtml(x)}</b> ${fval(x) === 1 ? P.ing.u1 : P.ing.u}`;
  const card = (cls, title, n, x) => `<div class="sfCard ${cls}"><div class="sfT">${title}</div><div class="sfIc">${icons(n)}</div>` +
    `<div class="sfN"><b>${n}</b> ${label(n)}</div><div class="sfA">${amt(x)}</div></div>`;
  return `<div class="sfRow">${card('rec', P.money ? L('Price', 'Precio') : L('Recipe', 'Receta'), P.baseN, P.baseQ)}` +
    `<div class="sfArrow"><span class="sfK">${kLabel(P)}</span><span class="sfAr">&#10140;</span><small>${L('scale factor', 'factor de escala')}</small></div>` +
    `${card('ord', P.money ? L('Your order', 'Tu pedido') : L('Order', 'Pedido'), P.tgtN, P.ans)}</div>`;
}
// the math: recipe amount / recipe size = order amount / order size, with a curved "×k" arrow over the tops and
// another under the bottoms, so the same factor is visible on both parts of the ratio
function proportionSVG(P) {
  const Lx = 125, Rx = 395, cy = 70, bar = 96, dy = 128, fs = 30, cw = (s, f) => [...String(s)].length * f * 0.52;
  const k = F(P.tgtN, P.baseN), kIsDiv = k.n === 1 && k.d > 1;
  let out = '';
  const frac = (cx, amount, count, col) => {
    const unit = P.money ? '' : ' ' + (fval(amount) === 1 ? P.ing.u1 : P.ing.u);
    const probe = svgAmount(amount, P.money ? '$' : '', 0, cy, 'start', fs, col), uw = unit ? cw(unit, 21) + 5 : 0, tw = probe.w + uw;
    const start = cx - tw / 2, den = `${count} ${P.money ? (count === 1 ? (P.item.short1 || P.item.short.replace(/s$/, '')) : P.item.short) : nounOf(P, count)}`, dw = cw(den, 21);
    out += svgAmount(amount, P.money ? '$' : '', start, cy, 'start', fs, col).svg;
    if (unit) out += `<text x="${start + probe.w + 7}" y="${cy + 9}" font-size="21" font-weight="800" fill="${col}">${unit}</text>`;
    const half = Math.max(tw, dw) / 2 + 8;
    out += `<line x1="${cx - half}" x2="${cx + half}" y1="${bar}" y2="${bar}" stroke="#1d2340" stroke-width="3" stroke-linecap="round"/>`;
    out += `<text x="${cx}" y="${dy}" text-anchor="middle" font-size="21" font-weight="800" fill="${col}">${den}</text>`;
  };
  frac(Lx, P.baseQ, P.baseN, C_BASE); frac(Rx, P.ans, P.tgtN, C_OK);
  out += `<text x="260" y="${bar + 12}" text-anchor="middle" font-size="40" font-weight="900" fill="#1d2340">=</text>`;
  // the two arrows, each labeled with the scale factor
  const arc = (y0, yc, ly) => {
    out += `<path d="M${Lx + 36} ${y0} Q260 ${yc} ${Rx - 36} ${y0}" fill="none" stroke="${C_K}" stroke-width="3" marker-end="url(#ppArr)"/>`;
    const lab = svgAmount(kIsDiv ? F(k.d) : k, kIsDiv ? '÷' : '×', 0, ly, 'start', 22, C_K), bw = lab.w + 18;
    out += `<rect x="${260 - bw / 2}" y="${ly - 17}" width="${bw}" height="34" rx="9" fill="#fff" stroke="${C_K}" stroke-width="2.5"/>`;
    out += svgAmount(kIsDiv ? F(k.d) : k, kIsDiv ? '÷' : '×', 260 - lab.w / 2, ly, 'start', 22, C_K).svg;
  };
  arc(38, -6, 20); arc(146, 190, 170);
  return `<svg class="propSvg" viewBox="0 0 520 190" role="img" aria-label="${L('proportion with the scale factor', 'proporción con el factor de escala')}">` +
    `<defs><marker id="ppArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C_K}"/></marker></defs>${out}</svg>` +
    `<div class="propNote">${L('Scale factor', 'Factor de escala')} = ${P.tgtN} &divide; ${P.baseN} = <b>${kLabel(P)}</b>. ` +
    L('The top changes by the same factor as the bottom.', 'La parte de arriba cambia por el mismo factor que la de abajo.') + `</div>`;
}
function explainHTML(T) {
  const P = T.P, off = T.result === 'off';
  const you = `${P.money ? '$' : ''}${Math.round(T.userAns * 100) / 100}${P.money ? '' : ' ' + P.ing.u}`;
  return `<div class="verdict"><span class="bad">❌ ${L("You", "Tú")}: ${you} <small>${off ? L("(way off)", "(muy lejos)") : L("(close)", "(cerca)")}</small></span><span class="arrow">➜</span><span class="ok">✅ ${qtyText(P, P.ans)}</span></div>` +
    scaleCardsHTML(P) + proportionSVG(P) + mistakeHTML(T) + tapeSVG(P, T.userAns, true);
}


/* ===================== GAME FLOW ===================== */
function startGame(level) {
  G = newWorld('run', level || 1); orderNo = 0; clearKeys();
  hideOverlays(); showScreen('play'); audioInit();
  toast(level > 1 ? L(`Level ${level}: ${LEVEL_NAMES[level - 1]} - the restaurant is open!`, `Nivel ${level}: ${LEVEL_NAMES[level - 1]} — ¡el restaurante está abierto!`) : L('The restaurant is open! Use ← → to walk.', '¡El restaurante está abierto! Usa ← → para caminar.'), '');
  renderRail(); renderCook(); updateHUD();
}
function startPractice(kinds) {
  G = newWorld('practice', 1, kinds); orderNo = 0; clearKeys();
  hideOverlays(); showScreen('play'); audioInit();
  toast(L('Practice: no rush and no reviews - take your time!', 'Práctica: sin prisa y sin reseñas. ¡Tómate tu tiempo!'), '');
  renderRail(); renderCook(); updateHUD();
}
function gameOver() {
  if (G.cooking) closeCook();
  G.state = 'over'; G.over = true; clearKeys();
  const n = shiftServed(), newBest = n > best;
  if (newBest) { best = n; store.set('best_served', best); }
  if (G.level > bestLevel) { bestLevel = G.level; store.set('best_level', bestLevel); }
  const total = G.correct + G.wrong, acc = total ? Math.round(G.correct / total * 100) : 0;
  $('ovTitle').textContent = L('🚪 The restaurant closed!', '🚪 ¡El restaurante cerró!');
  $('ovSub').textContent = L(`${MAX_REVIEWS} one-star reviews - time to lock up for the night.`, `${MAX_REVIEWS} reseñas de una estrella: hora de cerrar por hoy.`);
  $('ovStats').innerHTML = `<div><b>${n}</b>${L("Orders served", "Pedidos servidos")} ${newBest ? L("🏆 New best!", "🏆 ¡Nuevo récord!") : ""}</div><div><b>${best}</b>${L("Best shift", "Mejor turno")} &middot; ${L("Level", "Nivel")} ${bestLevel}</div>` +
    `<div><b>${G.stars} ⭐</b>${L("Stars this shift", "Estrellas en este turno")}</div><div><b>${acc}%</b>${L("Accuracy", "Precisión")} &middot; ${L("best streak", "mejor racha")} ${G.bestStreak}</div>`;
  renderStarts($('ovContinue'), L('↩ Or start the next shift at:', '↩ O empieza el próximo turno en:'));
  $('ovReview').innerHTML = missedHTML(G.missed);
  hideOverlays(['over']); $('over').classList.remove('hidden'); cardAt = performance.now();
  setTimeout(() => $('btnAgain').focus(), 30);
  renderCook();
}
function missedHTML(list) {
  const last = list.slice(-4);
  if (!last.length) return `<p>${L("🎉 No wrong orders - the customers just got tired of waiting. Try to move faster!", "🎉 Ningún pedido equivocado: los clientes solo se cansaron de esperar. ¡Intenta moverte más rápido!")}</p>`;
  return `<p style="text-align:left;font-weight:800;margin:6px 0 2px">📝 ${L("Orders you missed", "Pedidos que fallaste")}${list.length > last.length ? ` (${L("last", "últimos")} ${last.length})` : ""}:</p><div class="review">` +
    last.map(T => `<div class="miss"><div class="missHead">#${T.num} &middot; ${T.P.money ? L("Supplies", "Compras") : T.P.dish.name}</div>${tapeSVG(T.P, T.userAns, true)}` +
      `<div class="missLine"><span class="bad">❌ ${T.P.money ? '$' : ''}${Math.round(T.userAns * 100) / 100}</span> ➜ <span class="ok">✅ ${qtyText(T.P, T.P.ans)}</span></div></div>`).join('') + '</div>';
}
function renderStarts(el, head) {
  let h = `<p class="startsHead">${head}</p><div class="starts">`;
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    if (lv === 1) h += `<button type="button" class="btn ghost start" data-lv="1">${L("↺ Start Over", "↺ Empezar de nuevo")}</button>`;
    else h += lv <= bestLevel ? `<button type="button" class="btn alt start" data-lv="${lv}">${L("Level", "Nivel")} ${lv}</button>` : `<span class="start locked" title="${L(`Reach level ${lv} in a shift to unlock it`, `Llega al nivel ${lv} en un turno para desbloquearlo`)}">🔒 ${L("Level", "Nivel")} ${lv}</span>`;
  }
  el.innerHTML = h + '</div>';
  el.onclick = e => { const b = e.target.closest('button[data-lv]'); if (b) startGame(+b.dataset.lv); };
}
function buildMenu() {
  $('mStars').textContent = totalStars; $('mBest').textContent = best; $('mBestLevel').textContent = bestLevel;
  $('btnStart').textContent = bestLevel > 1 ? L(`▶ Continue · Level ${bestLevel}`, `▶ Continuar · Nivel ${bestLevel}`) : L('Open the restaurant!', '¡Abre el restaurante!');
  renderStarts($('menuStarts'), L('📍 Or start at:', '📍 O empieza en:'));
}
function toMenu() { setPaused(false); G = null; hideOverlays(); buildMenu(); showScreen('menu'); renderCook(); $('rail').innerHTML = ''; }
function showScreen(name) {
  screen = name;
  ['title', 'menu', 'practice'].forEach(id => $(id).classList.toggle('hidden', id !== name));
  $('sb').classList.toggle('playing', name === 'play');
  const f = { title: 'btnPlay', menu: 'btnStart', practice: 'btnPracStart' }[name];
  if (f) setTimeout(() => { const el = $(f); if (el && el.offsetParent !== null && !el.disabled) el.focus(); }, 30);
  if (name !== 'play') { $('cook').classList.add('hidden'); $('touch').classList.add('hidden'); }
}
function hideOverlays(keep) { ['over', 'explain', 'pause', 'exitConfirm'].forEach(id => { if (!keep || !keep.includes(id)) $(id).classList.add('hidden'); }); }


/* ---- practice picker ---- */
let practicePicked = (() => { const s = store.get('practice_types', null); return Array.isArray(s) ? s.filter(id => PRACTICE_TYPES.some(t => t.id === id)) : []; })();   // nothing picked until the student chooses
function sampleText(kind) {
  const P = genProblem(kind);
  if (P.money) return `${P.baseN} ${P.item.short} = $${fstr(P.baseQ)} &rarr; ${P.tgtN} = ?`;
  return `${P.baseN} ${P.dish.noun} &rarr; ${fhtml(P.baseQ)} ${P.ing.u}<br>${P.tgtN} ${nounOf(P, P.tgtN)} &rarr; ?`;
}
function renderPractice() {
  const grid = $('ptypes'); grid.innerHTML = '';
  const LC = ['#2f80ed', '#1e9e57', '#f2994a', '#9b51e0', '#e0245e'];
  PRACTICE_TYPES.forEach(t => {
    const on = practicePicked.includes(t.id), lc = LC[t.level - 1];
    const card = document.createElement('button'); card.type = 'button';
    card.className = 'ptype' + (on ? ' on' : ''); card.setAttribute('role', 'checkbox'); card.setAttribute('aria-checked', on ? 'true' : 'false');
    card.style.borderLeftColor = lc; card.style.borderLeftWidth = '8px';
    card.innerHTML = `<span class="pcheck">${on ? '✓' : ''}</span><span class="plevel" style="color:${lc}">${L("Level", "Nivel")} ${t.level}</span><span class="pname">${t.name}</span><span class="pdesc">${t.desc}</span><span class="psample">${sampleText(t.id)}</span>`;
    card.onclick = () => {
      practicePicked = practicePicked.includes(t.id) ? practicePicked.filter(id => id !== t.id) : practicePicked.concat(t.id);
      store.set('practice_types', practicePicked); renderPractice(); grid.children[PRACTICE_TYPES.indexOf(t)].focus();
    };
    grid.appendChild(card);
  });
  const n = practicePicked.length, b = $('btnPracStart');
  b.disabled = n === 0; b.textContent = n === 0 ? L('Pick at least one skill', 'Elige al menos una destreza') : L(`Start Practice (${n} skill${n > 1 ? "s" : ""})`, `Empezar práctica (${n} destreza${n > 1 ? "s" : ""})`);
}


/* ===================== WALKING TO A CLICKED SPOT (around tables and the counter) ===================== */
const GRID = 16, GCOLS = Math.ceil(W / GRID), GROWS = Math.ceil((H - FLOOR_Y) / GRID);
const cellXY = (c, r) => ({ x: c * GRID + GRID / 2, y: FLOOR_Y + r * GRID + GRID / 2 });
const cellFree = (c, r) => { const p = cellXY(c, r); return c >= 0 && r >= 0 && c < GCOLS && r < GROWS && p.x >= 24 && p.x <= W - 24 && p.y >= FLOOR_Y + 14 && p.y <= H - 14 && !blocked(p.x, p.y); };
function clearLine(a, b) { const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6); for (let i = 1; i <= n; i++) if (blocked(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)) return false; return true; }
function findPath(from, to) {                                         // breadth-first search on a grid, then straightened out
  if (clearLine(from, to)) return [{ x: to.x, y: to.y }];
  const cell = p => [clamp(Math.floor(p.x / GRID), 0, GCOLS - 1), clamp(Math.floor((p.y - FLOOR_Y) / GRID), 0, GROWS - 1)];
  const [sc, sr] = cell(from), [tc, tr] = cell(to), id = (c, r) => r * GCOLS + c, prev = new Map([[id(sc, sr), -1]]), q = [[sc, sr]];
  while (q.length) {
    const [c, r] = q.shift();
    if (c === tc && r === tr) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc, nr = r + dr, k = id(nc, nr);
      if (prev.has(k) || !cellFree(nc, nr) || (dc && dr && (!cellFree(c + dc, r) || !cellFree(c, r + dr)))) continue;
      prev.set(k, id(c, r)); q.push([nc, nr]);
    }
  }
  if (!prev.has(id(tc, tr))) return null;
  const pts = [{ x: to.x, y: to.y }];
  for (let k = prev.get(id(tc, tr)); k !== -1 && k !== id(sc, sr); k = prev.get(k)) pts.unshift(cellXY(k % GCOLS, Math.floor(k / GCOLS)));
  const out = []; let at = from;                                       // skip corners that can be cut in a straight line
  for (let i = 0; i < pts.length; i++) { if (i === pts.length - 1 || !clearLine(at, pts[i + 1])) { out.push(pts[i]); at = pts[i]; } }
  return out;
}

/* ===================== UPDATE ===================== */
function walkToward(o, kx, ky, to, step) {                           // move o[kx], o[ky] toward `to`; true once it's there
  const dx = to.x - o[kx], dy = to.y - o[ky], d = Math.hypot(dx, dy);
  if (d <= step) { o[kx] = to.x; o[ky] = to.y; return true; }
  o[kx] += dx / d * step; o[ky] += dy / d * step; o.wdir = dx < 0 ? -1 : 1;
  return false;
}
function update(dt) {
  if (!G) { titleT += dt; return; }
  G.t += dt;
  const ch = G.chef;
  if (ch.worry > 0) ch.worry -= dt;
  for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'star') p.vy += 160 * dt; p.life -= dt; }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const L of G.leavers) {                                         // customers heading out the door (walk < 0 = still sitting there)
    if (L.walk < 0) { L.walk += dt; continue; }
    if (L.lx === undefined) { L.lx = SEATS[L.seat].tx; L.ly = SEATS[L.seat].sy; }
    L.gone = walkToward(L, 'lx', 'ly', DOOR, (L.mood === 'happy' ? 150 : 230) * dt);
  }
  G.leavers = G.leavers.filter(L => !L.gone);
  for (const C of G.custs) {
    if (C.arrive < 1 && walkToward(C, 'wx', 'wy', { x: SEATS[C.seat].tx, y: SEATS[C.seat].sy }, 170 * dt)) C.arrive = 1;   // walking in from the door
    if (C.state === 'served') C.react += dt;
  }
  if (G.state !== 'play') return;
  // the chef walks with the arrow keys (or toward a spot that was clicked / tapped) - not while cooking at the stove
  let vx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), vy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (ch.target) { ch.path = findPath(ch, ch.target); ch.target = null; }
  if (vx || vy) ch.path = null;
  else if (ch.path && ch.path.length) {
    const p = ch.path[0], dx = p.x - ch.x, dy = p.y - ch.y;
    if (Math.hypot(dx, dy) < 5) { ch.path.shift(); if (!ch.path.length) ch.path = null; }
    else { vx = dx / CHEF_SPEED; vy = dy / CHEF_SPEED_Y; }
  }
  if (G.cooking || paused) vx = vy = 0;
  // pushing into the kitchen counter (from inside or outside the kitchen): walk along it to the way through at its right end
  if (vy && !ch.path && ch.x < COUNTER.x + 8 && ch.y > COUNTER.y0 - 20 && ch.y < COUNTER.y1 + 20 && blocked(ch.x, ch.y + Math.sign(vy) * 4)) { vx = 1; vy = 0; }
  const n = Math.hypot(vx, vy);
  ch.walking = n > 0;
  if (n) {
    vx /= n; vy /= n;
    if (Math.abs(vx) > 0.2) ch.dir = Math.sign(vx);
    const nx = clamp(ch.x + vx * CHEF_SPEED * dt, 24, W - 24), ny = clamp(ch.y + vy * CHEF_SPEED_Y * dt, FLOOR_Y + 14, H - 14);
    let moved = false;
    if (!blocked(nx, ch.y)) { moved = moved || nx !== ch.x; ch.x = nx; }
    if (!blocked(ch.x, ny)) { moved = moved || ny !== ch.y; ch.y = ny; }
    if (!moved && !ch.path) {
      // bumped straight into a table or the counter: slide around its edge (toward whichever side is nearer) instead of stopping dead
      const o = obstacleNear(ch.x, ch.y), sx = CHEF_SPEED * dt, sy = CHEF_SPEED_Y * dt;
      if (o && vx && !vy) { const s = ch.y < o.y ? -1 : 1; for (const d of [s, -s]) if (!blocked(ch.x, ch.y + d * sy)) { ch.y += d * sy; moved = true; break; } }
      else if (o && vy && !vx) { const s = ch.x < o.x ? -1 : 1; for (const d of [s, -s]) if (!blocked(ch.x + d * sx, ch.y)) { ch.x += d * sx; moved = true; break; } }
      else if (o && !o.rx && vy) { if (!blocked(ch.x + sx, ch.y)) { ch.x += sx; moved = true; } }   // pushing into the kitchen counter: slide toward the way out
      else if (o && o.rx) {                                             // walking diagonally into a table: glide along its edge
        const nx0 = (ch.x - o.x) / (o.rx * o.rx), ny0 = (ch.y - o.y) / (o.ry * o.ry), nl = Math.hypot(nx0, ny0) || 1;
        let tx = -ny0 / nl, ty = nx0 / nl;                              // go around whichever side of the table is nearer
        if (Math.abs(vy) >= Math.abs(vx) ? tx * (ch.x - o.x) < 0 : ty * (ch.y - o.y) < 0) { tx = -tx; ty = -ty; }
        for (const f of [1, 0.6, 0.3]) { const gx = clamp(ch.x + tx * sy * f + nx0 / nl * 2, 24, W - 24), gy = clamp(ch.y + ty * sy * f + ny0 / nl * 2, FLOOR_Y + 14, H - 14); if (!blocked(gx, gy)) { ch.x = gx; ch.y = gy; moved = true; break; } }
      }
    }
    if (!moved) { ch.path = null; ch.walking = false; }               // walked into a wall
  }
  if (inKitchen() && ch.notepad.length) hangOrders();
  if (G.cooking && (G.waitT = (G.waitT || 0) + dt) > 0.3) { G.waitT = 0; renderWaiting(); }
  // customers slowly lose patience from the moment they sit down until their food arrives
  if (G.mode === 'run') for (const C of G.custs.slice()) {
    if (C.arrive < 1 || C.state === 'served') continue;
    C.patience -= dt;
    if (C.patience <= 0) walkOut(C);
  }
  // after a customer reacts: happy ones leave, wrong orders get the "let's fix it" pop-up
  for (const C of G.custs.slice()) {
    if (C.state !== 'served' || C.handled || C.react < 1.7) continue;
    C.handled = true;
    if (C.result === 'ok') finishOrder(C); else { openExplain(C); return; }
  }
  // new customers: all shift long during a shift; one at a time in Practice
  if (G.mode === 'run') {
    G.nextT -= dt;
    if (G.nextT <= 0) {
      if (spawnCustomer()) { G.arrivals++; G.nextT = G.arrivals === 1 ? 7 : ARRIVE_SEC[G.level - 1] * (0.85 + Math.random() * 0.3); }
      else G.nextT = 1;                                               // every table is full - try again in a second
    }
  } else if (!G.custs.length) { G.nextT -= dt; if (G.nextT <= 0) { spawnCustomer(); G.nextT = 0.8; } }
  if (G.mode === 'run' && G.reviews >= MAX_REVIEWS && !G.custs.some(c => c.state === 'served' && !c.handled) && !G.leavers.some(l => l.walk < 0)) gameOver();
}
/* ===================== DRAWING ===================== */
let titleT = 0;
function rr(x, y, w, h, r, fill, stroke, lw) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); } }
function circ(x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); } }
function ell(x, y, rx, ry, fill, stroke, lw) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); } }
const OL = '#2a2320';

const VP = { x: 480, y: -260 };                                      // the floor's vanishing point (planks and tiles run toward it)
const rayX = (x0, y) => VP.x + (x0 - VP.x) * (y - VP.y) / (H - VP.y); // a floor line that meets the front edge at x0, at depth y
const FLOOR_ROWS = [FLOOR_Y, 216, 234, 255, 278, 304, 333, 366, 403, 445, 492, H];   // depths of the floor seams, wider apart up front
function drawRoom(t) {
  // back wall: the dining room, with the kitchen's tiled wall at the left
  ctx.fillStyle = '#fbe7d4'; ctx.fillRect(0, 0, W, FLOOR_Y);
  ctx.fillStyle = '#f3d4bb'; for (let x = KITCHEN.x + 14; x < W; x += 40) ctx.fillRect(x, 0, 18, FLOOR_Y);
  ctx.fillStyle = '#c98a52'; ctx.fillRect(KITCHEN.x, 158, W - KITCHEN.x, FLOOR_Y - 158); ctx.fillStyle = '#b77c4a'; ctx.fillRect(KITCHEN.x, 156, W - KITCHEN.x, 5);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, KITCHEN.x, FLOOR_Y);
  ctx.strokeStyle = '#e3e7ee'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let y = 130; y < FLOOR_Y; y += 14) { ctx.moveTo(0, y); ctx.lineTo(KITCHEN.x, y); }
  for (let x = 0; x < KITCHEN.x; x += 20) { ctx.moveTo(x, 130); ctx.lineTo(x, FLOOR_Y); } ctx.stroke();
  ctx.fillStyle = '#e0483c'; for (let x = 0, i = 0; x < KITCHEN.x; x += 16, i++) ctx.fillRect(x, i % 2 ? 122 : 128, 16, 6);
  ctx.fillStyle = '#8f9aa8'; ctx.fillRect(8, 16, 532, 7); circ(8, 19, 5, '#6b7686'); circ(540, 19, 5, '#6b7686');       // the ticket rail
  ctx.fillStyle = '#8a5a2a'; ctx.fillRect(KITCHEN.x - 6, 0, 12, FLOOR_Y);                                              // post between kitchen and dining room
  ctx.fillStyle = '#2a2320'; ctx.font = '900 13px Fredoka, Trebuchet MS'; ctx.textAlign = 'center';
  rr(300, 132, 84, 22, 5, '#2f3b33', '#8a5a2a', 3); ctx.fillStyle = '#ffc83d'; ctx.fillText(L('KITCHEN', 'COCINA'), 342, 148);
  // kitchen things against the back wall: shelf of jars, fridge, stove
  rr(96, 104, 190, 5, 2, '#6b4423');
  ['#fff8ec', '#ffffff', '#f3e0b0', '#ffe9ef', '#e8f3ff'].forEach((c, i) => rr(104 + i * 36, 80, 24, 24, 5, c, '#b9a67a', 1.5));
  ctx.save(); ctx.translate(50, 206); ctx.scale(0.62, 0.62);
  rr(-40, -180, 80, 180, 8, '#e8eef5', OL, 2); ctx.fillStyle = OL; ctx.fillRect(-40, -110, 80, 2); rr(26, -170, 6, 40, 3, '#9aa3b5'); rr(26, -100, 6, 50, 3, '#9aa3b5');
  ctx.restore();
  ctx.save(); ctx.translate(200, 208); ctx.scale(0.64, 0.64);
  rr(-66, -70, 132, 70, 4, '#3a3f4a', OL, 2); rr(-70, -78, 140, 10, 3, '#5a6070', OL, 2); rr(-44, -54, 88, 36, 4, '#1c1f26', '#8f9aa8', 2);
  [-50, -30, 30, 50].forEach(x => circ(x, -62, 4, '#d0d4dc')); ellipsePot(-26, -80, t); rr(12, -92, 48, 14, 6, '#2a2320'); rr(58, -88, 26, 5, 2, '#2a2320');
  ctx.restore();
  // the dining room's back wall: window, sign, and the front door customers use
  rr(500, 40, 120, 86, 4, '#bfe3f5');
  ctx.save(); ctx.beginPath(); ctx.rect(500, 40, 120, 86); ctx.clip();                   // the cloud drifts past behind the glass
  const cx = 470 + ((t * 12) % 190); ell(cx, 66, 14, 6, '#ffffff'); ell(cx + 11, 62, 9, 5, '#ffffff');
  ctx.restore();
  rr(500, 40, 120, 86, 4, null, '#8a6a4a', 5); ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(560, 40); ctx.lineTo(560, 126); ctx.moveTo(500, 83); ctx.lineTo(620, 83); ctx.stroke();
  rr(668, 50, 90, 64, 3, '#fff8ec', '#6b4423', 5); ctx.font = '900 18px Fredoka, Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillStyle = '#e0483c'; ctx.fillText('★★★★★', 713, 88);
  ctx.fillStyle = '#6b4a2a'; ctx.font = '800 9px Fredoka, Trebuchet MS'; ctx.fillText('PROPORTIONAL', 713, 102); ctx.fillText('PLATES', 713, 111);
  rr(DOOR.x - 36, 84, 72, FLOOR_Y - 84 + 2, 4, '#8a5a2a', OL, 2); rr(DOOR.x - 28, 92, 56, FLOOR_Y - 92, 3, '#a8703f');
  rr(DOOR.x - 20, 100, 40, 40, 4, '#bfe3f5', '#6b4423', 2); circ(DOOR.x + 20, 150, 3, '#ffc83d');
  rr(DOOR.x - 22, 64, 44, 16, 4, '#2a9d8f', '#fff', 1.5); ctx.fillStyle = '#fff'; ctx.font = '900 10px Fredoka, Trebuchet MS'; ctx.fillText(L('OPEN', 'ABIERTO'), DOOR.x, 76);
  // the floor: wooden planks in the dining room, checkered tiles in the kitchen, all running toward the vanishing point
  ctx.fillStyle = '#b77c4a'; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  ctx.strokeStyle = 'rgba(80,45,20,.28)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let x0 = -1200; x0 < W + 1200; x0 += 90) { ctx.moveTo(rayX(x0, FLOOR_Y), FLOOR_Y); ctx.lineTo(x0, H); }
  FLOOR_ROWS.forEach((y, i) => { if (i % 2) { ctx.moveTo(0, y); ctx.lineTo(W, y); } }); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(0, FLOOR_Y, KITCHEN.x, KITCHEN.y - FLOOR_Y); ctx.clip();
  const rows = [FLOOR_Y, 219, 240, 263, 288, KITCHEN.y + 20];
  for (let r = 0; r < rows.length - 1; r++) for (let c = -12; c < 12; c++) {
    const a = c * 60, b = a + 60, y0 = rows[r], y1 = rows[r + 1];
    ctx.beginPath(); ctx.moveTo(rayX(a, y0), y0); ctx.lineTo(rayX(b, y0), y0); ctx.lineTo(rayX(b, y1), y1); ctx.lineTo(rayX(a, y1), y1); ctx.closePath();
    ctx.fillStyle = (r + c) % 2 ? '#f4efe6' : '#e0483c'; ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, FLOOR_Y, W, 4);
}
// the kitchen's front counter (drawn in depth order, so the chef can stand behind it)
function drawCounter() {
  const kb = depth(COUNTER.y0), kf = depth(COUNTER.y1), hb = 72 * kb, hf = 72 * kf, x1 = COUNTER.x, top0 = COUNTER.y0 - hb, top1 = COUNTER.y1 - hf;
  ctx.beginPath(); ctx.moveTo(0, top0); ctx.lineTo(x1 - 4, top0); ctx.lineTo(x1, top1); ctx.lineTo(0, top1); ctx.closePath(); ctx.fillStyle = '#e8c08f'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#c98a52'; ctx.fillRect(0, top1, x1, COUNTER.y1 - top1); ctx.strokeRect(0, top1, x1, COUNTER.y1 - top1);
  ctx.strokeStyle = 'rgba(90,50,20,.3)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 56; x < x1; x += 70) { ctx.moveTo(x, top1 + 6); ctx.lineTo(x, COUNTER.y1 - 6); } ctx.stroke();
  // a service bell and a stack of clean plates on top
  ell(236, top1 - 8, 12, 4, '#9aa3b5', OL, 1); ctx.beginPath(); ctx.arc(236, top1 - 9, 9, Math.PI, 0); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke(); circ(236, top1 - 19, 2.5, '#ffd23f', OL, 1);
  for (let i = 0; i < 4; i++) ell(60, top1 - 6 - i * 3.5, 20, 5, '#ffffff', '#9a9a9a', 1);
  drawPassPlates();
}
function ellipsePot(x, y, t) {
  rr(x - 26, y - 22, 52, 26, 6, '#9aa3b5', OL, 2); rr(x - 30, y - 26, 60, 7, 3, '#b8c0cf', OL, 2);
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) { const p = (t * 0.8 + i / 3) % 1, sx = x - 12 + i * 12; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.moveTo(sx, y - 30 - p * 40); ctx.quadraticCurveTo(sx + 8, y - 40 - p * 40, sx, y - 50 - p * 40); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
// a round table seen at an angle, in local units (the floor under it is y = 0); the customer sits behind it
function drawTableTop() {
  ell(0, -3, 26, 7, 'rgba(0,0,0,.18)'); ell(0, -4, 20, 5.5, '#6b4423'); rr(-5, -64, 10, 60, 3, '#6b4423');
  ell(0, -63, 48, 14, '#8a5a2a', OL, 1.5); ell(0, -67, 48, 14, '#fff8ec', OL, 1.5);
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -67, 48, 14, 0, 0, Math.PI * 2); ctx.clip();          // a checked tablecloth
  ctx.fillStyle = 'rgba(224,72,60,.35)'; for (let i = -6; i <= 6; i += 2) { ctx.fillRect(i * 8, -85, 8, 36); } ctx.fillRect(-48, -73, 96, 6); ctx.fillRect(-48, -63, 96, 6);
  ctx.restore(); ell(0, -67, 48, 14, null, OL, 1.5);
}

// one muffin standing with the bottom of its paper liner at (x, y): a pleated liner, a golden domed top, two berries
function drawMuffin(x, y) {
  ctx.beginPath(); ctx.moveTo(x - 7, y - 9); ctx.lineTo(x + 7, y - 9); ctx.lineTo(x + 5.5, y); ctx.lineTo(x - 5.5, y); ctx.closePath();
  ctx.fillStyle = '#e9c27a'; ctx.fill(); ctx.strokeStyle = '#8a5a22'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(138,90,34,.55)'; ctx.lineWidth = 0.8; ctx.beginPath();
  for (const dx of [-3.5, 0, 3.5]) { ctx.moveTo(x + dx, y - 8); ctx.lineTo(x + dx * 0.85, y - 1); } ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 9, y - 8); ctx.quadraticCurveTo(x - 9, y - 19, x, y - 19); ctx.quadraticCurveTo(x + 9, y - 19, x + 9, y - 8); ctx.closePath();
  ctx.fillStyle = '#c98a3f'; ctx.fill(); ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 1.2; ctx.stroke();
  circ(x - 3, y - 13, 1.4, '#4a4ab0'); circ(x + 3.5, y - 15, 1.4, '#4a4ab0');
}
// the food itself, sized by what was actually made (ratio 1 = the right amount)
function drawFood(P, ratio, x, y, val) {
  if (P.money) {                                                    // a bill instead of food
    ctx.save(); ctx.translate(x, y - 16); ctx.rotate(-0.08);
    rr(-22, -18, 44, 34, 3, '#ffffff', '#6b6152', 1.5); ctx.fillStyle = '#6b6152'; ctx.font = '800 8px Fredoka, Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText(L('BILL', 'CUENTA'), 0, -8);
    ctx.fillStyle = ratio === 1 ? '#1e9e57' : '#e04545'; ctx.font = '900 12px Fredoka, Trebuchet MS'; ctx.fillText('$' + (Math.round(val * 100) / 100), 0, 9); ctx.restore(); return;
  }
  ell(x, y, 28, 6, '#ffffff', '#9a9a9a', 1.5);
  const f = P.dish.food;
  if (f === 'stack' || f === 'pile') {
    const n = clamp(Math.round(4 * ratio), 1, 18);
    for (let i = 0; i < n; i++) {
      if (f === 'stack') {
        const lean = i > 7 ? (i - 7) * 4 : 0, fall = i > 11;
        if (fall) { ell(x + 34 + (i - 12) * 12, FEET - 4 - (i % 2) * 5, 14, 5, '#e3a857', '#8a5a22', 1.5); continue; }
        ell(x + lean, y - 4 - i * 6, 20, 5, '#e3a857', '#8a5a22', 1.5);
      } else {
        const row = [3, 3, 2, 2, 1, 1], per = []; let k = i, r = 0; while (r < row.length && k >= row[r]) { k -= row[r]; r++; }
        if (r >= row.length) { drawMuffin(x + 36 + (i % 4) * 13, FEET - 4 - (i % 2) * 4); continue; }
        const mx = x + (k - (row[r] - 1) / 2) * 15, my = y - 7 - r * 10;
        drawMuffin(mx, my + 6); per.push(0);
      }
    }
    if (f === 'stack') { const top = Math.min(n, 8); rr(x - 5 + (top > 7 ? 10 : 0), y - 8 - (top - 1) * 6, 10, 5, 2, '#fff3a8'); }
  } else if (f === 'bowl') {
    ctx.beginPath(); ctx.moveTo(x - 24, y - 16); ctx.quadraticCurveTo(x, y + 12, x + 24, y - 16); ctx.closePath(); ctx.fillStyle = '#f4f1ea'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke();
    const lvl = clamp(ratio, 0.08, 1); ell(x, y - 16 + (1 - lvl) * 8, 22 * (0.6 + 0.4 * lvl), 3.5, '#d9432f');
    if (ratio > 1.1) { ctx.fillStyle = '#d9432f'; const k = clamp(Math.round((ratio - 1) * 5), 1, 8); for (let i = 0; i < k; i++) { rr(x - 26 + (i % 2) * 50, y - 16 + i * 4, 4, 10 + i * 3, 2, '#d9432f'); } ell(x, FEET - 2, 16 + k * 6, 3.5, 'rgba(217,67,47,.8)'); }
  } else {                                                          // a drink
    const col = P.dish.color || '#ffe066';
    ctx.beginPath(); ctx.moveTo(x - 12, y - 46); ctx.lineTo(x + 12, y - 46); ctx.lineTo(x + 9, y - 2); ctx.lineTo(x - 9, y - 2); ctx.closePath(); ctx.fillStyle = 'rgba(210,235,255,.55)'; ctx.fill();
    const lvl = clamp(ratio, 0.06, 1), top = y - 2 - 42 * lvl;
    ctx.beginPath(); ctx.moveTo(x - 9 - 3 * lvl, top); ctx.lineTo(x + 9 + 3 * lvl, top); ctx.lineTo(x + 9, y - 2); ctx.lineTo(x - 9, y - 2); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 12, y - 46); ctx.lineTo(x + 12, y - 46); ctx.lineTo(x + 9, y - 2); ctx.lineTo(x - 9, y - 2); ctx.closePath(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke();
    if (ratio > 1.1) { const k = clamp(Math.round((ratio - 1) * 5), 1, 8); ctx.fillStyle = col; for (let i = 0; i < k; i++) rr(x + 10 + (i % 2) * 3, y - 44 + i * 5, 4, 8, 2, col); ell(x + 6, FEET - 2, 14 + k * 7, 3.5, col); }
  }
}

function drawHair(look, hx, hy) {
  ctx.fillStyle = look.hair; ctx.strokeStyle = OL; ctx.lineWidth = 1;
  const s = look.style;
  if (s === 'bald') return;
  ctx.beginPath(); ctx.arc(hx, hy - 2, 18, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(hx, hy - 12, hx - 18, hy - 4); ctx.fill();
  if (s === 'long') { rr(hx - 20, hy - 6, 7, 30, 3, look.hair); rr(hx + 13, hy - 6, 7, 30, 3, look.hair); }
  if (s === 'bun') circ(hx, hy - 22, 8, look.hair);
  if (s === 'curly') for (let i = -2; i <= 2; i++) circ(hx + i * 8, hy - 16 + Math.abs(i) * 3, 6, look.hair);
  if (s === 'pony') { rr(hx + 14, hy - 10, 8, 22, 4, look.hair); }
}
function bubble(x, y, text, mood) {
  ctx.font = `900 ${mood === 'fuming' ? 16 : 14}px Fredoka, Trebuchet MS`; const w = ctx.measureText(text).width + 22, h = 28;
  const m = ctx.getTransform(), px = cv.width / W, sx = m.a / px, ox = m.e / px;   // keep the bubble on screen (it may be drawn scaled)
  const bx = clamp(x - w / 2 - 20, (4 - ox) / sx, (W - 4 - ox) / sx - w), by = y - h - 16;
  const col = mood === 'happy' ? '#1e9e57' : mood === 'fuming' ? '#e0483c' : '#8a5a2a';
  rr(bx, by, w, h, 12, '#ffffff', col, mood === 'fuming' ? 3 : 2);
  ctx.beginPath(); ctx.moveTo(x - 6, by + h - 1); ctx.lineTo(x + 2, by + h + 12); ctx.lineTo(x + 6, by + h - 1); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = col; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 5, by + h - 3, 10, 4);
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(text, bx + w / 2, by + 19);
}
function drawParticles() {
  for (const p of G.particles) {
    ctx.globalAlpha = clamp(p.life * 1.4, 0, 1);
    if (p.kind === 'star') { ctx.fillStyle = '#ffc83d'; ctx.font = '900 20px Fredoka, Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText('★', p.x, p.y); }
    else if (p.kind === 'review') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-0.15); rr(-30, -16, 60, 32, 5, '#fff', '#e0483c', 3); ctx.fillStyle = '#e0483c'; ctx.font = '900 14px Fredoka, Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText('1★', 0, -1); ctx.font = '800 7.5px Fredoka, Trebuchet MS'; ctx.fillStyle = '#6b4a2a'; ctx.fillText(L('REVIEW', 'RESEÑA'), 0, 10); ctx.restore(); }
  }
  ctx.globalAlpha = 1;
}
function drawChairBack() { rr(-28, -150, 56, 86, 14, '#8a5a2a', OL, 1.5); rr(-20, -142, 40, 60, 10, '#a8703f'); }   // behind the customer, local units

function drawChef(ch, t, stir) {
  const x = ch.x, f = FEET, sw = ch.walking ? Math.sin(t * 14) * 0.35 : 0, bob = ch.walking ? Math.abs(Math.sin(t * 14)) * 2 : 0;
  const plates = ch.plates || [], C = plates[0], C2 = plates[1], worried = ch.worry > 0;
  ctx.save(); ctx.translate(x, f); ctx.scale(ch.dir, 1);
  ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(-6, -42); ctx.rotate(sw); rr(-6, 0, 12, 42, 4, '#1b2a4a'); ctx.restore();
  ctx.save(); ctx.translate(6, -42); ctx.rotate(-sw); rr(-6, 0, 12, 42, 4, '#1b2a4a'); ctx.restore();
  ctx.translate(0, -bob);
  rr(-20, -112, 40, 74, 11, '#ffffff', '#c9c9c9', 2); ctx.fillStyle = '#e0483c'; ctx.fillRect(-20, -76, 40, 34);
  circ(-4, -100, 2, '#c9c9c9'); circ(-4, -90, 2, '#c9c9c9');
  circ(0, -130, 17, '#f1c08a', OL, 1.5);
  ctx.beginPath(); ctx.moveTo(-15, -137); ctx.quadraticCurveTo(-17, -166, 0, -164); ctx.quadraticCurveTo(17, -166, 15, -137); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#1b2a4a'; ctx.fillRect(-16, -144, 32, 8);
  circ(7, -132, 2, OL);
  ctx.strokeStyle = OL; ctx.lineWidth = 1.6; ctx.beginPath();
  if (worried) ctx.arc(9, -119, 4, Math.PI * 1.1, Math.PI * 1.9); else ctx.arc(8, -124, 5, 0.2, Math.PI - 0.6);
  ctx.stroke();
  if (worried) { ctx.beginPath(); ctx.moveTo(20, -148); ctx.quadraticCurveTo(25, -140, 20, -136); ctx.quadraticCurveTo(15, -140, 20, -148); ctx.fillStyle = '#7fc8ff'; ctx.fill(); }
  if (C2) rr(-46, -96, 32, 10, 5, '#f1c08a', OL, 1.5);                  // the other arm out too, holding a second plate
  if (C) rr(14, -96, 32, 10, 5, '#f1c08a', OL, 1.5);                    // arm out, holding the plate
  else if (stir) { ctx.save(); ctx.translate(16, -98); ctx.rotate(Math.sin(t * 5) * 0.4); rr(-4, 0, 9, 30, 4, '#f1c08a', OL, 1.5); ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 28); ctx.lineTo(-2, 44); ctx.stroke(); ctx.restore(); }
  else { ctx.save(); ctx.translate(18, -100); ctx.rotate(-sw * 0.8); rr(-4, 0, 9, 34, 4, '#f1c08a', OL, 1.5); ctx.restore(); }
  ctx.restore();
  plates.forEach((P, i) => {                                          // each plate, with its order number so it's easy to match
    const px = x + (i ? -44 : 44) * ch.dir, py = f - 96 - bob;
    drawFood(P.P, clamp(P.userAns / fval(P.P.ans), 0.05, 4), px, py, P.userAns);
    rr(px - 16, py + 6, 32, 16, 8, P.color, '#fff', 1.5); ctx.fillStyle = '#fff'; ctx.font = '900 11px Fredoka, Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText('#' + P.num, px, py + 18);
  });
  if (ch.notepad && ch.notepad.length) {                              // orders taken but not yet on the rail
    const n = ch.notepad.length, w = 32, x0 = x - (n * w + (n - 1) * 4) / 2, y0 = f - 192 - bob;
    ch.notepad.forEach((c, i) => {
      const cx = x0 + i * (w + 4);
      rr(cx, y0, w, 17, 4, '#fffdf7', OL, 1.2); ctx.fillStyle = c.color; ctx.fillRect(cx + 1, y0 + 1, 5, 15);
      ctx.fillStyle = OL; ctx.font = '900 11px Fredoka, Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText('#' + c.num, cx + w / 2 + 3, y0 + 13);
    });
  }
}

// how fed up a waiting customer is: 0 = just sat down (all smiles) ... 1 = about to storm out
const angerOf = C => !isFinite(C.patMax) || C.arrive < 1 ? 0 : clamp(1 - C.patience / C.patMax, 0, 1);
function mixHex(a, b, k) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
// what a customer says when they're almost out of patience: dramatic, a little too extreme, never mean
const RANTS = ES
  ? ['¡ENVEJECÍ 10 AÑOS!', '¡ME DESVANEZCO!', '¡ME VOY A COMER LA MESA!', '¿EL CHEF SE FUE DE VACACIONES?', '¡MI ESTÓMAGO ESTÁ LLORANDO!',
     '¡ME VA A CRECER LA BARBA!', '¡LLAMEN A LAS NOTICIAS!', 'TANTA. HAMBRE.', '¡LLEVO SIGLOS AQUÍ!', '¡MI COMIDA YA ES UNA LEYENDA!']
  : ['I\'VE AGED 10 YEARS!', 'I\'M WASTING AWAY!', 'I COULD EAT THE TABLE!', 'IS THE CHEF ON VACATION?!', 'MY STOMACH IS CRYING!',
     'I\'M GROWING A BEARD HERE!', 'CALL THE NEWS!', 'SO. HUNGRY.', 'I\'VE BEEN HERE FOR CENTURIES!', 'MY FOOD IS A LEGEND NOW!'];
function miniBubble(x, y, text, col, size) {
  ctx.font = `900 ${size || 14}px Fredoka, Trebuchet MS`; const w = Math.max(24, ctx.measureText(text).width + 14), h = 22;
  const m = ctx.getTransform(), px = cv.width / W, sx = m.a / px, ox = m.e / px;   // keep it on screen (it may be drawn scaled)
  x = clamp(x, (4 - ox) / sx + w / 2, (W - 4 - ox) / sx - w / 2);
  rr(x - w / 2, y - h / 2, w, h, 11, '#fff', col, 2);
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 8, y + h / 2 - 1); ctx.lineTo(x + w / 2 + 2, y + h / 2 + 8); ctx.lineTo(x + w / 2 - 14, y + h / 2 - 1); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(x + w / 2 - 15, y + h / 2 - 3, 14, 3);
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(text, x, y + 5);
}
function drawCustomer(C, x, sit, t, walking) {
  const look = C.look, mood = C.mood, f = FEET, fuming = mood === 'fuming', waiting = mood === 'wait';
  const a = waiting ? angerOf(C) : 0;                                 // waiting faces slowly go from a big smile to steaming mad
  const shake = fuming ? Math.sin(t * 46) * 2 : a > 0.86 ? Math.sin(t * 40) * 1.2 : 0; x += shake;
  const hip = sit ? f - 50 : f - 46, sw = walking ? Math.sin(t * 13) * 0.4 : 0;
  if (sit === 'table') { /* legs are hidden under the table */ }
  else if (sit) {
    const tap = waiting && a > 0.5 && a < 0.86 ? Math.max(0, Math.sin(t * 11)) * 4 : 0;   // impatient foot tapping
    rr(x - 32, hip - 6, 28, 11, 5, '#3a4a6a'); rr(x - 34, hip - tap, 10, 44, 4, '#3a4a6a');
  } else {
    ctx.save(); ctx.translate(x - 5, hip); ctx.rotate(sw); rr(-5, 0, 11, 46, 4, '#3a4a6a'); ctx.restore();
    ctx.save(); ctx.translate(x + 5, hip); ctx.rotate(-sw); rr(-5, 0, 11, 46, 4, '#3a4a6a'); ctx.restore();
  }
  rr(x - 16, hip - 56, 32, 60, 11, look.shirt, OL, 1.5);
  const hx = x, hy = hip - 74;
  if (fuming) { circ(x - 22, hip - 60 + Math.sin(t * 30) * 3, 7, '#e0483c', OL, 1.5); circ(x + 22, hip - 60 - Math.sin(t * 30) * 3, 7, '#e0483c', OL, 1.5); }
  else if (waiting && sit && a >= 0.6) {                              // arms crossed: "I've been waiting a while..."
    rr(x - 16, hip - 40, 32, 10, 5, mixHex(look.shirt, '#000000', 0.2), OL, 1.2); circ(x - 15, hip - 35, 4.5, look.skin, OL, 1); circ(x + 15, hip - 35, 4.5, look.skin, OL, 1);
  } else if (waiting && sit && C.state === 'ready') {                 // hand up: ready to order!
    ctx.save(); ctx.translate(x - 13, hip - 46); ctx.rotate(Math.PI - 0.5 + Math.sin(t * 7) * 0.15); rr(-4.5, 0, 9, 40, 4, look.shirt, OL, 1.2); circ(0, 43, 6.5, look.skin, OL, 1.2); ctx.restore();
  } else if (sit && sit !== 'table') rr(x - 30, hip - 36, 22, 8, 4, look.skin, OL, 1.2);
  const face = fuming ? '#e0483c' : waiting ? mixHex(look.skin, '#e0483c', clamp((a - 0.62) / 0.38, 0, 1) * 0.75) : look.skin;
  circ(hx, hy, 18, face, OL, 1.5);
  drawHair(look, hx, hy);
  // the face
  ctx.strokeStyle = OL; ctx.fillStyle = OL; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const line = (a, b, c, d, w) => { ctx.lineWidth = w || 2; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  const cheeks = k => { if (k <= 0) return; ctx.globalAlpha = k; circ(hx - 11, hy + 6, 3.5, 'rgba(255,120,150,.7)'); circ(hx + 11, hy + 6, 3.5, 'rgba(255,120,150,.7)'); ctx.globalAlpha = 1; };
  if (mood === 'happy') {
    ctx.beginPath(); ctx.arc(hx - 6, hy + 1, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(hx + 6, hy + 1, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx - 8, hy + 6); ctx.quadraticCurveTo(hx, hy + 17, hx + 8, hy + 6); ctx.closePath(); ctx.fillStyle = '#7a2a2a'; ctx.fill(); ctx.stroke();
    cheeks(1);
  } else if (mood === 'upset') {
    line(hx - 11, hy - 6, hx - 3, hy - 9); line(hx + 11, hy - 6, hx + 3, hy - 9);
    circ(hx - 6, hy, 2.2, OL); circ(hx + 6, hy, 2.2, OL);
    ctx.beginPath(); ctx.arc(hx, hy + 14, 6, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 19, hy - 10); ctx.quadraticCurveTo(hx + 24, hy - 2, hx + 19, hy + 1); ctx.quadraticCurveTo(hx + 14, hy - 2, hx + 19, hy - 10); ctx.fillStyle = '#7fc8ff'; ctx.fill();
  } else if (fuming) {
    line(hx - 12, hy - 11, hx - 3, hy - 5, 3); line(hx + 12, hy - 11, hx + 3, hy - 5, 3);
    circ(hx - 6, hy - 1, 2, OL); circ(hx + 6, hy - 1, 2, OL);
    ell(hx, hy + 9, 7, 5, '#4a1010', OL, 1.5); ctx.strokeStyle = '#fff'; line(hx - 5, hy + 7, hx + 5, hy + 7, 1.5); ctx.strokeStyle = OL;
    ctx.strokeStyle = '#8a1010'; line(hx + 7, hy - 16, hx + 12, hy - 11, 2.2); line(hx + 12, hy - 16, hx + 7, hy - 11, 2.2); ctx.strokeStyle = OL;
    for (let i = 0; i < 3; i++) { const p = (t * 1.3 + i / 3) % 1; ctx.globalAlpha = 1 - p; circ(hx - 12 + i * 12, hy - 24 - p * 34, 6 + p * 6, '#e5e5e5', '#b0b0b0', 1); } ctx.globalAlpha = 1;
  } else {                                                            // waiting: the smile fades the longer they wait
    const blink = (t + C.num * 1.3) % 4 < 0.12;
    if (a < 0.12) { ctx.beginPath(); ctx.arc(hx - 6, hy + 1, 3.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(hx + 6, hy + 1, 3.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else if (blink) { line(hx - 8, hy, hx - 4, hy); line(hx + 4, hy, hx + 8, hy); }
    else { circ(hx - 6, hy, 2.2, OL); circ(hx + 6, hy, 2.2, OL); }
    if (a > 0.35) {                                                   // brows slowly knit together
      const k = clamp((a - 0.35) / 0.5, 0, 1);
      line(hx - 11, hy - 8 - k * 2, hx - 3, hy - 8 + k * 4, 2 + k * 1.2); line(hx + 11, hy - 8 - k * 2, hx + 3, hy - 8 + k * 4, 2 + k * 1.2);
    }
    if (a > 0.8) {                                                    // gritted teeth
      rr(hx - 7, hy + 6, 14, 7, 2, '#fff', OL, 1.5); line(hx - 6, hy + 9.5, hx + 6, hy + 9.5, 1); for (const i of [-3.5, 0, 3.5]) line(hx + i, hy + 6.5, hx + i, hy + 12.5, 1);
    } else {
      const c = clamp(1 - a * 2.6, -1, 1);                            // 1 = big grin, 0 = flat, -1 = frown
      if (c > 0.55) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(hx - 7, hy + 7); ctx.quadraticCurveTo(hx, hy + 7 + c * 12, hx + 7, hy + 7); ctx.closePath(); ctx.fillStyle = '#7a2a2a'; ctx.fill(); ctx.stroke(); }
      else { const ey = hy + 10 + (c < 0 ? 2 : 0); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 6, ey); ctx.quadraticCurveTo(hx, ey + c * 8, hx + 6, ey); ctx.stroke(); }
    }
    cheeks(clamp(1 - a * 3.5, 0, 1));
    if (a > 0.45 && a <= 0.8) { ctx.beginPath(); ctx.moveTo(hx + 19, hy - 10); ctx.quadraticCurveTo(hx + 24, hy - 2, hx + 19, hy + 1); ctx.quadraticCurveTo(hx + 14, hy - 2, hx + 19, hy - 10); ctx.fillStyle = '#7fc8ff'; ctx.fill(); }
    if (a > 0.86) for (const s of [-1, 1]) { const p = (t * 1.1 + (s > 0 ? 0.5 : 0)) % 1; ctx.globalAlpha = (1 - p) * 0.9; circ(hx + s * (20 + p * 12), hy - 6 - p * 18, 3.5 + p * 4, '#e5e5e5', '#b0b0b0', 1); ctx.globalAlpha = 1; }   // steam from the ears
  }
  ctx.lineCap = 'butt';
  if (waiting && C.arrive >= 1) {
    // the order number (so tickets, plates and customers match) with a patience meter along the bottom
    rr(hx - 18, hy - 58, 36, 24, 8, C.color, '#fff', 2); ctx.fillStyle = '#fff'; ctx.font = '900 12px Fredoka, Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText('#' + C.num, hx, hy - 44);
    if (isFinite(C.patMax)) { const fr = clamp(C.patience / C.patMax, 0, 1); rr(hx - 13, hy - 41, 26, 4, 2, 'rgba(0,0,0,.35)'); if (fr > 0.02) rr(hx - 13, hy - 41, 26 * fr, 4, 2, fr > 0.5 ? '#7ee081' : fr > 0.25 ? '#ffd23f' : '#ff5a4a'); }
    if (a > 0.8) { if (!C.rant) C.rant = pick(RANTS); miniBubble(hx - 42, hy - 48, C.rant, '#e0483c', 12); }
    else if (C.state === 'ready') miniBubble(hx - 38, hy - 48 + Math.sin(t * 5) * 2, '!', '#e0483c', 16);
  }
  if (C.bubble && !waiting) bubble(hx, hy - 30, C.bubble, mood);
}

function hintInfo() {                                                 // the little "what now?" sign over the chef
  if (!G || G.cooking || G.state !== 'play' || paused) return null;
  const ch = G.chef, near = nearCustomer(), r = railOrders();
  const to = p => dirArrow(p.x - ch.x, p.y - ch.y);
  const room = ch.plates.length < MAX_HANDS;
  if (near && ch.plates.includes(near)) return { t: L('Space: Serve!', 'Espacio: ¡Servir!'), key: true };
  if (near && near.state === 'ready') return { t: L('Space: Take order', 'Espacio: Tomar pedido'), key: true };
  if (inKitchen() && G.pass.length && room) return { t: L('Space: Pick up plates', 'Espacio: Recoger platos'), key: true };
  if (atStove() && r.length) return { t: L('Space: Cook', 'Espacio: Cocinar'), key: true };
  if (ch.plates.length) return { t: ch.plates.map(c => `${L("Serve", "Servir")} #${c.num} ${to(serveSpot(c.seat))}`).join('  ·  ') };
  if (ch.notepad.length) return { t: `${L("To the kitchen", "A la cocina")} ${to(KITCHEN_SPOT)}` };
  if (G.pass.length) return { t: `${L("Plates on the counter", "Platos en el mostrador")} ${to(KITCHEN_SPOT)}` };
  if (r.length) return { t: `${L("To the stove", "A la estufa")} ${to(KITCHEN_SPOT)}` };
  if (inKitchen() && G.custs.some(c => c.state === 'ready' && c.arrive >= 1)) return { t: L('A customer is waiting!', '¡Un cliente está esperando!') };
  return null;
}
function dirArrow(dx, dy) { return ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(Math.atan2(dy * 1.4, dx) / (Math.PI / 4)) + 8) % 8]; }
function drawHint() {
  const h = hintInfo(); if (!h) return;
  const ch = G.chef, y = ch.y - (ch.notepad.length ? 224 : 204) * depth(ch.y);
  ctx.font = `900 ${h.key ? 15 : 13}px Fredoka, Trebuchet MS`;
  const w = ctx.measureText(h.t).width + 20, x = clamp(ch.x, w / 2 + 4, W - w / 2 - 4), pulse = h.key ? 1 + Math.sin(G.t * 8) * 0.04 : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
  rr(-w / 2, -12, w, 24, 12, h.key ? '#ffc83d' : 'rgba(255,253,247,.9)', h.key ? '#7a4a10' : 'rgba(60,40,20,.5)', 2);
  ctx.fillStyle = h.key ? '#3b2416' : '#5a4030'; ctx.textAlign = 'center'; ctx.fillText(h.t, 0, 5);
  ctx.restore();
}

function draw() {
  const cssW = cv.clientWidth;                                          // keep the picture sharp at any size
  if (cssW) { const k = Math.min(3, Math.max(1, Math.ceil(cssW * (window.devicePixelRatio || 1) / W - 0.05))); if (cv.width !== W * k) { cv.width = W * k; cv.height = H * k; } ctx.setTransform(k, 0, 0, k, 0, 0); }
  const t = G ? G.t : titleT;
  drawRoom(t);
  // everything standing on the floor is drawn back-to-front, so nearer things cover farther ones
  const items = [{ y: COUNTER.y1, f: drawCounter }];
  if (!G) {                                                            // the title / menu backdrop: a calm evening at the restaurant
    const fake = (i, mood, look) => ({ look, mood, num: i + 1, color: TICKET_COLORS[i + 1], bubble: mood === 'happy' ? L('Yum!', '¡Qué rico!') : '', state: 'hung', arrive: 1, patience: 1, patMax: Infinity });
    const guests = { 6: fake(0, 'happy', { skin: '#c68642', hair: '#2b1b10', shirt: '#5b8cff', style: 'pony' }), 1: fake(1, 'wait', { skin: '#ffd9b0', hair: '#a0522d', shirt: '#2eb872', style: 'curly' }) };
    SEATS.forEach((s, i) => items.push({ y: s.ty, f: () => drawSeat(i, guests[i], t) }));
    items.push({ y: 250, f: () => atDepth(200, 250, depth(250), () => drawChef({ x: 0, dir: 1, walking: false, notepad: [], plates: [], worry: 0 }, t, true)) });
    items.sort((a, b) => a.y - b.y).forEach(it => it.f());
    return;
  }
  drawFloorMarks();
  SEATS.forEach((s, i) => {
    const C = G.custs.find(c => c.seat === i && c.arrive >= 1) || G.leavers.find(l => l.seat === i && l.walk < 0);
    items.push({ y: s.ty, f: () => drawSeat(i, C, G.t) });
  });
  G.custs.filter(c => c.arrive < 1).forEach(C => items.push({ y: C.wy, f: () => atDepth(C.wx, C.wy, depth(C.wy), () => drawCustomer(C, 0, false, G.t, true)) }));
  G.leavers.filter(l => l.walk >= 0).forEach(L => {
    const x = L.lx === undefined ? SEATS[L.seat].tx : L.lx, y = L.ly === undefined ? SEATS[L.seat].sy : L.ly;
    items.push({ y, f: () => atDepth(x, y, depth(y), () => drawCustomer(L, 0, false, G.t, true)) });
  });
  const ch = G.chef;
  items.push({ y: ch.y, f: () => atDepth(ch.x, ch.y, depth(ch.y), () => drawChef(Object.assign({}, ch, { x: 0 }), G.t, G.cooking)) });
  items.sort((a, b) => a.y - b.y).forEach(it => it.f());
  drawGuideArrows();
  drawParticles();
  drawHint();
}
// draw something built at the old side-view size (feet at FEET) standing on the floor at (x, y), scaled for its depth
function atDepth(x, y, k, fn) { ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(0, -FEET); fn(); ctx.restore(); }
function drawSeat(i, C, t) {                                          // chair, the customer sitting behind the table, the table, their plate
  const s = SEATS[i], k = depth(s.ty);
  ctx.save(); ctx.translate(s.tx, s.sy); ctx.scale(k, k); drawChairBack(); ctx.restore();
  if (C) atDepth(s.tx, s.sy, k, () => drawCustomer(C, 0, 'table', t, false));
  ctx.save(); ctx.translate(s.tx, s.ty); ctx.scale(k, k); drawTableTop();
  if (C && C.plated) { ctx.translate(0, -FEET); drawFood(C.P, clamp(C.userAns / fval(C.P.ans), 0.05, 4), -4, FEET - 68, C.userAns); }
  ctx.restore();
}
const hexA = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
// on the floor: a glowing spot right under each table you're carrying a plate to, with a trail leading to each one
function drawFloorMarks() {
  const ch = G.chef;
  ch.plates.filter(c => G.custs.includes(c)).forEach(target => {
    const s = SEATS[target.seat], sp = { x: s.tx, y: s.ty };
    ctx.save(); ctx.setLineDash([3, 13]); ctx.lineDashOffset = -G.t * 40; ctx.lineCap = 'round'; ctx.strokeStyle = hexA(target.color, 0.85); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(ch.x, ch.y); ctx.lineTo(sp.x, sp.y); ctx.stroke(); ctx.restore();
    if (target.arrive >= 1 && target.state !== 'served') {
      const k = depth(s.ty), p = 1 + Math.sin(G.t * 6) * 0.1;          // (the table stands on it)
      ctx.save(); ell(s.tx, s.ty - 3 * k, 52 * k * p, 16 * k * p, hexA(target.color, 0.35), target.color, 4); ctx.restore();
    }
  });
}
// plates waiting on the kitchen counter for the chef to pick up, each with its order number on the counter's front
function drawPassPlates() {
  if (!G || !G.pass.length) return;
  const kf = depth(COUNTER.y1), top1 = COUNTER.y1 - 72 * kf;
  G.pass.forEach((C, i) => {
    const x = 118 + i * 46;
    ctx.save(); ctx.translate(x, top1 - 2); ctx.scale(0.62, 0.62); drawFood(C.P, clamp(C.userAns / fval(C.P.ans), 0.05, 4), 0, 0, C.userAns); ctx.restore();
    rr(x - 14, top1 + 6, 28, 15, 7, C.color, '#fff', 1.5); ctx.fillStyle = '#fff'; ctx.font = '900 10px Fredoka, Trebuchet MS'; ctx.textAlign = 'center'; ctx.fillText('#' + C.num, x, top1 + 17);
  });
}
// big bouncing arrows: over each customer whose plate you're carrying, and over the kitchen when there's cooking
// to do (or plates waiting on the counter)
function drawGuideArrows() {
  const ch = G.chef, held = ch.plates.filter(c => G.custs.includes(c)), bounce = Math.abs(Math.sin(G.t * 5)) * 10;
  const arrow = (x, y, col, label) => {
    ctx.save(); ctx.translate(x, y - bounce);
    ctx.font = '900 15px Fredoka, Trebuchet MS'; const w = ctx.measureText(label).width + 22;
    rr(-w / 2, -40, w, 26, 12, col, '#fff', 3); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(label, 0, -21);
    ctx.beginPath(); ctx.moveTo(-15, -12); ctx.lineTo(15, -12); ctx.lineTo(0, 8); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  };
  held.forEach(C => { const s = SEATS[C.seat], k = depth(s.ty); arrow(s.tx, s.sy - 196 * k, C.color, `${L("Serve", "Servir")} #${C.num}`); });
  if (!held.length && (ch.notepad.length || railOrders().length || G.pass.length) && !inKitchen() && !G.cooking)
    arrow(KITCHEN_SPOT.x, 196, '#d9432f', ch.notepad.length ? L('Kitchen', 'Cocina') : railOrders().length ? L('Cook', 'Cocinar') : L('Pick up', 'Recoger'));
}

/* ===================== HUD / TOAST ===================== */
let toastTimer = 0;
function toast(msg, cls) { const t = $('toast'); t.textContent = msg; t.className = 'show ' + (cls || ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = ''; }, 2600); }
function updateHUD() {
  if (!G) return;
  const run = G.mode === 'run';
  $('hReviews').style.display = run ? '' : 'none';
  $('hReviews').innerHTML = L('Reviews ', 'Reseñas ') + Array.from({ length: MAX_REVIEWS }, (_, i) => `<span class="rv${i < G.reviews ? ' bad' : ''}">${i < G.reviews ? '1★' : '☆'}</span>`).join('');
  $('hCorrectPill').style.display = run ? 'none' : ''; $('hCorrect').textContent = G.correct;
  $('hServedPill').style.display = run ? '' : 'none'; $('hServed').textContent = shiftServed();
  $('hStreak').textContent = G.streak; $('hStars').textContent = run ? totalStars : G.stars;
  $('hLevelPill').style.display = run ? '' : 'none'; $('hLevel').textContent = G.level;
}
let ac = null;
function audioInit() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) {} }
function beep(f, d = .1, type = 'sine', v = .05, delay = 0) {
  if (muted || !ac) return;
  try { const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + delay; o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + .02); } catch (e) {}
}
const sfx = {
  bell() { beep(1568, .12, 'triangle', .04); beep(2093, .2, 'triangle', .035, .1); },
  ding() { beep(1320, .25, 'triangle', .05); beep(1760, .3, 'triangle', .04, .08); },
  go() { beep(520, .08, 'square', .025); beep(700, .08, 'square', .025, .06); },
  good() { [523, 659, 784, 1047].forEach((f, i) => beep(f, .16, 'triangle', .06, i * .08)); },
  bad() { beep(300, .2, 'sine', .06); beep(220, .3, 'sine', .06, .15); },
  fume() { beep(110, .5, 'sawtooth', .06); beep(90, .5, 'sawtooth', .05, .2); beep(140, .3, 'square', .04, .5); }
};

/* ===================== LOOP & INPUT ===================== */
function fitCards() {
  document.querySelectorAll('#sb .overlay').forEach(ov => {
    if (ov.classList.contains('hidden') || ov.id === 'title') return;
    const card = ov.querySelector('.card'); if (!card) return;
    card.style.zoom = ''; const room = ov.getBoundingClientRect().height - 24; let z = 1;
    for (let i = 0; i < 16 && card.getBoundingClientRect().height > room && z > .35; i++) { z *= .94; card.style.zoom = z.toFixed(3); }
  });
}
let fitQueued = false;
const queueFit = () => { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; try { fitCards(); } catch (e) {} }); };
new MutationObserver(queueFit).observe($('sb'), { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
addEventListener('resize', queueFit); document.addEventListener('fullscreenchange', queueFit);


let last = performance.now();
function setPaused(v) {
  paused = v; $('pause').classList.toggle('hidden', !v);
  if (v) { $('btnResume').focus(); clearKeys(); }
  $('menuBtn').textContent = v ? L('✕ Close', '✕ Cerrar') : L('☰ Menu', '☰ Menú');
  last = performance.now();
  if (G) renderCook();
  if (!v && G && !$('cook').classList.contains('hidden') && !coarse()) $('ans').focus();
  else if (!v && document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  try { if (!paused && !(G && G.state === 'explain')) update(dt); else if (!G) update(dt); draw(); }
  catch (e) { console.error('game frame error (kept running):', e); try { ctx.restore(); } catch (_) {} }
  requestAnimationFrame(frame);
}

// Cheat code (same combo as the other games): hold Shift and press T, A, V together AT ANY TIME - unlocks every level and gives max stars
const cheatDown = new Set();
addEventListener('keyup', e => cheatDown.delete(e.code));
addEventListener('blur', () => { cheatDown.clear(); clearKeys(); });
addEventListener('keydown', e => {
  cheatDown.add(e.code);
  if (e.repeat || !e.shiftKey || !['KeyT', 'KeyA', 'KeyV'].every(k => cheatDown.has(k))) return;
  cheatDown.clear();
  totalStars = 999999; store.set('stars', totalStars); bestLevel = MAX_LEVEL; store.set('best_level', bestLevel);
  sfx.good(); toast(L('🔓 All levels unlocked · max stars!', '🔓 ¡Todos los niveles desbloqueados · estrellas al máximo!'), 'good');
  if (screen === 'menu') buildMenu(); updateHUD();
});
const MOVE_KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
addEventListener('keyup', e => { if (MOVE_KEYS[e.code]) keys[MOVE_KEYS[e.code]] = false; });
addEventListener('keydown', e => {
  if (window.isPageControlKey && window.isPageControlKey(e)) return;   // keys for the page's own controls (All games, Fullscreen, notes...)
  const vis = id => !$(id).classList.contains('hidden'), enter = e.code === 'Enter' || e.code === 'NumpadEnter', space = e.code === 'Space', age = performance.now() - cardAt;
  if (screen === 'title') { if (enter || space) { e.preventDefault(); audioInit(); buildMenu(); showScreen('menu'); } return; }
  if (e.code === 'Escape') {
    e.preventDefault();
    if (vis('exitConfirm')) { $('exitConfirm').classList.add('hidden'); $('pause').classList.remove('hidden'); }
    else if (screen === 'practice') showScreen('menu');
    else if (screen === 'menu') showScreen('title');
    else if (vis('over')) toMenu();
    else if (vis('explain')) closeExplain();
    else if (G && G.cooking && !paused) closeCook();
    else setPaused(!paused);
    return;
  }
  if ((enter || space) && vis('explain')) { e.preventDefault(); if (!e.repeat && age > 500) closeExplain(); return; }
  if ((enter || space) && vis('over') && document.activeElement && !document.activeElement.closest('#ovContinue')) { e.preventDefault(); if (!e.repeat && age > 700) $('btnAgain').click(); return; }
  // arrow keys move between buttons on the menus and cards
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.code) && (screen !== 'play' || vis('pause') || vis('over') || vis('exitConfirm'))) {
    const ov = ['exitConfirm', 'pause', 'over', 'practice', 'menu'].map($).find(el => !el.classList.contains('hidden'));
    if (!ov) return;
    e.preventDefault();
    const btns = [...ov.querySelectorAll('button:not(:disabled)')].filter(b => b.offsetParent !== null), cur = document.activeElement;
    if (!btns.length) return;
    if (!btns.includes(cur)) { btns[0].focus(); return; }
    const c = cur.getBoundingClientRect(), dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.code];
    let bestB = null, bestScore = Infinity;
    for (const b of btns) {
      if (b === cur) continue;
      const r = b.getBoundingClientRect();
      const along = dir[0] ? (dir[0] > 0 ? r.left - c.right : c.left - r.right) : (dir[1] > 0 ? r.top - c.bottom : c.top - r.bottom);
      const centerAlong = dir[0] ? (r.left + r.width / 2 - (c.left + c.width / 2)) * dir[0] : (r.top + r.height / 2 - (c.top + c.height / 2)) * dir[1];
      if (along < 0 || centerAlong <= 2) continue;
      const overlap = dir[0] ? Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top) : Math.min(c.right, r.right) - Math.max(c.left, r.left);
      const side = overlap > 0 ? 0 : (dir[0] ? Math.min(Math.abs(r.top - c.bottom), Math.abs(c.top - r.bottom)) : Math.min(Math.abs(r.left - c.right), Math.abs(c.left - r.right)));
      const cross = dir[0] ? Math.abs((r.top + r.height / 2) - (c.top + c.height / 2)) : Math.abs((r.left + r.width / 2) - (c.left + c.width / 2));
      const score = Math.max(0, along) + side * 3 + cross * .4 + (overlap > 0 ? 0 : 40);
      if (score < bestScore) { bestScore = score; bestB = b; }
    }
    if (bestB) bestB.focus();
    return;
  }
  if (screen !== 'play' || paused || !G || G.state !== 'play') return;
  if (G.cooking) {
    // at the stove: up / down switch between orders on the rail, Enter plates the order, ← / → (with an empty answer box) walks away
    if ((e.code === 'ArrowUp' || e.code === 'ArrowDown') && railOrders().length < 2 && !$('ans').value) { e.preventDefault(); closeCook(); keys[e.code === 'ArrowUp' ? 'up' : 'down'] = true; return; }
    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      const r = railOrders(); if (!r.length) return;
      e.preventDefault();
      const i = r.findIndex(c => c.id === G.activeId), j = (i + (e.code === 'ArrowDown' ? 1 : -1) + r.length) % r.length;
      setActive(r[j].id); $('ans').focus(); return;
    }
    if (enter) { e.preventDefault(); if (!e.repeat) submit(); return; }
    if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !$('ans').value) { e.preventDefault(); closeCook(); keys[e.code === 'ArrowLeft' ? 'left' : 'right'] = true; return; }
    if (document.activeElement !== $('ans') && /^[0-9./]$/.test(e.key)) $('ans').focus();       // typing anywhere goes into the answer box
    return;
  }
  // walking around the restaurant
  const ae = document.activeElement;
  if (ae && ae.tagName === 'BUTTON') ae.blur();                        // so Space never "clicks" the Menu button by accident
  if (MOVE_KEYS[e.code]) { e.preventDefault(); keys[MOVE_KEYS[e.code]] = true; return; }
  if (space || enter || e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) interact(); return; }
});
$('btnPlay').onclick = () => { audioInit(); buildMenu(); showScreen('menu'); };
$('btnMenuBack').onclick = () => showScreen('title');
$('btnPractice').onclick = () => { renderPractice(); showScreen('practice'); };
$('btnPracBack').onclick = () => showScreen('menu');
$('btnPracStart').onclick = () => { if (practicePicked.length) startPractice(practicePicked.slice()); };
$('btnStart').onclick = () => startGame(bestLevel);
$('btnAgain').onclick = () => { if (G && G.mode === 'practice') startPractice(G.kinds); else startGame(bestLevel); };
$('btnOverMenu').onclick = toMenu;
$('btnServe').onclick = () => submit();
$('btnCookClose').onclick = () => closeCook();
$('btnExNext').onclick = closeExplain;
const muteLabel = () => { $('muteBtn').textContent = muted ? L('🔇 Sound off', '🔇 Sonido apagado') : L('🔊 Sound on', '🔊 Sonido encendido'); };
$('muteBtn').onclick = () => { muted = !muted; store.set('muted', muted); muteLabel(); audioInit(); };
muteLabel();
$('menuBtn').onclick = () => { if (G && G.state === 'play') setPaused(!paused); };
$('btnResume').onclick = () => setPaused(false);
$('btnRestart').onclick = () => { const m = G && G.mode, k = G && G.kinds, lv = G ? G.level : 1; setPaused(false); if (m === 'practice') startPractice(k); else startGame(lv); };
$('btnTitle').onclick = () => { $('pause').classList.add('hidden'); $('exitConfirm').classList.remove('hidden'); $('btnExitConfirmNo').focus(); };
$('btnExitConfirmYes').onclick = () => { $('exitConfirm').classList.add('hidden'); toMenu(); };
$('btnExitConfirmNo').onclick = () => { $('exitConfirm').classList.add('hidden'); $('pause').classList.remove('hidden'); $('btnResume').focus(); };
$('stage').addEventListener('pointerdown', () => audioInit());
// click / tap the floor to walk there (clicking a table walks to the spot beside it; clicking the kitchen walks into it)
cv.addEventListener('pointerdown', e => {
  if (!G || G.state !== 'play' || paused || G.cooking || screen !== 'play') return;
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  let target = { x: clamp(x, 24, W - 24), y: clamp(y, FLOOR_Y + 14, H - 14) };
  const hit = SEATS.findIndex(s => Math.abs(x - s.tx) < 70 * depth(s.ty) && y > s.sy - 180 * depth(s.ty) && y < s.ty + 20);
  if (hit >= 0) target = serveSpot(hit);
  else if (x < KITCHEN.x && y < COUNTER.y1) target = KITCHEN_SPOT;
  else if (blocked(target.x, target.y)) return;
  G.chef.target = target;
});
// touch screens: hold the arrows to walk, tap the hand to take an order / cook / serve
[['tLeft', 'left'], ['tRight', 'right'], ['tUp', 'up'], ['tDown', 'down']].forEach(([id, k]) => {
  const b = $(id), off = () => { keys[k] = false; };
  b.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); keys[k] = true; try { b.setPointerCapture(e.pointerId); } catch (_) {} });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, off));
  b.addEventListener('contextmenu', e => e.preventDefault());
});
$('tAct').onclick = () => { audioInit(); interact(); };
// the answer box only takes numbers: digits, a decimal point, "/" for fractions and a space for mixed numbers like 1 1/2
const ANS_CHAR = /[0-9./ ]/;
const shakeAns = () => { const a = $('ans'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); };
$('ans').addEventListener('keydown', e => {
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !ANS_CHAR.test(e.key)) { e.preventDefault(); shakeAns(); toast(L('Numbers only - use / for fractions (like 3/4) and . for decimals', 'Solo números: usa / para fracciones (como 3/4) y . para decimales'), ''); }
});
$('ans').addEventListener('input', () => {                             // catches pasting and phone keyboards too
  const a = $('ans'), v = a.value.replace(/[^0-9./ ]/g, '').replace(/ {2,}/g, ' ').replace(/^ /, '');
  if (v !== a.value) { a.value = v; shakeAns(); }
});
(function keypad() {
  const kp = $('keypad');
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '/', 'space', '⌫'].forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = k === 'space' ? '␣' : k;
    b.setAttribute('aria-label', k === 'space' ? L('space', 'espacio') : k === '⌫' ? L('delete', 'borrar') : k);
    b.onclick = () => { const a = $('ans'); if (k === '⌫') a.value = a.value.slice(0, -1); else a.value += k === 'space' ? ' ' : k; };
    kp.appendChild(b);
  });
})();
window.addEventListener('pagehide', () => { if (G && G.mode === 'run' && shiftServed() > best) store.set('best_served', shiftServed()); });

showScreen('title');
requestAnimationFrame(frame);
// small hook for automated checks
window.PP = { openCook, renderCook, genProblem, parseAns, verdict, mistakeOf, explainHTML, tapeSVG, stepsHTML, fstr, F, get G() { return G; }, keys, startGame, startPractice, submit, interact, spawnCustomer, SEATS, step(dt) { update(dt); draw(); } };
})();
