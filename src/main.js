import { searchVoters } from './searchEngine.js'
import mesasInfo from './data/mesas_info.json'

// --- 1. Inicialización de Service Worker & Estado Offline ---
function initServiceWorker() {
  const badge = document.getElementById('offline-badge')

  function updateOnlineStatus() {
    if (!badge) return
    if (navigator.onLine) {
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
        <span>Online</span>
      `
      badge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm'
    } else {
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-[#EC7D17]"></span>
        <span>⚡ Offline</span>
      `
      badge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EC7D17] text-white shadow-sm'
    }
  }

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  updateOnlineStatus()

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Service Worker registrado:', reg.scope)
      }).catch((err) => {
        console.warn('Error al registrar Service Worker:', err)
      })
    })
  }
}

// --- 2. Flujo de Navegación entre Pantallas Móviles ---
function initScreens() {
  const appHeader = document.getElementById('app-header')
  const screenHome = document.getElementById('screen-home')
  const screenResult = document.getElementById('screen-result')

  const form = document.getElementById('search-form')
  const input = document.getElementById('search-input')
  const clearBtn = document.getElementById('btn-clear')

  const loaderView = document.getElementById('loader-view')
  const singleCard = document.getElementById('single-result-card')
  const multiCard = document.getElementById('multiple-result-card')
  const notfoundCard = document.getElementById('notfound-result-card')

  const btnBack = document.getElementById('btn-back')
  const btnNewSearch = document.getElementById('btn-new-search')
  const btnBackMulti = document.getElementById('btn-back-multi')
  const btnRetry = document.getElementById('btn-retry')

  // Control del botón limpiar texto
  input?.addEventListener('input', () => {
    if (input.value.trim().length > 0) {
      clearBtn?.classList.remove('hidden')
    } else {
      clearBtn?.classList.add('hidden')
    }
  })

  clearBtn?.addEventListener('click', () => {
    input.value = ''
    clearBtn.classList.add('hidden')
    input.focus()
  })

  /**
   * Transición hacia Pantalla 1: Home (Cabecera oculta)
   */
  function showHomeScreen() {
    // 1. Ocultar pantalla de respuesta y cabecera
    screenResult?.classList.add('hidden')
    appHeader?.classList.add('hidden')

    // 2. Mostrar pantalla de consulta con transición
    screenHome?.classList.remove('hidden', 'animate-slide-in-right')
    screenHome?.classList.add('animate-slide-in-left')

    // 3. Resetear foco y limpiar
    if (input) {
      input.value = ''
      clearBtn?.classList.add('hidden')
      input.focus()
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * Transición hacia Pantalla 2: Respuesta (Cabecera visible)
   */
  function showResultScreen() {
    // 1. Ocultar pantalla home
    screenHome?.classList.add('hidden')

    // 2. Mostrar cabecera superior y pantalla de respuesta
    appHeader?.classList.remove('hidden')
    screenResult?.classList.remove('hidden', 'animate-slide-in-left')
    screenResult?.classList.add('animate-slide-in-right')

    // 3. Preparar estado de loader
    singleCard?.classList.add('hidden')
    multiCard?.classList.add('hidden')
    notfoundCard?.classList.add('hidden')
    loaderView?.classList.remove('hidden')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Eventos de retorno a la pantalla inicial
  btnBack?.addEventListener('click', showHomeScreen)
  btnNewSearch?.addEventListener('click', showHomeScreen)
  btnBackMulti?.addEventListener('click', showHomeScreen)
  btnRetry?.addEventListener('click', showHomeScreen)

  // Ejecutar búsqueda al enviar formulario
  async function handleSearch() {
    const rawVal = input?.value.trim()
    if (!rawVal) {
      input?.focus()
      input?.classList.add('ring-2', 'ring-[#EC7D17]')
      setTimeout(() => input?.classList.remove('ring-2', 'ring-[#EC7D17]'), 600)
      return
    }

    // Cambiar inmediatamente a la vista de respuesta (estilo pantalla móvil)
    showResultScreen()

    // Micro-loader controlado de ~350ms para retroalimentación deliberada de UX
    setTimeout(async () => {
      try {
        const outcome = await searchVoters(rawVal)
        loaderView?.classList.add('hidden')

        if (outcome.type === 'single') {
          renderSingleResult(outcome.result)
        } else if (outcome.type === 'multiple') {
          renderMultipleResults(outcome.results, outcome.total, outcome.query)
        } else {
          renderNotFoundResult(outcome.query || rawVal)
        }
      } catch (err) {
        console.error('Error en búsqueda:', err)
        loaderView?.classList.add('hidden')
        renderNotFoundResult(rawVal)
      }
    }, 350)
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    handleSearch()
  })

  // Renderizar resultado único positivo
  function renderSingleResult(voter) {
    singleCard?.classList.remove('hidden')

    // 1. Banner de Jurado Electoral
    const banner = document.getElementById('jurado-banner')
    if (banner) {
      if (voter.esJurado) {
        banner.className = 'mb-4 rounded-2xl p-4 bg-gradient-to-r from-[#EC7D17] to-[#d66e11] text-white flex items-center gap-3 shadow-orange animate-pulse-glow'
        banner.innerHTML = `
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-xl">
            🗳️
          </div>
          <div>
            <h4 class="text-xs font-black uppercase tracking-wider">¡Usted es Jurado Electoral!</h4>
            <p class="text-[11px] text-white/95 mt-0.5 leading-snug">
              Designado oficialmente para la <strong>MESA ${voter.mesa}</strong> de Ciencias Veterinarias.
            </p>
          </div>
        `
      } else {
        banner.className = 'mb-4 rounded-2xl p-3 bg-slate-100 text-slate-700 flex items-center gap-3 border border-slate-200'
        banner.innerHTML = `
          <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0 text-sm font-bold">
            ℹ️
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-800">Usted NO es Jurado Electoral</h4>
            <p class="text-[11px] text-slate-500">Votante regular habilitado para emitir su voto.</p>
          </div>
        `
      }
    }

    // 2. Mesa
    const mesaEl = document.getElementById('res-mesa')
    if (mesaEl) mesaEl.textContent = `MESA ${voter.mesa || '183'}`

    // 3. Nombre y Registro
    const nombreEl = document.getElementById('res-nombre')
    if (nombreEl) nombreEl.textContent = voter.nombreCompleto

    const regEl = document.getElementById('res-registro')
    if (regEl) regEl.textContent = voter.registro

    // 4. Habilitaciones (Centro Interno, ICU, FUL)
    const habContainer = document.getElementById('res-habilitaciones')
    if (habContainer) {
      habContainer.innerHTML = `
        <div class="rounded-xl p-2.5 text-center ${voter.habilitadoCentro ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
          <span class="block text-[10px] font-bold uppercase">C. Interno</span>
          <span class="text-xs font-extrabold flex items-center justify-center gap-1 mt-0.5">
            ${voter.habilitadoCentro ? '✅ SI' : '❌ NO'}
          </span>
        </div>
        <div class="rounded-xl p-2.5 text-center ${voter.habilitadoIcu ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
          <span class="block text-[10px] font-bold uppercase">ICU Fac.</span>
          <span class="text-xs font-extrabold flex items-center justify-center gap-1 mt-0.5">
            ${voter.habilitadoIcu ? '✅ SI' : '❌ NO'}
          </span>
        </div>
        <div class="rounded-xl p-2.5 text-center ${voter.habilitadoFul ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
          <span class="block text-[10px] font-bold uppercase">FUL</span>
          <span class="text-xs font-extrabold flex items-center justify-center gap-1 mt-0.5">
            ${voter.habilitadoFul ? '✅ SI' : '❌ NO'}
          </span>
        </div>
      `
    }
  }

  // Renderizar múltiples coincidencias (Desambiguación)
  function renderMultipleResults(list, total, query) {
    multiCard?.classList.remove('hidden')

    const countEl = document.getElementById('multi-count')
    if (countEl) countEl.textContent = `${total} estudiantes`

    const listEl = document.getElementById('multi-list')
    if (listEl) {
      listEl.innerHTML = ''
      list.forEach((v) => {
        const itemBtn = document.createElement('button')
        itemBtn.className = 'w-full text-left p-3.5 rounded-2xl bg-slate-50 hover:bg-[#31A6CA]/10 border border-slate-200 hover:border-[#31A6CA] transition-all flex items-center justify-between group active:scale-[0.99]'
        itemBtn.innerHTML = `
          <div class="pr-2 min-w-0 flex-1">
            <p class="text-xs font-black text-[#040304] group-hover:text-[#31A6CA] truncate uppercase">
              ${v.nombreCompleto}
            </p>
            <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span class="font-bold text-slate-600">Reg: ${v.registro}</span>
              ${v.esJurado ? '<span class="px-1.5 py-0.2 rounded bg-[#EC7D17] text-white text-[9px] font-black uppercase">Jurado</span>' : ''}
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="inline-block px-2.5 py-1 rounded-xl bg-[#31A6CA] text-white text-xs font-black shadow-sm">
              Mesa ${v.mesa}
            </span>
          </div>
        `
        itemBtn.addEventListener('click', () => {
          multiCard?.classList.add('hidden')
          renderSingleResult(v)
        })
        listEl.appendChild(itemBtn)
      })
    }
  }

  // Renderizar no encontrado
  function renderNotFoundResult(q) {
    notfoundCard?.classList.remove('hidden')
    const queryEl = document.getElementById('notfound-query')
    if (queryEl) {
      queryEl.textContent = `No encontramos a ningún estudiante con "${q}" en el padrón.`
    }
  }
}

// --- 3. Acordeón de Distribución Oficial de Mesas ---
function initAccordion() {
  const toggleBtn = document.getElementById('accordion-toggle')
  const content = document.getElementById('accordion-content')
  const arrow = document.getElementById('accordion-arrow')
  const container = document.getElementById('mesas-table-container')

  if (!toggleBtn || !content) return

  toggleBtn.addEventListener('click', () => {
    const isExpanded = !content.classList.contains('hidden')
    if (isExpanded) {
      content.classList.add('hidden')
      arrow?.classList.remove('rotate-180')
    } else {
      content.classList.remove('hidden')
      arrow?.classList.add('rotate-180')
    }
  })

  if (container && mesasInfo) {
    container.innerHTML = ''
    mesasInfo.forEach((m) => {
      const card = document.createElement('div')
      card.className = 'p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-xs space-y-1'
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-extrabold text-[#31A6CA] text-xs">MESA ${m.mesa}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            ${m.total} votantes
          </span>
        </div>
        <div class="text-[11px] text-slate-600">
          <p><strong class="text-slate-700">Rango:</strong> ${m.rango_resumido}</p>
          <p class="text-[10px] text-slate-400 truncate">Desde: ${m.desde}</p>
          <p class="text-[10px] text-slate-400 truncate">Hasta: ${m.hasta}</p>
        </div>
        <div class="pt-1 border-t border-slate-100 text-[10px] text-[#EC7D17]">
          <strong>Jurados:</strong> ${m.jurados.join(' · ')}
        </div>
      `
      container.appendChild(card)
    })
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker()
  initScreens()
  initAccordion()
})
