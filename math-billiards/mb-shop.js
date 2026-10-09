// Math Billiards - the cosmetic catalog. Everything here only changes how things look: no item makes a shot easier.
// To add an item, add a line to its list (id, name, price, and the colors the renderer uses). Price 0 = owned from the start.
(function () {
  var MB = window.MB, T = MB.T;
  MB.SHOP = [
    { id: 'cue', name: T('Cue Sticks', 'Tacos'), items: [
      { id: 'maple', name: T('Classic Maple', 'Arce clásico'), price: 0, shaft: '#ead2a0', butt: '#5b2f16', ring: '#f4efe4', wrap: '#1c1c1c', tip: '#3d74c9' },
      { id: 'ebony', name: T('Ebony', 'Ébano'), price: 5, shaft: '#e6cf9f', butt: '#1d1714', ring: '#d8d8d8', wrap: '#3a3a3a', tip: '#3d74c9' },
      { id: 'ocean', name: T('Ocean', 'Océano'), price: 10, shaft: '#eadbb8', butt: '#0e4f7a', ring: '#9fe3ff', wrap: '#0b2a44', tip: '#2b9bd8' },
      { id: 'carbon', name: T('Carbon Fiber', 'Fibra de carbono'), price: 15, shaft: '#3b3f46', butt: '#16181c', ring: '#7dff9b', wrap: '#25282e', tip: '#7dff9b', weave: true },
      { id: 'neon', name: T('Neon', 'Neón'), price: 25, shaft: '#cfefff', butt: '#0b1a33', ring: '#4fe3ff', wrap: '#ff4fd8', tip: '#4fe3ff', glow: '#4fe3ff' },
      { id: 'royal', name: T('Royal Gold', 'Oro real'), price: 40, shaft: '#f6ecd2', butt: '#7a5a12', ring: '#ffe08a', wrap: '#fff7e0', tip: '#c9142a', glow: '#ffd166', gem: true }
    ] },
    { id: 'table', name: T('Table Themes', 'Mesas'), items: [
      { id: 'green', name: T('Classic Green', 'Verde clásico'), price: 0, cloth: '#1f7a45', clothHi: '#2b9a59', cush: '#17643a', wood: '#6b3d1d', woodHi: '#8e5528', trim: '#d9b26a' },
      { id: 'sand', name: T('Desert Sand', 'Arena del desierto'), price: 5, cloth: '#a8834f', clothHi: '#c29c64', cush: '#8f6d3f', wood: '#3f2a18', woodHi: '#5b3d22', trim: '#e9d2a2' },
      { id: 'slate', name: T('Slate Gray', 'Gris pizarra'), price: 10, cloth: '#515c69', clothHi: '#66727f', cush: '#434c57', wood: '#1d1f23', woodHi: '#34373d', trim: '#c7ced8' },
      { id: 'plum', name: T('Midnight Plum', 'Ciruela nocturna'), price: 20, cloth: '#4b2e6b', clothHi: '#62408a', cush: '#3c2457', wood: '#24141c', woodHi: '#3b2430', trim: '#d6b8ff' },
      { id: 'hall', name: T('Championship Hall', 'Salón de campeones'), price: 35, cloth: '#155c3a', clothHi: '#1e7a4d', cush: '#104a2e', wood: '#2a1608', woodHi: '#4d2a10', trim: '#ffd166', lamp: true },
      { id: 'arcade', name: T('Neon Arcade', 'Arcade de neón'), price: 50, cloth: '#2d3a55', clothHi: '#3b4c6e', cush: '#24304a', wood: '#0d0f1a', woodHi: '#1b1f33', trim: '#4fe3ff', neon: '#ff4fd8' }
    ] },
    { id: 'balls', name: T('Ball Styles', 'Estilos de bolas'), items: [
      { id: 'classic', name: T('Classic Gloss', 'Brillo clásico'), price: 0, gloss: 0.85, look: 'gloss' },
      { id: 'matte', name: T('Matte', 'Mate'), price: 5, gloss: 0.3, look: 'matte' },
      { id: 'pearl', name: T('Pearl', 'Perla'), price: 12, gloss: 0.9, look: 'pearl' },
      { id: 'metal', name: T('Metallic', 'Metálico'), price: 25, gloss: 1, look: 'metal' },
      { id: 'marble', name: T('Marble Swirl', 'Mármol'), price: 40, gloss: 0.9, look: 'marble' }
    ] },
    { id: 'fx', name: T('Shot Effects', 'Efectos de tiro'), items: [
      { id: 'none', name: T('None', 'Ninguno'), price: 0 },
      { id: 'chalk', name: T('Chalk Puff', 'Polvo de tiza'), price: 5, puff: '#7fb2ff' },
      { id: 'sparks', name: T('Spark Trail', 'Estela de chispas'), price: 12, trail: 'sparks', col: '#ffd166' },
      { id: 'comet', name: T('Comet Trail', 'Estela de cometa'), price: 20, trail: 'comet', col: '#9fe3ff' },
      { id: 'rainbow', name: T('Rainbow Trail', 'Estela arcoíris'), price: 35, trail: 'rainbow' },
      { id: 'fireworks', name: T('Pocket Fireworks', 'Fuegos en la tronera'), price: 50, trail: 'comet', col: '#ffffff', fireworks: true }
    ] }
  ];
  MB.item = function (cat, id) {
    var c = MB.SHOP.filter(function (x) { return x.id === cat; })[0];
    return c.items.filter(function (i) { return i.id === id; })[0] || c.items[0];
  };
  MB.owns = function (cat, id) { var it = MB.item(cat, id); return it.price === 0 || MB.save.owned.indexOf(cat + ':' + id) >= 0; };
  MB.equipped = function (cat) { return MB.item(cat, MB.save.equip[cat]); };
})();
