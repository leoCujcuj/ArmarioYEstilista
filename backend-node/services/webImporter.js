/**
 * Servicio Importador Web de Prendas (Módulo B - Vía 3).
 * Soporta tanto URLs directas de imagen (JPG/PNG/WebP/AVIF) como páginas de producto
 * extrayendo metadatos OpenGraph (og:image / twitter:image / og:title) con protección SSRF.
 */

const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '0.0.0.0',
  'mongo',
  'redis',
  'postgres',
  'armario-postgres',
  'backend-python',
  'armario-backend-python',
  'backend-node',
  'armario-backend-node'
]);

function esIpPrivadaOReservada(ip) {
  if (!ip) return true;
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 127 || parts[0] === 10 || parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const norm = ip.toLowerCase();
    return norm === '::1' || norm.startsWith('fc') || norm.startsWith('fd') || norm.startsWith('fe80');
  }
  return true;
}

async function validarUrlExternaSegura(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Debes proporcionar una URL válida.');
  }
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (e) {
    throw new Error('El formato de la URL no es válido (usa https://...).');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Solo se admiten enlaces HTTP o HTTPS.');
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('El dominio indicado no está permitido por seguridad.');
  }

  if (net.isIP(host)) {
    if (esIpPrivadaOReservada(host)) {
      throw new Error('No se permiten direcciones de red interna.');
    }
    return parsed.toString();
  }

  const addresses = await dns.lookup(host, { all: true });
  if (!addresses || addresses.length === 0) {
    throw new Error('No se pudo resolver el dominio indicado.');
  }
  for (const addr of addresses) {
    if (esIpPrivadaOReservada(addr.address)) {
      throw new Error('El enlace apunta a una red privada bloqueada.');
    }
  }

  return parsed.toString();
}

function extraerMetaTag(html, attrValue) {
  const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${attrValue}["'][^>]+content=["']([^"']+)["']`, 'i');
  const m1 = html.match(regex1);
  if (m1 && m1[1]) return m1[1].trim();

  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${attrValue}["']`, 'i');
  const m2 = html.match(regex2);
  if (m2 && m2[1]) return m2[1].trim();

  return '';
}

function decodificarEntidadesBasicas(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Extrae buffer de imagen, mimeType, título sugerido y marca sugerida desde una URL externa.
 */
async function extraerImagenDesdeUrl(rawUrl) {
  const safeUrl = await validarUrlExternaSegura(rawUrl);

  const headersNavegador = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Accept: 'image/avif,image/webp,image/apng,image/*,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
  };

  const resp = await axios.get(safeUrl, {
    responseType: 'arraybuffer',
    timeout: 14000,
    maxContentLength: 15 * 1024 * 1024,
    headers: headersNavegador
  });

  const contentType = (resp.headers['content-type'] || '').toLowerCase();

  // Caso 1: La URL ya apunta directamente a una imagen
  if (contentType.startsWith('image/')) {
    return {
      buffer: Buffer.from(resp.data),
      mimeType: contentType.split(';')[0],
      imageUrlDetectada: safeUrl,
      tituloSugerido: '',
      marcaSugerida: ''
    };
  }

  // Caso 2: Página HTML de tienda online -> buscar og:image / twitter:image
  if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
    const html = Buffer.from(resp.data).toString('utf8');
    const rawImg = decodificarEntidadesBasicas(
      extraerMetaTag(html, 'og:image:secure_url')
      || extraerMetaTag(html, 'og:image')
      || extraerMetaTag(html, 'twitter:image')
    );

    if (!rawImg) {
      throw new Error('No se encontró una imagen principal en esa página. Copia directamente la dirección de la imagen.');
    }

    const resolvedImgUrl = new URL(rawImg, safeUrl).toString();
    const safeImgUrl = await validarUrlExternaSegura(resolvedImgUrl);

    const imgResp = await axios.get(safeImgUrl, {
      responseType: 'arraybuffer',
      timeout: 14000,
      maxContentLength: 15 * 1024 * 1024,
      headers: { ...headersNavegador, Referer: safeUrl }
    });

    const imgMime = (imgResp.headers['content-type'] || 'image/jpeg').split(';')[0];
    if (!imgMime.startsWith('image/')) {
      throw new Error('El recurso extraído de la página no es un archivo de imagen válido.');
    }

    const tituloOg = decodificarEntidadesBasicas(
      extraerMetaTag(html, 'og:title') || extraerMetaTag(html, 'twitter:title')
    );
    const marcaOg = decodificarEntidadesBasicas(
      extraerMetaTag(html, 'product:brand') || extraerMetaTag(html, 'og:site_name')
    );

    return {
      buffer: Buffer.from(imgResp.data),
      mimeType: imgMime,
      imageUrlDetectada: safeImgUrl,
      tituloSugerido: tituloOg ? tituloOg.split('|')[0].split(' - ')[0].trim() : '',
      marcaSugerida: marcaOg ? marcaOg.trim() : ''
    };
  }

  throw new Error('La URL no corresponde a una imagen ni a una página de producto compatible.');
}

module.exports = {
  validarUrlExternaSegura,
  extraerImagenDesdeUrl
};
