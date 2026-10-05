// Motor de búsqueda y descifrado en memoria para el Padrón Electoral
import encryptedPayload from './data/padron.enc.js'

// Firma de seguridad dividida para ofuscación contra scrapers estáticos
const _P1 = 'UAGRM_VET_'
const _P2 = 'PADRON_2024_2026_'
const _P3 = 'PROD_SECURITY_SIG'
const CIPHER_SECRET = _P1 + _P2 + _P3

let voters = []
let registroMap = new Map()
let isReady = false
let initPromise = null

/**
 * Normaliza una cadena de texto eliminando tildes, diacríticos y caracteres especiales.
 */
export function normalizeText(str) {
  if (!str) return ''
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes
    .replace(/Ñ/g, 'N')             // Tolerancia para teclados sin Ñ
    .replace(/ñ/g, 'n')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Descifra el paquete de datos en memoria RAM usando la Web Crypto API (AES-256-GCM nativo)
 */
async function decryptDatabase() {
  try {
    const cryptoObj = (typeof window !== 'undefined' && window.crypto) ? window.crypto : globalThis.crypto
    if (!cryptoObj || !cryptoObj.subtle) {
      throw new Error('Web Crypto API no disponible')
    }

    // Derivar clave de 256 bits mediante SHA-256
    const enc = new TextEncoder()
    const keyHash = await cryptoObj.subtle.digest('SHA-256', enc.encode(CIPHER_SECRET))
    const cryptoKey = await cryptoObj.subtle.importKey('raw', keyHash, { name: 'AES-GCM' }, false, ['decrypt'])

    // Decodificar Base64 a Uint8Array
    function b64ToUint8(b64) {
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(b64, 'base64')
      }
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i)
      }
      return bytes
    }

    const iv = b64ToUint8(encryptedPayload.iv)
    const cipherData = b64ToUint8(encryptedPayload.data)

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      cipherData
    )

    const rawJson = new TextDecoder().decode(decryptedBuffer)
    const rawPadron = JSON.parse(rawJson)

    // Indexar votantes en memoria RAM
    voters = rawPadron.map(item => {
      const flags = item[7]
      return {
        registro: item[0],
        nombreCompleto: item[1],
        primerApellido: item[2],
        segundoApellido: item[3],
        nombres: item[4],
        mesa: item[5],
        esJurado: item[6] === 1,
        carrera: 'Medicina Veterinaria y Zootecnia',
        facultad: 'Ciencias Veterinarias',
        habilitadoCentro: (flags & 4) !== 0,
        habilitadoIcu: (flags & 2) !== 0,
        habilitadoFul: (flags & 1) !== 0,
        normNombre: normalizeText(item[1]),
        normRegistro: item[0].trim()
      }
    })

    registroMap.clear()
    voters.forEach(v => registroMap.set(v.normRegistro, v))
    isReady = true
    return voters
  } catch (err) {
    console.error('Error al descifrar el padrón en memoria:', err)
    throw err
  }
}

/**
 * Inicializa el motor de búsqueda (idempotente)
 */
export function initEngine() {
  if (!initPromise) {
    initPromise = decryptDatabase()
  }
  return initPromise
}

// Iniciar descifrado inmediatamente en segundo plano
initEngine()

/**
 * Busca votantes por Registro Universitario o Nombre Completo/Incompleto.
 */
export async function searchVoters(query) {
  if (!isReady) {
    await initEngine()
  }

  const rawQ = (query || '').trim()
  if (!rawQ) {
    return { type: 'empty' }
  }

  const isNumeric = /^\d+$/.test(rawQ)
  const normQ = normalizeText(rawQ)

  // 1. Si es numérico, búsqueda instantánea O(1) por registro exacto
  if (isNumeric) {
    const exactMatch = registroMap.get(normQ)
    if (exactMatch) {
      return { type: 'single', result: exactMatch }
    }

    // Coincidencia parcial numérica
    const partialMatches = voters.filter(v => v.normRegistro.includes(normQ))
    if (partialMatches.length === 1) {
      return { type: 'single', result: partialMatches[0] }
    } else if (partialMatches.length > 1) {
      return {
        type: 'multiple',
        results: partialMatches.slice(0, 30),
        total: partialMatches.length,
        query: rawQ
      }
    }
    return { type: 'none', query: rawQ }
  }

  // 2. Búsqueda por Nombre Completo o Incompleto (Tokenizada y tolerante)
  const tokens = normQ.split(' ').filter(Boolean)
  if (tokens.length === 0) {
    return { type: 'empty' }
  }

  const matches = voters.filter(v => {
    return tokens.every(token => v.normNombre.includes(token))
  })

  if (matches.length === 0) {
    return { type: 'none', query: rawQ }
  }

  if (matches.length === 1) {
    return { type: 'single', result: matches[0] }
  }

  // Ordenar priorizando coincidencias que inician con el primer token
  matches.sort((a, b) => {
    const aStarts = a.normNombre.startsWith(tokens[0])
    const bStarts = b.normNombre.startsWith(tokens[0])
    if (aStarts && !bStarts) return -1
    if (!aStarts && bStarts) return 1
    return a.normNombre.localeCompare(b.normNombre)
  })

  return {
    type: 'multiple',
    results: matches.slice(0, 40),
    total: matches.length,
    query: rawQ
  }
}

export function getStats() {
  return {
    totalVotantes: voters.length,
    totalJurados: voters.filter(v => v.esJurado).length,
    isReady
  }
}
