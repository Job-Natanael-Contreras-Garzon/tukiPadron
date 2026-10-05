// Motor de normalización y búsqueda en memoria para el Padrón Electoral
import rawPadron from './data/padron_compacto.json'

/**
 * Normaliza una cadena de texto eliminando tildes, diacríticos y espacios redundantes.
 * Opcionalmente normaliza la Ñ para permitir búsqueda tolerante a teclados sin Ñ.
 */
export function normalizeText(str) {
  if (!str) return ''
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes (Á -> A, etc.)
    .replace(/Ñ/g, 'N')             // Permite buscar NUNEZ o NUÑEZ
    .replace(/ñ/g, 'n')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')   // Quita caracteres especiales
    .replace(/\s+/g, ' ')
    .trim()
}

// Convertir registros compactos a objetos de fácil acceso
// [registro, nombre_completo, primer_apellido, segundo_apellido, nombres, mesa, es_jurado, flags]
const voters = rawPadron.map(item => {
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
    // Pre-normalizamos para que la búsqueda sea de 0 milisegundos
    normNombre: normalizeText(item[1]),
    normRegistro: item[0].trim()
  }
})

// Mapa hash O(1) para búsqueda directa por registro
const registroMap = new Map()
voters.forEach(v => {
  registroMap.set(v.normRegistro, v)
})

/**
 * Busca votantes por Registro Universitario o Nombre Completo/Incompleto.
 * @param {string} query Texto ingresado por el usuario
 * @returns {object} { type: 'empty' | 'single' | 'multiple' | 'none', result, results, total }
 */
export function searchVoters(query) {
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

    // Si no es exacto pero es numérico, buscar por coincidencia parcial de registro
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

  // 2. Búsqueda por Nombre Completo o Incompleto (Búsqueda tokenizada cercana)
  const tokens = normQ.split(' ').filter(Boolean)
  if (tokens.length === 0) {
    return { type: 'empty' }
  }

  // Filtramos: cada palabra ingresada debe existir dentro del nombre completo del estudiante
  const matches = voters.filter(v => {
    return tokens.every(token => v.normNombre.includes(token))
  })

  if (matches.length === 0) {
    return { type: 'none', query: rawQ }
  }

  if (matches.length === 1) {
    return { type: 'single', result: matches[0] }
  }

  // Múltiples coincidencias: ordenar dando prioridad a coincidencia de primer apellido
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

/**
 * Obtiene un estudiante directamente por su número de registro
 */
export function getVoterByRegistro(reg) {
  return registroMap.get(reg.toString().trim()) || null
}

/**
 * Retorna las estadísticas del padrón cargado
 */
export function getStats() {
  return {
    totalVotantes: voters.length,
    totalJurados: voters.filter(v => v.esJurado).length
  }
}
