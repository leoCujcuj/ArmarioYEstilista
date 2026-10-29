/**
 * Cargador del catálogo constante de básicos esenciales (basicos_seed.json).
 * Inserta directamente en la colección del usuario sin invocar IA ni rembg.
 */

const basicosSeed = require('./basicos_seed.json');

const CATALOGO_BASICOS = basicosSeed.map((item) => ({
  ...item,
  // Compatibilidad retroactiva con clientes que lean basicId o slug
  slug: item.slug,
  basicId: item.slug
}));

function buscarBasicosPorSlugs(identificadores = []) {
  const set = new Set(identificadores.map((id) => String(id).trim()).filter(Boolean));
  return CATALOGO_BASICOS.filter((item) => set.has(item.slug) || set.has(item.basicId));
}

module.exports = {
  CATALOGO_BASICOS,
  buscarBasicosPorSlugs
};
