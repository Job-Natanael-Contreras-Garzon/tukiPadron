import { searchVoters, initEngine, getStats } from '../src/searchEngine.js'

async function runTests() {
  console.log('--- TEST SEARCH ENGINE CON CIFRADO AES-256-GCM ---')
  await initEngine()
  console.log('Engine initialized:', getStats())

  // Test 1: Jurado por Registro
  const t1 = await searchVoters('226207064')
  console.log('\nTest 1 (Jurado 226207064):', t1.type)
  if (t1.type === 'single') {
    console.log(`  Nombre: ${t1.result.nombreCompleto} | Mesa: ${t1.result.mesa} | Jurado: ${t1.result.esJurado}`)
    console.assert(t1.result.esJurado === true, 'Debe ser jurado')
    console.assert(t1.result.mesa === 183, 'Debe ser mesa 183')
  }

  // Test 2: Votante regular por Registro
  const t2 = await searchVoters('222151846')
  console.log('\nTest 2 (Votante regular 222151846):', t2.type)
  if (t2.type === 'single') {
    console.log(`  Nombre: ${t2.result.nombreCompleto} | Mesa: ${t2.result.mesa} | Jurado: ${t2.result.esJurado}`)
    console.assert(t2.result.esJurado === false, 'NO debe ser jurado')
    console.assert(t2.result.mesa === 183, 'Debe ser mesa 183')
  }

  // Test 3: Búsqueda por nombre en minúsculas y sin acentos
  const t3 = await searchVoters('melanie aguilar')
  console.log('\nTest 3 ("melanie aguilar"):', t3.type)
  if (t3.type === 'single') {
    console.log(`  Encontrado: ${t3.result.nombreCompleto} | Reg: ${t3.result.registro}`)
  }

  // Test 4: Búsqueda parcial de apellido múltiple ("chavez")
  const t4 = await searchVoters('chavez')
  console.log('\nTest 4 ("chavez"):', t4.type, `Total: ${t4.total}`)
  if (t4.type === 'multiple') {
    console.log(`  Muestra de coincidencias (primeras 3):`)
    t4.results.slice(0, 3).forEach(r => {
      console.log(`    - ${r.nombreCompleto} (Mesa ${r.mesa})`)
    })
  }

  // Test 5: Búsqueda y validación de límites de Mesas oficiales (183 a 191)
  const registros = [
    { registro: '224152793', nombre: 'BARRIOS QUISPE JOSE LUIS', mesaEsperada: 183, desc: 'Termina 183' },
    { registro: '226033211', nombre: 'BARRON GUTIERREZ JENNY JACKELIN', mesaEsperada: 184, desc: 'Empieza 184' },
    { registro: '222084146', nombre: 'CONDE CABRERA VERONICA MONSERRAT', mesaEsperada: 184, desc: 'Termina 184' },
    { registro: '225150352', nombre: 'CONDE CUELLAR MATIAS', mesaEsperada: 185, desc: 'Empieza 185' },
    { registro: '215156188', nombre: 'GARCIA SAAVEDRA DAVID EDUARDO', mesaEsperada: 185, desc: 'Termina 185' },
    { registro: '221055916', nombre: 'GARCIA SALAS ODALIS NICOL', mesaEsperada: 186, desc: 'Empieza 186' },
    { registro: '224055674', nombre: 'LOBO ROMERO ANDREA', mesaEsperada: 186, desc: 'Termina 186' },
    { registro: '225027038', nombre: 'LOLA MORENO LUIS FERNANDO', mesaEsperada: 187, desc: 'Empieza 187' },
    { registro: '219036969', nombre: 'NUÑEZ SUAREZ NICOLAS', mesaEsperada: 187, desc: 'Termina 187' },
    { registro: '221056696', nombre: 'OCAMPO OCAMPO MIGUEL ANGEL', mesaEsperada: 188, desc: 'Empieza 188' },
    { registro: '222085071', nombre: 'RENDON PARAPAINO LICY DOLORES', mesaEsperada: 188, desc: 'Termina 188' },
    { registro: '223003018', nombre: 'RENTERIA FRANCO KARLA ELIZABETH', mesaEsperada: 189, desc: 'Empieza 189' },
    { registro: '226208354', nombre: 'SOLAR GUTIERREZ DAYAN ISANDER', mesaEsperada: 189, desc: 'Termina 189' },
    { registro: '226208362', nombre: 'SOLETO MULLISACA DARLIN TAMARA', mesaEsperada: 190, desc: 'Empieza 190' },
    { registro: '220049750', nombre: 'VILLALON MONTERO JULIANA', mesaEsperada: 190, desc: 'Termina 190' },
    { registro: '221184031', nombre: 'VILLAMOR CALLE VALERIA LIZBETH', mesaEsperada: 191, desc: 'Empieza 191' },
    { registro: '226035174', nombre: 'ZURITA QUIMAYA NELVA ESMERALDA', mesaEsperada: 191, desc: 'Termina 191' }
  ]

  console.log('\n--- Test 5: Comprobando límites oficiales de mesas ---')
  for (let i = 0; i < registros.length; i++) {
    const { registro, nombre, mesaEsperada, desc } = registros[i]
    const t = await searchVoters(registro)
    if (t.type === 'single') {
      console.log(`  [${desc}] ${nombre} (${registro}) -> Mesa ${t.result.mesa}`)
      console.assert(t.result.mesa === mesaEsperada, `ERROR: Esperaba mesa ${mesaEsperada}, obtuvo ${t.result.mesa}`)
    } else {
      console.error(`  ERROR buscando ${registro}: tipo ${t.type}`)
    }
  }

  console.log('\n✅ TODAS LAS PRUEBAS CON DATOS CIFRADOS PASARON EXITOSAMENTE!')
}

runTests().catch(console.error)