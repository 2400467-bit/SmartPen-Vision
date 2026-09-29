// ---- Menu hamburguer ----
function toggleMenu(){
  const menu = document.getElementById("menuOpcoes");
  const btn = document.querySelector(".menu-toggle");
  const aberto = menu.classList.toggle("aberto");
  btn.classList.toggle("aberto", aberto);
  btn.setAttribute("aria-expanded", aberto);
}

// ---- Tema claro/escuro ----
function initTheme(){
  const btn = document.getElementById("themeToggle");
  if(!btn) return;
  const root = document.documentElement;

  btn.addEventListener("click", () => {
    const estaEscuro = root.getAttribute("data-theme") === "dark";
    if(estaEscuro){
      root.removeAttribute("data-theme");
      localStorage.setItem("caneta3d-theme", "light");
    } else {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("caneta3d-theme", "dark");
    }
  });
}

// ---- Reveal ao rolar a página (evita animar tudo de uma vez no load) ----
function initScrollReveal(){
  const els = document.querySelectorAll(".animar");
  if(!("IntersectionObserver" in window)){
    els.forEach(el => el.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  els.forEach((el, i) => {
    // aplica um pequeno escalonamento automático caso não haja delay manual definido
    if(!el.style.transitionDelay){
      el.style.transitionDelay = Math.min(i * 60, 300) + "ms";
    }
    io.observe(el);
  });
}

// ---- Slider comparador (antes / depois) ----
function initCompareSlider(){
  const wrap = document.getElementById("compareSlider");
  if(!wrap) return;
  const handle = document.getElementById("compareHandle");
  const after = document.getElementById("compareAfter");
  let dragging = false;

  function setPosition(pct){
    pct = Math.min(100, Math.max(0, pct));
    after.style.clipPath = `inset(0 0 0 ${pct}%)`;
    handle.style.left = pct + "%";
    handle.setAttribute("aria-valuenow", Math.round(pct));
  }

  function pctFromClientX(clientX){
    const rect = wrap.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * 100;
  }

  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener("pointerdown", (e) => {
    if(e.target === handle || handle.contains(e.target)) return;
    setPosition(pctFromClientX(e.clientX));
  });
  window.addEventListener("pointermove", (e) => {
    if(!dragging) return;
    setPosition(pctFromClientX(e.clientX));
  });
  window.addEventListener("pointerup", () => { dragging = false; });

  handle.addEventListener("keydown", (e) => {
    const current = parseFloat(handle.style.left) || 50;
    if(e.key === "ArrowLeft"){ setPosition(current - 3); e.preventDefault(); }
    if(e.key === "ArrowRight"){ setPosition(current + 3); e.preventDefault(); }
  });

  setPosition(50);
}

// ---- Lightbox de imagens: clique para ampliar, lupa ao passar o mouse,
//      setas do teclado e da própria imagem para navegar entre as fotos da página ----
function initLightboxZoom(){
  // Seleciona as imagens "de conteúdo" da página (miniaturas do projeto e fotos dos participantes).
  // O comparador antes/depois fica de fora para não conflitar com o gesto de arrastar a barra.
  const imgs = Array.from(document.querySelectorAll(".image-frame img, .participante-foto img"));
  if(imgs.length === 0) return;

  imgs.forEach(img => img.classList.add("zoomable-img"));

  // Monta o overlay do lightbox uma única vez
  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";
  overlay.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Fechar">&times;</button>
    <button type="button" class="lightbox-nav lightbox-prev" aria-label="Imagem anterior">&#10094;</button>
    <div class="lightbox-stage">
      <div class="lightbox-lens"></div>
      <img class="lightbox-img" src="" alt="">
    </div>
    <button type="button" class="lightbox-nav lightbox-next" aria-label="Próxima imagem">&#10095;</button>
    <div class="lightbox-counter"></div>
  `;
  document.body.appendChild(overlay);

  const lightboxImg = overlay.querySelector(".lightbox-img");
  const lens = overlay.querySelector(".lightbox-lens");
  const counter = overlay.querySelector(".lightbox-counter");
  const btnClose = overlay.querySelector(".lightbox-close");
  const btnPrev = overlay.querySelector(".lightbox-prev");
  const btnNext = overlay.querySelector(".lightbox-next");

  let atual = 0;

  function atualizarImagem(){
    const origem = imgs[atual];
    lightboxImg.src = origem.currentSrc || origem.src;
    lightboxImg.alt = origem.alt || "";
    counter.textContent = (atual + 1) + " / " + imgs.length;
    lens.style.display = "none";
  }
  function abrir(indice){
    atual = indice;
    atualizarImagem();
    overlay.classList.add("aberto");
    document.body.style.overflow = "hidden";
    btnClose.focus();
  }
  function fechar(){
    overlay.classList.remove("aberto");
    document.body.style.overflow = "";
  }
  function proxima(){ atual = (atual + 1) % imgs.length; atualizarImagem(); }
  function anterior(){ atual = (atual - 1 + imgs.length) % imgs.length; atualizarImagem(); }

  imgs.forEach((img, indice) => {
    img.addEventListener("click", () => abrir(indice));
  });

  btnClose.addEventListener("click", fechar);
  btnNext.addEventListener("click", proxima);
  btnPrev.addEventListener("click", anterior);
  overlay.addEventListener("click", (e) => { if(e.target === overlay) fechar(); });

  document.addEventListener("keydown", (e) => {
    if(!overlay.classList.contains("aberto")) return;
    if(e.key === "Escape") fechar();
    if(e.key === "ArrowRight") proxima();
    if(e.key === "ArrowLeft") anterior();
  });

  // Lupa: amplia a região da imagem em torno do cursor (efeito de zoom extra ao passar o mouse)
  const ZOOM = 2.3;
  function moverLupa(clientX, clientY){
    const rect = lightboxImg.getBoundingClientRect();
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    const tamanhoLente = lens.offsetWidth;

    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));

    lens.style.left = (x - tamanhoLente / 2) + "px";
    lens.style.top = (y - tamanhoLente / 2) + "px";
    lens.style.backgroundImage = `url("${lightboxImg.src}")`;
    lens.style.backgroundSize = (rect.width * ZOOM) + "px " + (rect.height * ZOOM) + "px";
    lens.style.backgroundPosition = (-(x * ZOOM - tamanhoLente / 2)) + "px " + (-(y * ZOOM - tamanhoLente / 2)) + "px";
  }
  lightboxImg.addEventListener("mousemove", (e) => {
    lens.style.display = "block";
    moverLupa(e.clientX, e.clientY);
  });
  lightboxImg.addEventListener("mouseleave", () => { lens.style.display = "none"; });
}

// ---- Caneta 3D "explodida" (Sobre): em telas de toque não existe hover de
//      verdade, então um toque na caneta alterna entre montada/desmontada ----
function initExplodedCaneta(){
  const caneta = document.getElementById("explodedCaneta");
  if(!caneta) return;

  // Só ativa o toggle por toque em dispositivos sem hover confiável (telas de toque)
  const semHover = window.matchMedia("(hover: none)").matches;
  if(!semHover) return;

  caneta.addEventListener("click", () => {
    caneta.classList.toggle("aberto");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initScrollReveal();
  initCompareSlider();
  initLightboxZoom();
  initExplodedCaneta();
});
