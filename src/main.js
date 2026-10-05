import { searchVoters, getVoterByRegistro } from './searchEngine.js'
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
      badge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm'
    } else {
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-[#EC7D17]"></span>
        <span>⚡ Offline</span>
      `
      badge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EC7D17] text-white shadow-sm'
    }
  }

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  updateOnlineStatus()

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Service Worker registrado con éxito:', reg.scope)
      }).catch((err) => {
        console.warn('Error al registrar Service Worker:', err)
      })
    })
  }
}

// --- 2. Carrusel Hero con 10 Imágenes WebP ---
function initCarousel() {
  const track = document.getElementById('carousel-track')
  const dotsContainer = document.getElementById('carousel-dots')
  const prevBtn = document.getElementById('carousel-prev')
  const nextBtn = document.getElementById('carousel-next')
  if (!track) return

  const totalSlides = 10
  let currentSlide = 0
  let autoplayTimer = null

  // Construir los 10 slides
  track.innerHTML = ''
  dotsContainer.innerHTML = ''

  for (let i = 1; i <= totalSlides; i++) {
    const slide = document.createElement('div')
    slide.className = 'w-full h-full flex-shrink-0 relative overflow-hidden'
    slide.innerHTML = `
      <img
        src="/images/hero-${i}.webp"
        alt="Padrón Unidad Veterinaria Banner ${i}"
        class="w-full h-full object-cover select-none"
        loading="${i === 1 ? 'eager' : 'lazy'}"
      />
    `
    track.appendChild(slide)

    const dot = document.createElement('button')
    dot.className = `w-2 h-2 rounded-full transition-all ${i === 1 ? 'bg-white w-5' : 'bg-white/50'}`
    dot.setAttribute('aria-label', `Ir al slide ${i}`)
    dot.addEventListener('click', () => goToSlide(i - 1))
    dotsContainer.appendChild(dot)
  }

  function updateCarousel() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`
    const dots = dotsContainer.querySelectorAll('button')
    dots.forEach((dot, idx) => {
      if (idx === currentSlide) {
        dot.className = 'w-5 h-2 rounded-full bg-white transition-all shadow-sm'
      } else {
        dot.className = 'w-2 h-2 rounded-full bg-white/50 transition-all hover:bg-white/80'
      }
    })
  }

  function goToSlide(index) {
    currentSlide = (index + totalSlides) % totalSlides
    updateCarousel()
    resetAutoplay()
  }

  function nextSlide() {
    goToSlide(currentSlide + 1)
  }

  function prevSlide() {
    goToSlide(currentSlide - 1)
  }

  prevBtn?.addEventListener('click', prevSlide)
  nextBtn?.addEventListener('click', nextSlide)

  // Autoplay cada 4.5 segundos
  function startAutoplay() {
    autoplayTimer = setInterval(nextSlide, 4500)
  }

  function resetAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer)
    startAutoplay()
  }

  startAutoplay()

  // Soporte para gestos táctiles (Swipe móvil)
  let touchStartX = 0
  let touchEndX = 0

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX
  }, { passive: true })

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX
    const diff = touchStartX - touchEndX
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide()
      else prevSlide()
    }
  }, { passive: true })
}

// --- 3. Lógica de Consulta y Motor de Búsqueda ---
function initSearch() {
  const form = document.getElementById('search-form')
  const input = document.getElementById('search-input')
  const clearBtn = document.getElementById('btn-clear')
  const loaderView = document.getElementById('loader-view')
  const resultView = document.getElementById('result-view')
  const multipleView = document.getElementById('multiple-view')
  const notfoundView = document.getElementById('notfound-view')
  const btnBack = document.getElementById('btn-back')
  const btnNewSearch = document.getElementById('btn-new-search')
  const btnRetry = document.getElementById('btn-retry')

  // Control del botón de limpiar texto
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

  function hideAllViews() {
    loaderView?.classList.add('hidden')
    resultView?.classList.add('hidden')
    multipleView?.classList.add('hidden')
    notfoundView?.classList.add('hidden')
  }

  function resetToSearch() {
    hideAllViews()
    if (input) {
      input.value = ''
      clearBtn?.classList.add('hidden')
      input.focus()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  btnBack?.addEventListener('click', resetToSearch)
  btnNewSearch?.addEventListener('click', resetToSearch)
  btnRetry?.addEventListener('click', () => {
    hideAllViews()
    input?.focus()
  })

  function handleSearch() {
    const rawVal = input?.value.trim()
    if (!rawVal) {
      input?.focus()
      input?.classList.add('ring-2', 'ring-[#EC7D17]')
      setTimeout(() => input?.classList.remove('ring-2', 'ring-[#EC7D17]'), 600)
      return
    }

    hideAllViews()
    loaderView?.classList.remove('hidden')
    loaderView?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

    // Micro-loader visual controlado de ~350ms para UX
    setTimeout(() => {
      const outcome = searchVoters(rawVal)
      loaderView?.classList.add('hidden')

      if (outcome.type === 'single') {
        renderSingle(outcome.result)
      } else if (outcome.type === 'multiple') {
        renderMultiple(outcome.results, outcome.total, outcome.query)
      } else {
        renderNotFound(outcome.query || rawVal)
      }
    }, 350)
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    handleSearch()
  })

  // Renderizar resultado único positivo
  function renderSingle(voter) {
    hideAllViews()
    resultView?.classList.remove('hidden')

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
    if (mesaEl) {
      mesaEl.textContent = `MESA ${voter.mesa || '183'}`
    }

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

    resultView?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  // Renderizar múltiples coincidencias (Desambiguación)
  function renderMultiple(list, total, query) {
    hideAllViews()
    multipleView?.classList.remove('hidden')

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
          renderSingle(v)
        })
        listEl.appendChild(itemBtn)
      })
    }

    multipleView?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  // Renderizar no encontrado
  function renderNotFound(q) {
    hideAllViews()
    notfoundView?.classList.remove('hidden')
    const queryEl = document.getElementById('notfound-query')
    if (queryEl) {
      queryEl.textContent = `No encontramos a ningún estudiante con "${q}" en el padrón.`
    }
    notfoundView?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

// --- 4. Acordeón de Distribución Oficial de Mesas ---
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

  // Renderizar las 9 mesas
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

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker()
  initCarousel()
  initSearch()
  initAccordion()
})
