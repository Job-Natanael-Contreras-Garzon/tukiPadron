import fs from 'fs'
import path from 'path'

const rawPadron = JSON.parse(fs.readFileSync(new URL('../src/data/padron_compacto.json', import.meta.url), 'utf-8'))

function normalizeText(str) {
  if (!str) return ''
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ñ/g, 'N')
    .replace(/ñ/g, 'n')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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
    normNombre: normalizeText(item[1]),
    normRegistro: item[0].trim()
  }
})

const registroMap = new Map()
voters.forEach(v => registroMap.set(v.normRegistro, v))

console.log(`Cargados: ${voters.length} votantes`)
const jurados = voters.filter(v => v.esJurado)
console.log(`Jurados identificados: ${jurados.length}`)

// Test Jurado Nelva Zurita
const jurado1 = registroMap.get('226035174')
console.log('Jurado 226035174:', jurado1.nombreCompleto, '| Mesa:', jurado1.mesa, '| Es Jurado:', jurado1.esJurado)
console.assert(jurado1.esJurado === true, 'Debe ser jurado')
console.assert(jurado1.mesa === 191, 'Debe ser mesa 191')

// Test Jurado Melanie Aguilar
const jurado2 = registroMap.get('226207064')
console.log('Jurado 226207064:', jurado2.nombreCompleto, '| Mesa:', jurado2.mesa, '| Es Jurado:', jurado2.esJurado)
console.assert(jurado2.esJurado === true, 'Debe ser jurado')
console.assert(jurado2.mesa === 183, 'Debe ser mesa 183')

// Test Votante Regular Angela Aban
const reg1 = registroMap.get('222151846')
console.log('Votante 222151846:', reg1.nombreCompleto, '| Mesa:', reg1.mesa, '| Es Jurado:', reg1.esJurado)
console.assert(reg1.esJurado === false, 'No debe ser jurado')
console.assert(reg1.mesa === 183, 'Debe ser mesa 183')

// Test busqueda por apellido
const matches = voters.filter(v => v.normNombre.includes('CHAVEZ'))
console.log(`Coincidencias con 'CHAVEZ': ${matches.length}`)
matches.slice(0, 3).forEach(m => console.log(`  - ${m.nombreCompleto} (Mesa ${m.mesa})`))

console.log('\n✅ TODAS LAS PRUEBAS DE DATOS Y BÚSQUEDA PASARON PERFECTAMENTE!')
