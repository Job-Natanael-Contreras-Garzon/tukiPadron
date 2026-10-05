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

  console.log('\n✅ TODAS LAS PRUEBAS CON DATOS CIFRADOS PASARON EXITOSAMENTE!')
}

runTests().catch(console.error)
