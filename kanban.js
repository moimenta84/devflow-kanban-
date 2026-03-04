"use strict";

// --- UTILIDADES ---

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validadorTexto(texto) {
  if (!texto) return false;
  return (
    texto.trim().length > 0 && /^[a-zA-ZÁÉÍÓÚáéíóúñÑ\s]+$/.test(texto.trim())
  );
}

function validarTexto(input) {
  if (!validadorTexto(input.value)) {
    input.setCustomValidity("Solo letras y espacios");
  } else {
    input.setCustomValidity("");
  }
}

function validarNumero(input) {
  const val = parseFloat(input.value);
  if (isNaN(val) || val <= 0) {
    input.setCustomValidity("Debe ser mayor que 0");
  } else {
    input.setCustomValidity("");
  }
}

/*
  <--------- CLASE TAREA --------->
*/
class Tareas {
  constructor(
    tareaNombre,
    tareaAsignacion,
    tareaPrioridad,
    tareaDescripcion,
    tareaHours
  ) {
    this.tareaNombre = tareaNombre;
    this.tareaAsignacion = tareaAsignacion;
    this.tareaPrioridad = tareaPrioridad;
    this.tareaDescripcion = tareaDescripcion;
    this.tareaHours = tareaHours;
    this.segundosRestantes = tareaHours * 3600;
    this.estado = "pendiente";
  }
}

/*
   NOMBRE JEFE DE PROYECTO
*/
const pmName = document.getElementById("pmName");

function cargarNombre() {
  let nombreJefe = localStorage.getItem("nombreJefe");

  if (nombreJefe && !validadorTexto(nombreJefe)) {
    localStorage.removeItem("nombreJefe");
    nombreJefe = null;
  }

  if (!nombreJefe) {
    let entrada = prompt("Introduce el nombre del jefe de proyecto");
    nombreJefe = validadorTexto(entrada) ? entrada.trim() : "Anónimo";
  }

  localStorage.setItem("nombreJefe", nombreJefe);
  pmName.textContent = nombreJefe;

  document.getElementById("changeUserBtn").addEventListener("click", () => {
    localStorage.removeItem("nombreJefe");
    localStorage.removeItem("tareas");
    tareas = [];
    location.reload();
  });
}

/*
   FORMULARIO
*/

// <--------- RECUPERO LAS TAREAS --------->
let tareas = JSON.parse(localStorage.getItem("tareas")) || [];
let filtroActivo = "todas";

// <-------- IDENTIFICO LOS INPUTS -------->
const form = document.getElementById("taskForm");
const nombreTarea = document.getElementById("taskName");
const asig = document.getElementById("assignedTo");
const prioridad = document.getElementById("priority");
const description = document.getElementById("description");
const hours = document.getElementById("hours");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  // <------ VALIDAR INPUTS ------>
  validarTexto(nombreTarea);
  validarTexto(asig);
  description.setCustomValidity(""); // descripción es opcional
  validarNumero(hours);

  // <------- VALIDO FORM ------->
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // <------- CREO LA TAREA ------>
  const nuevaTarea = new Tareas(
    nombreTarea.value.trim(),
    asig.value.trim(),
    prioridad.value,
    description.value.trim(),
    Number(hours.value)
  );

  // <-------- AÑADO LA TAREA ------>
  tareas.push(nuevaTarea);
  localStorage.setItem("tareas", JSON.stringify(tareas));

  form.reset();
  renderTasks();
});

/*
   RENDERIZAR TAREAS
*/
function renderTasks() {
  // <------- IDENTIFICO DOM -------->
  const pendiente = document.getElementById("pendienteList");
  const progreso = document.getElementById("progresoList");
  const finalizada = document.getElementById("finalizadaList");

  // <--------- LIMPIO EL INNER --------->
  pendiente.innerHTML = "";
  progreso.innerHTML = "";
  finalizada.innerHTML = "";

  // <------ RECORRO LAS TAREAS ----->
  tareas.forEach((ta, index) => {
    if (filtroActivo !== "todas" && ta.tareaPrioridad !== filtroActivo) return;
    const tarjeta = document.createElement("div");
    tarjeta.classList.add("tarjeta");

    const prioLabel =
      ta.tareaPrioridad.charAt(0).toUpperCase() + ta.tareaPrioridad.slice(1);
    const contadorHTML =
      ta.estado === "progreso"
        ? `<p class="contador" data-id="${index}"></p>`
        : "";

    tarjeta.innerHTML = `
      <div class="tarjeta-header">
        <h4>${escHtml(ta.tareaNombre)}</h4>
        <span class="badge priority-${escHtml(ta.tareaPrioridad)}">${escHtml(prioLabel)}</span>
      </div>
      <p><strong>Asignado:</strong> ${escHtml(ta.tareaAsignacion)}</p>
      ${ta.tareaDescripcion ? `<p class="desc">${escHtml(ta.tareaDescripcion)}</p>` : ""}
      <p class="horas"><strong>Horas:</strong> ${ta.tareaHours}h</p>
      ${contadorHTML}
      <div class="controles">
        <button class="btn-ctrl move-left" title="Mover atrás">&#9664;</button>
        <button class="btn-ctrl move-right" title="Mover adelante">&#9654;</button>
        <button class="btn-delete" title="Eliminar tarea">&#x2715;</button>
      </div>
    `;

    tarjeta
      .querySelector(".move-left")
      .addEventListener("click", () => moverTarea(index, -1));
    tarjeta
      .querySelector(".move-right")
      .addEventListener("click", () => moverTarea(index, 1));
    tarjeta
      .querySelector(".btn-delete")
      .addEventListener("click", () => borrarTarea(index));

    if (ta.estado === "pendiente") pendiente.appendChild(tarjeta);
    if (ta.estado === "progreso") progreso.appendChild(tarjeta);
    if (ta.estado === "finalizada") finalizada.appendChild(tarjeta);
  });

  // Actualizar contadores de columna
  document.querySelectorAll(".column").forEach((col) => {
    const status = col.dataset.status;
    const count = tareas.filter((t) => t.estado === status).length;
    const badge = col.querySelector(".col-count");
    if (badge) badge.textContent = count;
  });

  actualizarContadoresVisuales();
  actualizarResumenGlobal();
}

/*
   ELIMINAR TAREA
*/
function borrarTarea(i) {
  if (!confirm(`¿Eliminar la tarea "${tareas[i].tareaNombre}"?`)) return;
  tareas.splice(i, 1);
  localStorage.setItem("tareas", JSON.stringify(tareas));
  renderTasks();
}

/*
   MOVER TAREAS ENTRE COLUMNAS
*/
function moverTarea(i, dir) {
  const estados = ["pendiente", "progreso", "finalizada"];
  const pos = estados.indexOf(tareas[i].estado);
  const nuevaPos = pos + dir;

  if (nuevaPos < 0 || nuevaPos > 2) return;

  tareas[i].estado = estados[nuevaPos];
  localStorage.setItem("tareas", JSON.stringify(tareas));

  if (estados[nuevaPos] === "progreso") {
    iniciarCuentaAtras();
  }
  if (estados[nuevaPos] === "finalizada") {
    lanzarConfeti();
  }

  renderTasks();
}

/*
   CUENTA ATRÁS
*/
let countdownInterval = null;

function iniciarCuentaAtras() {
  clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    let cambios = false;

    tareas.forEach((t) => {
      if (t.estado === "progreso" && t.segundosRestantes > 0) {
        t.segundosRestantes--;
        cambios = true;
      }
    });

    if (cambios) {
      localStorage.setItem("tareas", JSON.stringify(tareas));
      actualizarContadoresVisuales();
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }, 1000);
}

/*
   MOSTRAR TIEMPO EN PANTALLA
*/
function actualizarContadoresVisuales() {
  document.querySelectorAll(".contador").forEach((el) => {
    const index = el.getAttribute("data-id");
    const t = tareas[index];

    if (!t) return;

    const h = Math.floor(t.segundosRestantes / 3600);
    const m = Math.floor((t.segundosRestantes % 3600) / 60);
    const s = t.segundosRestantes % 60;

    el.textContent = `⏱ ${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
    el.classList.toggle("urgente", t.segundosRestantes > 0 && t.segundosRestantes < 1800);
  });
}

// --- CONFETI ---

function lanzarConfeti() {
  const colors = ["#0b5cff", "#ff6b6b", "#ffd166", "#51cf66", "#cc5de8", "#ff9f43", "#ff6bcb"];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement("div");
    p.className = "confeti-particle";
    const size = Math.random() * 9 + 4;
    p.style.cssText = `
      position:fixed; top:-12px;
      left:${Math.random() * 100}vw;
      width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > 0.5 ? "50%" : "3px"};
      pointer-events:none; z-index:99999;
      animation:confetiFall ${Math.random() * 2 + 1.5}s ease-in forwards;
      animation-delay:${Math.random() * 0.6}s;
    `;
    document.body.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

// --- DARK MODE ---

function initDarkMode() {
  const btn = document.getElementById("darkModeBtn");
  if (localStorage.getItem("darkMode") === "true") {
    document.documentElement.setAttribute("data-theme", "dark");
    btn.textContent = "☀️ Light";
  }
  btn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      btn.textContent = "🌙 Dark";
      localStorage.setItem("darkMode", "false");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      btn.textContent = "☀️ Light";
      localStorage.setItem("darkMode", "true");
    }
  });
}

// --- RESUMEN GLOBAL (HEADER) ---

function actualizarResumenGlobal() {
  const pendientes = tareas.filter((t) => t.estado === "pendiente").length;
  const progreso = tareas.filter((t) => t.estado === "progreso").length;
  const finalizadas = tareas.filter((t) => t.estado === "finalizada").length;
  document.getElementById("globalSummary").textContent =
    `Pendiente: ${pendientes}  |  Progreso: ${progreso}  |  Fin: ${finalizadas}`;
}

// ----------- VER RESUMEN (MODAL) -------------

document.getElementById("viewSummary").addEventListener("click", () => {
  // Borrar resumen previo si existe
  const viejo = document.getElementById("dynamicSummary");
  if (viejo) viejo.remove();

  const box = document.createElement("div");
  box.id = "dynamicSummary";
  box.classList.add("summaryBox");

  const card = document.createElement("div");
  card.classList.add("summaryCard");

  const total = tareas.length;
  const pendientes = tareas.filter((t) => t.estado === "pendiente").length;
  const progreso = tareas.filter((t) => t.estado === "progreso").length;
  const finalizadas = tareas.filter((t) => t.estado === "finalizada").length;
  const jefe = localStorage.getItem("nombreJefe") || "Anónimo";

  card.innerHTML = `
    <h2>Resumen del proyecto</h2>
    <p class="summary-pm">PM: ${escHtml(jefe)}</p>
    <div class="summary-stats">
      <div class="stat"><span class="stat-num">${total}</span><span class="stat-label">Total</span></div>
      <div class="stat"><span class="stat-num">${pendientes}</span><span class="stat-label">Pendiente</span></div>
      <div class="stat"><span class="stat-num">${progreso}</span><span class="stat-label">Progreso</span></div>
      <div class="stat"><span class="stat-num">${finalizadas}</span><span class="stat-label">Finalizadas</span></div>
    </div>
    <button id="closeSummary">Cerrar</button>
  `;

  box.appendChild(card);
  document.body.appendChild(box);

  card.querySelector("#closeSummary").addEventListener("click", () => box.remove());
  box.addEventListener("click", (e) => { if (e.target === box) box.remove(); });
});

// ENLACE TRELLO
document.getElementById("trelloBtn").addEventListener("click", () => {
  window.open("https://trello.com", "_blank");
});

/*
   INICIALIZACIÓN
*/
window.addEventListener("DOMContentLoaded", () => {
  initDarkMode();
  cargarNombre();
  renderTasks();
  if (tareas.some((t) => t.estado === "progreso")) {
    iniciarCuentaAtras();
  }

  // Filtros de prioridad
  document.querySelectorAll(".btn-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filtroActivo = btn.dataset.filter;
      renderTasks();
    });
  });
});
