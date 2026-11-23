/**
 * ====================================================================
 * ElectriApp / SIGES-ELEC v2 — Lógica Principal (Vanilla JS ES6+)
 * - Modo dual: API REST MySQL (Node/Express) con fallback Demo Local
 * - Panel Super Admin (Oficios, Técnicos, Auditoría, Bajas)
 * - Seguridad: XSS escapeHTML, Protocolo obligatorio, Autobloqueo 15m
 * - Exportación real a PDF con jsPDF + AutoTable (y fallback print)
 * ====================================================================
 */

const STORAGE_KEY = "electriapp_siges_v2_state";
const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutos

const PRIORIDAD = { RIESGO_ALTO: 0, RIESGO_BAJO: 1, SEGURO: 2 };
const LABEL_RIESGO = {
    RIESGO_ALTO: "RIESGO ALTO",
    RIESGO_BAJO: "RIESGO BAJO",
    SEGURO: "SEGURO"
};

/* ------------------------------------------------------------------
   ESTADO GLOBAL
   ------------------------------------------------------------------ */
let useApi = false;
let adminToken = sessionStorage.getItem("electriapp_admin_token") || null;
let adminUser = JSON.parse(sessionStorage.getItem("electriapp_admin_user") || "null");
let operadorActual = "Pedro Electricista";
let inactivityTimer = null;

let state = {
    oficios: [
        { id_oficio: "ELECTRICIDAD", descripcion: "Electricidad e Instalaciones", activo: true },
        { id_oficio: "PLOMERIA", descripcion: "Plomería y Redes de Agua", activo: true },
        { id_oficio: "GAS_CLIMA", descripcion: "Gas y Climatización", activo: true },
        { id_oficio: "ALBANILERIA", descripcion: "Construcción y Albañilería", activo: true }
    ],
    tecnicos: [
        { id_tecnico: 1, nombre: "Pedro Electricista", email: "pedro@electriapp.com", telefono: "+54 9 381 111-1111", id_oficio: "ELECTRICIDAD", oficio_nombre: "Electricidad e Instalaciones", activo: true },
        { id_tecnico: 2, nombre: "Lucas Plomero", email: "lucas@electriapp.com", telefono: "+54 9 381 222-2222", id_oficio: "PLOMERIA", oficio_nombre: "Plomería y Redes de Agua", activo: true },
        { id_tecnico: 3, nombre: "Jorge Gasista", email: "jorge@electriapp.com", telefono: "+54 9 381 333-3333", id_oficio: "GAS_CLIMA", oficio_nombre: "Gas y Climatización", activo: true }
    ],
    trabajos: [
        {
            id: 1,
            nombre: "Carlos Mendoza",
            telefono: "+54 9 381 455-8822",
            direccion: "Barrio Norte, Block B, Depto 4, Tucumán",
            id_tecnico: 1,
            tecnico_nombre: "Pedro Electricista",
            id_oficio: "ELECTRICIDAD",
            oficio_nombre: "Electricidad e Instalaciones",
            descripcion: "Cortocircuito intermitente en fase trifásica de acometida. Se detectó falla en el neutro.",
            monto: 45000.00,
            seguridad: "RIESGO_ALTO",
            estado: "PENDIENTE",
            detallesArreglos: true,
            comprobante: "FAC-0001"
        },
        {
            id: 2,
            nombre: "Marta Rodríguez",
            telefono: "+54 9 381 509-2144",
            direccion: "Av. Avellaneda 1245, Tucumán",
            id_tecnico: 1,
            tecnico_nombre: "Pedro Electricista",
            id_oficio: "ELECTRICIDAD",
            oficio_nombre: "Electricidad e Instalaciones",
            descripcion: "Instalación y certificación de tablero seccional nuevo con disyuntor diferencial.",
            monto: 32000.00,
            seguridad: "SEGURO",
            estado: "FINALIZADO",
            detallesArreglos: false,
            comprobante: "FAC-0002"
        },
        {
            id: 3,
            nombre: "Talleres Metalúrgicos S.R.L.",
            telefono: "+54 9 381 671-0099",
            direccion: "Ruta 9, Km 120 — Galpón Industrial",
            id_tecnico: 3,
            tecnico_nombre: "Jorge Gasista",
            id_oficio: "GAS_CLIMA",
            oficio_nombre: "Gas y Climatización",
            descripcion: "Revisión de cable a tierra y corrientes de fuga en maquinaria pesada. Requiere informe técnico.",
            monto: 125000.00,
            seguridad: "RIESGO_BAJO",
            estado: "EN PROCESO",
            detallesArreglos: true,
            comprobante: "FAC-0003"
        }
    ],
    protocolos: [],
    auditoria: [
        { fecha_evento: new Date().toISOString(), actor_email: "sistema@electriapp.com", accion: "INIT_APP", entidad: "SIGES-ELEC", detalle: "Sesión local inicializada", nivel: "INFO" }
    ]
};

/* ------------------------------------------------------------------
   UTILIDADES DE SEGURIDAD Y FORMATO
   ------------------------------------------------------------------ */
function escapeHTML(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatMoney(amount) {
    return "$" + Number(amount || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(msg) {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

function saveLocalState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadLocalState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (_e) {
            saveLocalState();
        }
    } else {
        saveLocalState();
    }
}

async function apiFetch(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
    return data;
}

/* ------------------------------------------------------------------
   DETECCIÓN AUTOMÁTICA DE BACKEND MYSQL vs MODO DEMO
   ------------------------------------------------------------------ */
async function initBackendConnection() {
    const badge = document.getElementById("db-mode-badge");
    const text = document.getElementById("db-mode-text");

    if (window.location.protocol === "file:") {
        useApi = false;
        loadLocalState();
        badge.classList.add("status-demo");
        text.textContent = "Modo Demo Local";
        return;
    }

    try {
        const health = await apiFetch("/api/health");
        if (health.status === "ok") {
            useApi = true;
            badge.classList.remove("status-demo");
            text.textContent = "MySQL Conectado";
            return;
        }
    } catch (_err) {
        // Fallback silencioso a modo demo
    }

    useApi = false;
    loadLocalState();
    badge.classList.add("status-demo");
    text.textContent = "Modo Demo Local";
}

/* ------------------------------------------------------------------
   CARGA DE DATOS
   ------------------------------------------------------------------ */
async function syncData() {
    if (useApi) {
        try {
            const [catalogos, trabajos] = await Promise.all([
                apiFetch("/api/admin/catalogos"),
                apiFetch("/api/trabajos")
            ]);
            state.oficios = catalogos.oficios;
            state.tecnicos = catalogos.tecnicos;
            state.trabajos = trabajos;
        } catch (err) {
            showToast("Error sincronizando con MySQL: " + err.message);
        }
    }
    poblarSelectores();
    aplicarFiltrosYRenderizar();
    actualizarBotonAdmin();
}

function poblarSelectores() {
    const filtroOficio = document.getElementById("filtro-oficio");
    const prevOficio = filtroOficio.value;
    filtroOficio.innerHTML = `<option value="">Todos los oficios</option>` +
        state.oficios.filter(o => o.activo).map(o =>
            `<option value="${escapeHTML(o.id_oficio)}">${escapeHTML(o.descripcion)}</option>`
        ).join("");
    filtroOficio.value = prevOficio;

    const formTecnico = document.getElementById("form-tecnico");
    formTecnico.innerHTML = state.tecnicos.filter(t => t.activo).map(t =>
        `<option value="${t.id_tecnico}">${escapeHTML(t.nombre)} (${escapeHTML(t.oficio_nombre || t.id_oficio || "General")})</option>`
    ).join("");

    const tecOficio = document.getElementById("tec-oficio");
    tecOficio.innerHTML = state.oficios.filter(o => o.activo).map(o =>
        `<option value="${escapeHTML(o.id_oficio)}">${escapeHTML(o.descripcion)}</option>`
    ).join("");
}

/* ------------------------------------------------------------------
   PROTOCOLO DE SEGURIDAD Y AUTOBLOQUEO POR INACTIVIDAD
   ------------------------------------------------------------------ */
const modalSeguridad = document.getElementById("modal-seguridad");
const appContainer = document.getElementById("app-container");
const btnAceptar = document.getElementById("btn-aceptar-seguridad");
const chkEpp = document.getElementById("chk-epp-ui");
const chkTension = document.getElementById("chk-tension-ui");
const chkBloqueo = document.getElementById("chk-bloqueo-ui");

function actualizarBtnSeguridad() {
    btnAceptar.disabled = !(chkEpp.checked && chkTension.checked && chkBloqueo.checked);
    btnAceptar.querySelector(".lock-icon").textContent = btnAceptar.disabled ? "🔒" : "🔓";
}

[chkEpp, chkTension, chkBloqueo].forEach(c => c.addEventListener("change", actualizarBtnSeguridad));

function bloquearPantalla() {
    chkEpp.checked = false;
    chkTension.checked = false;
    chkBloqueo.checked = false;
    actualizarBtnSeguridad();
    modalSeguridad.classList.remove("hidden");
    appContainer.classList.add("app-blur");
}

function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (modalSeguridad.classList.contains("hidden")) {
        inactivityTimer = setTimeout(() => {
            bloquearPantalla();
            showToast("Sesión bloqueada automáticamente por inactividad (15 min).");
        }, INACTIVITY_MS);
    }
}

["click", "keydown", "mousemove"].forEach(evt =>
    document.addEventListener(evt, resetInactivityTimer, { passive: true })
);

document.getElementById("btn-bloquear-ahora").addEventListener("click", () => {
    bloquearPantalla();
    showToast("Pantalla bloqueada por seguridad.");
});

btnAceptar.addEventListener("click", async () => {
    operadorActual = document.getElementById("input-operador").value.trim() || "Técnico en Campo";
    if (useApi) {
        try {
            await apiFetch("/api/trabajos/protocolo", {
                method: "POST",
                body: JSON.stringify({ operador_nombre: operadorActual, epp: true, tension: true, bloqueo: true })
            });
        } catch (_err) { /* no bloquear acceso */ }
    } else {
        state.protocolos.unshift({
            operador_nombre: operadorActual,
            fecha_aceptacion: new Date().toISOString(),
            epp_verificado: true,
            ausencia_tension: true,
            bloqueo_tableros: true
        });
        state.auditoria.unshift({
            fecha_evento: new Date().toISOString(),
            actor_email: operadorActual,
            accion: "PROTOCOLO_CONFIRMADO",
            entidad: "protocolos_seguridad",
            detalle: "EPP, ausencia de tensión y bloqueo verificados",
            nivel: "INFO"
        });
        saveLocalState();
    }

    modalSeguridad.classList.add("hidden");
    appContainer.classList.remove("app-blur");
    resetInactivityTimer();
    showToast(`Protocolo confirmado por ${operadorActual}.`);
});

/* ------------------------------------------------------------------
   FILTRADO, KPIs Y RENDERIZACIÓN DE TRABAJOS
   ------------------------------------------------------------------ */
function ordenarPorRiesgo(lista) {
    return [...lista].sort((a, b) => (PRIORIDAD[a.seguridad] ?? 9) - (PRIORIDAD[b.seguridad] ?? 9));
}

function obtenerTrabajosFiltrados() {
    const q = document.getElementById("input-busqueda").value.toLowerCase().trim();
    const oficio = document.getElementById("filtro-oficio").value;
    const riesgo = document.getElementById("filtro-riesgo").value;
    const estado = document.getElementById("filtro-estado").value;

    const filtrados = state.trabajos.filter(t => {
        const matchQ = !q ||
            t.nombre.toLowerCase().includes(q) ||
            String(t.id) === q ||
            t.direccion.toLowerCase().includes(q) ||
            t.descripcion.toLowerCase().includes(q) ||
            (t.comprobante || "").toLowerCase().includes(q);
        const matchOficio = !oficio || t.id_oficio === oficio;
        const matchRiesgo = !riesgo || t.seguridad === riesgo;
        const matchEstado = !estado || t.estado === estado;
        return matchQ && matchOficio && matchRiesgo && matchEstado;
    });

    return ordenarPorRiesgo(filtrados);
}

function actualizarKPIs(lista) {
    const riesgoAlto = lista.filter(t => t.seguridad === "RIESGO_ALTO").length;
    const activos = lista.filter(t => t.estado !== "FINALIZADO").length;
    const totalMonto = lista.reduce((acc, t) => acc + Number(t.monto || 0), 0);

    document.getElementById("kpi-total-trabajos").textContent = lista.length;
    document.getElementById("kpi-riesgo-alto").textContent = riesgoAlto;
    document.getElementById("kpi-pendientes").textContent = activos;
    document.getElementById("kpi-facturacion").textContent = formatMoney(totalMonto);
}

function aplicarFiltrosYRenderizar() {
    const lista = obtenerTrabajosFiltrados();
    actualizarKPIs(lista);

    const contenedor = document.getElementById("contenedor-resultados");
    contenedor.innerHTML = "";

    if (lista.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>No se encontraron trabajos con los filtros actuales.</p>
                <button class="btn btn-ghost" id="btn-reset-filtros">Limpiar filtros</button>
            </div>`;
        document.getElementById("btn-reset-filtros").addEventListener("click", () => {
            document.getElementById("input-busqueda").value = "";
            document.getElementById("filtro-oficio").value = "";
            document.getElementById("filtro-riesgo").value = "";
            document.getElementById("filtro-estado").value = "";
            document.getElementById("btn-limpiar-busqueda").classList.add("hidden");
            aplicarFiltrosYRenderizar();
        });
        return;
    }

    lista.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = "job-card";
        const detBadge = item.detallesArreglos ? " · ✅ Relevado" : "";
        const deleteBtn = adminUser
            ? `<button class="btn-delete-mini" data-del="${item.id}">🗑️ Eliminar</button>`
            : "";

        card.innerHTML = `
            <div class="semaforo-bar bar-${escapeHTML(item.seguridad)}"></div>
            <div class="job-num num-${escapeHTML(item.seguridad)}">${idx + 1}</div>
            <div class="job-body">
                <div class="job-top">
                    <span class="job-name">${escapeHTML(item.nombre)}</span>
                    <div class="badges-group">
                        <span class="badge-tag badge-oficio">${escapeHTML(item.oficio_nombre || item.id_oficio || "General")}</span>
                        <span class="badge-tag badge-estado">${escapeHTML(item.estado || "PENDIENTE")}</span>
                        <span class="badge-riesgo badge-${escapeHTML(item.seguridad)}">${escapeHTML(LABEL_RIESGO[item.seguridad] || item.seguridad)}</span>
                    </div>
                </div>
                <div class="job-meta">
                    <span>📞 ${escapeHTML(item.telefono)}</span>
                    <span>📍 ${escapeHTML(item.direccion)}</span>
                    <span>👷 ${escapeHTML(item.tecnico_nombre || "Sin asignar")}</span>
                </div>
                <div class="job-desc">⚡ ${escapeHTML(item.descripcion)}${detBadge}</div>
                <div class="job-footer">
                    <div>
                        <span class="job-monto">${formatMoney(item.monto)}</span>
                        <span class="job-comprobante">${escapeHTML(item.comprobante || "")}</span>
                    </div>
                    <div class="job-actions">
                        <button class="btn-pdf-mini" data-pdf="${item.id}">📄 Comprobante PDF</button>
                        <button class="btn-edit" data-edit="${item.id}">✏️ Editar</button>
                        ${deleteBtn}
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });

    contenedor.querySelectorAll("[data-edit]").forEach(btn =>
        btn.addEventListener("click", () => abrirEditar(Number(btn.dataset.edit)))
    );
    contenedor.querySelectorAll("[data-pdf]").forEach(btn =>
        btn.addEventListener("click", () => exportarComprobantePDF(Number(btn.dataset.pdf)))
    );
    contenedor.querySelectorAll("[data-del]").forEach(btn =>
        btn.addEventListener("click", () => eliminarTrabajo(Number(btn.dataset.del)))
    );
}

document.getElementById("input-busqueda").addEventListener("input", (e) => {
    document.getElementById("btn-limpiar-busqueda").classList.toggle("hidden", !e.target.value.trim());
    aplicarFiltrosYRenderizar();
});
document.getElementById("btn-limpiar-busqueda").addEventListener("click", () => {
    document.getElementById("input-busqueda").value = "";
    document.getElementById("btn-limpiar-busqueda").classList.add("hidden");
    aplicarFiltrosYRenderizar();
});
["filtro-oficio", "filtro-riesgo", "filtro-estado"].forEach(id =>
    document.getElementById(id).addEventListener("change", aplicarFiltrosYRenderizar)
);

/* ------------------------------------------------------------------
   ABM DE TRABAJOS Y CLIENTES
   ------------------------------------------------------------------ */
const modalFormulario = document.getElementById("modal-formulario");
const form = document.getElementById("form-cliente-trabajo");

document.getElementById("btn-abrir-alta").addEventListener("click", () => {
    form.reset();
    document.getElementById("form-id").value = "";
    document.getElementById("form-title").textContent = "Agregar Cliente y Trabajo";
    modalFormulario.classList.remove("hidden");
});

["btn-cerrar-form", "btn-cancelar-form"].forEach(id =>
    document.getElementById(id).addEventListener("click", () => modalFormulario.classList.add("hidden"))
);

function abrirEditar(id) {
    const item = state.trabajos.find(t => t.id === id);
    if (!item) return;

    document.getElementById("form-title").textContent = `Editar — ${item.nombre}`;
    document.getElementById("form-id").value = item.id;
    document.getElementById("form-nombre").value = item.nombre;
    document.getElementById("form-telefono").value = item.telefono;
    document.getElementById("form-direccion").value = item.direccion;
    document.getElementById("form-tecnico").value = item.id_tecnico || 1;
    document.getElementById("form-estado").value = item.estado || "PENDIENTE";
    document.getElementById("form-descripcion").value = item.descripcion;
    document.getElementById("form-seguridad").value = item.seguridad;
    document.getElementById("form-monto").value = item.monto;
    document.getElementById("chk-detalles-arreglos").checked = Boolean(item.detallesArreglos);

    modalFormulario.classList.remove("hidden");
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idVal = document.getElementById("form-id").value;
    const idTecnico = Number(document.getElementById("form-tecnico").value);
    const tec = state.tecnicos.find(t => t.id_tecnico === idTecnico);

    const payload = {
        nombre: document.getElementById("form-nombre").value.trim(),
        telefono: document.getElementById("form-telefono").value.trim(),
        direccion: document.getElementById("form-direccion").value.trim(),
        id_tecnico: idTecnico,
        estado: document.getElementById("form-estado").value,
        descripcion: document.getElementById("form-descripcion").value.trim(),
        seguridad: document.getElementById("form-seguridad").value,
        monto: parseFloat(document.getElementById("form-monto").value),
        detallesArreglos: document.getElementById("chk-detalles-arreglos").checked
    };

    try {
        if (useApi) {
            if (idVal) {
                await apiFetch(`/api/trabajos/${idVal}`, { method: "PUT", body: JSON.stringify(payload) });
            } else {
                await apiFetch("/api/trabajos", { method: "POST", body: JSON.stringify(payload) });
            }
            await syncData();
        } else {
            if (idVal) {
                const idx = state.trabajos.findIndex(t => t.id === Number(idVal));
                if (idx !== -1) {
                    state.trabajos[idx] = {
                        ...state.trabajos[idx],
                        ...payload,
                        tecnico_nombre: tec?.nombre || "Técnico",
                        id_oficio: tec?.id_oficio || "ELECTRICIDAD",
                        oficio_nombre: tec?.oficio_nombre || "Electricidad"
                    };
                }
            } else {
                const nextId = state.trabajos.length ? Math.max(...state.trabajos.map(t => t.id)) + 1 : 1;
                state.trabajos.unshift({
                    id: nextId,
                    ...payload,
                    tecnico_nombre: tec?.nombre || "Técnico",
                    id_oficio: tec?.id_oficio || "ELECTRICIDAD",
                    oficio_nombre: tec?.oficio_nombre || "Electricidad",
                    comprobante: `FAC-${String(nextId).padStart(4, "0")}`
                });
            }
            saveLocalState();
            aplicarFiltrosYRenderizar();
        }
        modalFormulario.classList.add("hidden");
        showToast(idVal ? "Trabajo actualizado correctamente." : "Nuevo trabajo y comprobante registrados.");
    } catch (err) {
        showToast("Error al guardar: " + err.message);
    }
});

async function eliminarTrabajo(id) {
    if (!adminUser) return showToast("Solo el Super Admin puede eliminar registros.");
    if (!confirm(`¿Confirmás eliminar el trabajo #${id}? Esta acción queda auditada.`)) return;

    try {
        if (useApi) {
            await apiFetch(`/api/trabajos/${id}`, { method: "DELETE" });
            await syncData();
        } else {
            state.trabajos = state.trabajos.filter(t => t.id !== id);
            state.auditoria.unshift({
                fecha_evento: new Date().toISOString(),
                actor_email: adminUser.email,
                accion: "DELETE_TRABAJO",
                entidad: "trabajos",
                detalle: `Trabajo #${id} eliminado por Super Admin`,
                nivel: "WARN"
            });
            saveLocalState();
            aplicarFiltrosYRenderizar();
        }
        showToast(`Trabajo #${id} eliminado.`);
    } catch (err) {
        showToast("Error al eliminar: " + err.message);
    }
}

/* ------------------------------------------------------------------
   HISTORIAL COMPLETO
   ------------------------------------------------------------------ */
const modalHistorial = document.getElementById("modal-historial");
document.getElementById("btn-historial").addEventListener("click", () => {
    const cont = document.getElementById("historial-contenido");
    cont.innerHTML = state.trabajos.length
        ? state.trabajos.map(item => `
            <div class="historial-item">
                <span><strong>${escapeHTML(item.comprobante || "#" + item.id)}</strong> · ${escapeHTML(item.nombre)}</span>
                <span>${escapeHTML(item.estado)} · <span class="badge-riesgo badge-${escapeHTML(item.seguridad)}">${escapeHTML(LABEL_RIESGO[item.seguridad])}</span> · <strong>${formatMoney(item.monto)}</strong></span>
            </div>`).join("")
        : `<p style="color:var(--text-lo);text-align:center;padding:24px;">Sin registros aún.</p>`;
    modalHistorial.classList.remove("hidden");
});
document.getElementById("btn-cerrar-historial").addEventListener("click", () => modalHistorial.classList.add("hidden"));

/* ------------------------------------------------------------------
   SUPER ADMIN: LOGIN, TABS Y GESTIÓN
   ------------------------------------------------------------------ */
const modalLoginAdmin = document.getElementById("modal-login-admin");
const modalSuperAdmin = document.getElementById("modal-super-admin");
const btnSuperAdmin = document.getElementById("btn-super-admin");

function actualizarBotonAdmin() {
    if (adminUser) {
        btnSuperAdmin.textContent = "🛡️ Panel Admin";
        btnSuperAdmin.classList.add("is-admin");
    } else {
        btnSuperAdmin.textContent = "🛡️ Super Admin";
        btnSuperAdmin.classList.remove("is-admin");
    }
}

btnSuperAdmin.addEventListener("click", () => {
    if (adminUser) {
        abrirPanelSuperAdmin();
    } else {
        document.getElementById("login-error").classList.add("hidden");
        modalLoginAdmin.classList.remove("hidden");
    }
});

["btn-cerrar-login", "btn-cancelar-login"].forEach(id =>
    document.getElementById(id).addEventListener("click", () => modalLoginAdmin.classList.add("hidden"))
);
document.getElementById("btn-cerrar-admin").addEventListener("click", () => modalSuperAdmin.classList.add("hidden"));

document.getElementById("form-login-admin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;
    const errEl = document.getElementById("login-error");
    errEl.classList.add("hidden");

    try {
        if (useApi) {
            const res = await apiFetch("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });
            adminToken = res.token;
            adminUser = res.admin;
        } else {
            if (email !== "admin@electriapp.com" || password !== "Admin#2026") {
                throw new Error("Credenciales inválidas (Demo: admin@electriapp.com / Admin#2026)");
            }
            adminToken = "demo-jwt-token";
            adminUser = { nombre: "Administrador Principal", email, role: "SUPER_ADMIN" };
            state.auditoria.unshift({
                fecha_evento: new Date().toISOString(),
                actor_email: email,
                accion: "LOGIN_SUCCESS",
                entidad: "super_admin",
                detalle: "Acceso Super Admin concedido (Modo Demo)",
                nivel: "INFO"
            });
            saveLocalState();
        }

        sessionStorage.setItem("electriapp_admin_token", adminToken);
        sessionStorage.setItem("electriapp_admin_user", JSON.stringify(adminUser));
        modalLoginAdmin.classList.add("hidden");
        actualizarBotonAdmin();
        aplicarFiltrosYRenderizar();
        abrirPanelSuperAdmin();
        showToast("Sesión de Super Admin iniciada.");
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove("hidden");
    }
});

document.getElementById("btn-logout-admin").addEventListener("click", () => {
    adminToken = null;
    adminUser = null;
    sessionStorage.removeItem("electriapp_admin_token");
    sessionStorage.removeItem("electriapp_admin_user");
    modalSuperAdmin.classList.add("hidden");
    actualizarBotonAdmin();
    aplicarFiltrosYRenderizar();
    showToast("Sesión Super Admin cerrada.");
});

document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".admin-tab-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.tab).classList.add("active");
    });
});

async function abrirPanelSuperAdmin() {
    document.getElementById("admin-user-label").textContent = `${adminUser.nombre} (${adminUser.email})`;
    if (useApi) {
        try {
            const aud = await apiFetch("/api/admin/auditoria");
            state.auditoria = aud.eventos;
            state.protocolos = aud.protocolos;
        } catch (_e) { /* mantiene actual */ }
    }
    renderizarPanelAdmin();
    modalSuperAdmin.classList.remove("hidden");
}

function renderizarPanelAdmin() {
    // Oficios
    const listaOficios = document.getElementById("lista-oficios-admin");
    listaOficios.innerHTML = state.oficios.map(o => `
        <div class="admin-row">
            <div><strong>${escapeHTML(o.id_oficio)}</strong> — ${escapeHTML(o.descripcion)}</div>
            <button class="btn-edit" data-toggle-oficio="${escapeHTML(o.id_oficio)}">
                ${o.activo ? "✅ Activo" : "⛔ Inactivo"}
            </button>
        </div>`).join("");

    listaOficios.querySelectorAll("[data-toggle-oficio]").forEach(btn => {
        btn.addEventListener("click", async () => {
            const code = btn.dataset.toggleOficio;
            if (useApi) {
                await apiFetch(`/api/admin/oficios/${encodeURIComponent(code)}/toggle`, { method: "PATCH" });
                await syncData();
            } else {
                const o = state.oficios.find(x => x.id_oficio === code);
                if (o) o.activo = !o.activo;
                saveLocalState();
                poblarSelectores();
            }
            renderizarPanelAdmin();
        });
    });

    // Técnicos
    const listaTecs = document.getElementById("lista-tecnicos-admin");
    listaTecs.innerHTML = state.tecnicos.map(t => `
        <div class="admin-row">
            <div>
                <strong>${escapeHTML(t.nombre)}</strong> (${escapeHTML(t.email)}) ·
                <span class="badge-tag badge-oficio">${escapeHTML(t.oficio_nombre || t.id_oficio || "General")}</span>
            </div>
            <button class="btn-edit" data-toggle-tec="${t.id_tecnico}">
                ${t.activo ? "✅ Activo" : "⛔ Baja"}
            </button>
        </div>`).join("");

    listaTecs.querySelectorAll("[data-toggle-tec]").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = Number(btn.dataset.toggleTec);
            if (useApi) {
                await apiFetch(`/api/admin/tecnicos/${id}/toggle`, { method: "PATCH" });
                await syncData();
            } else {
                const t = state.tecnicos.find(x => x.id_tecnico === id);
                if (t) t.activo = !t.activo;
                saveLocalState();
                poblarSelectores();
            }
            renderizarPanelAdmin();
        });
    });

    // Protocolos
    const listaProt = document.getElementById("lista-protocolos-admin");
    listaProt.innerHTML = state.protocolos.length
        ? state.protocolos.slice(0, 15).map(p => `
            <div class="admin-row">
                <span>⚡ <strong>${escapeHTML(p.operador_nombre)}</strong> — EPP, Tensión y Bloqueo OK</span>
                <span style="color:var(--text-lo)">${new Date(p.fecha_aceptacion).toLocaleString("es-AR")}</span>
            </div>`).join("")
        : `<p style="color:var(--text-lo);font-size:0.84rem;">Aún no hay protocolos registrados.</p>`;

    // Auditoría
    const listaAud = document.getElementById("lista-auditoria-admin");
    listaAud.innerHTML = state.auditoria.slice(0, 25).map(a => `
        <div class="admin-row">
            <span><strong>[${escapeHTML(a.nivel)}] ${escapeHTML(a.accion)}</strong> · ${escapeHTML(a.actor_email)} — ${escapeHTML(a.detalle)}</span>
            <span style="color:var(--text-lo)">${new Date(a.fecha_evento).toLocaleString("es-AR")}</span>
        </div>`).join("");
}

document.getElementById("form-nuevo-oficio").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id_oficio = document.getElementById("oficio-codigo").value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const descripcion = document.getElementById("oficio-desc").value.trim();
    try {
        if (useApi) {
            await apiFetch("/api/admin/oficios", { method: "POST", body: JSON.stringify({ id_oficio, descripcion }) });
            await syncData();
        } else {
            if (state.oficios.some(o => o.id_oficio === id_oficio)) throw new Error("Ese código ya existe.");
            state.oficios.push({ id_oficio, descripcion, activo: true });
            saveLocalState();
            poblarSelectores();
        }
        e.target.reset();
        renderizarPanelAdmin();
        showToast(`Oficio ${descripcion} agregado.`);
    } catch (err) {
        showToast(err.message);
    }
});

document.getElementById("form-nuevo-tecnico").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("tec-nombre").value.trim();
    const email = document.getElementById("tec-email").value.trim().toLowerCase();
    const telefono = document.getElementById("tec-tel").value.trim();
    const id_oficio = document.getElementById("tec-oficio").value;
    try {
        if (useApi) {
            await apiFetch("/api/admin/tecnicos", { method: "POST", body: JSON.stringify({ nombre, email, telefono, id_oficio }) });
            await syncData();
        } else {
            const oficioObj = state.oficios.find(o => o.id_oficio === id_oficio);
            const nextId = state.tecnicos.length ? Math.max(...state.tecnicos.map(t => t.id_tecnico)) + 1 : 1;
            state.tecnicos.push({
                id_tecnico: nextId, nombre, email, telefono, id_oficio,
                oficio_nombre: oficioObj?.descripcion || id_oficio, activo: true
            });
            saveLocalState();
            poblarSelectores();
        }
        e.target.reset();
        renderizarPanelAdmin();
        showToast(`Técnico ${nombre} dado de alta.`);
    } catch (err) {
        showToast(err.message);
    }
});

/* ------------------------------------------------------------------
   EXPORTACIÓN REAL A PDF (Reporte General + Comprobante Individual)
   ------------------------------------------------------------------ */
function exportarReporteGeneralPDF() {
    const lista = obtenerTrabajosFiltrados();
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Modo offline sin jsPDF: abriendo vista de impresión para Guardar como PDF.");
        window.print();
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const fecha = new Date().toLocaleString("es-AR");
    const totalFact = lista.reduce((acc, t) => acc + Number(t.monto || 0), 0);

    // Encabezado oscuro industrial
    doc.setFillColor(10, 14, 23);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(16);
    doc.text("SIGES-ELEC | ElectriApp — Reporte Operativo y de Seguridad", 14, 13);
    doc.setTextColor(220, 228, 245);
    doc.setFontSize(9.5);
    doc.text(`Emisión: ${fecha}   |   Operador: ${operadorActual}   |   Registros: ${lista.length}   |   Total Estimado: ${formatMoney(totalFact)}`, 14, 22);

    const rows = lista.map((t, i) => [
        i + 1,
        t.comprobante || `#${t.id}`,
        t.nombre,
        t.oficio_nombre || t.id_oficio || "-",
        t.tecnico_nombre || "-",
        LABEL_RIESGO[t.seguridad] || t.seguridad,
        t.estado || "PENDIENTE",
        t.descripcion,
        formatMoney(t.monto)
    ]);

    doc.autoTable({
        startY: 34,
        head: [["#", "Comp.", "Cliente", "Oficio", "Técnico", "Riesgo", "Estado", "Descripción", "Monto"]],
        body: rows,
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [26, 34, 53], textColor: [245, 158, 11] },
        didParseCell(data) {
            if (data.section === "body" && data.column.index === 5) {
                if (data.cell.raw === "RIESGO ALTO") data.cell.styles.textColor = [220, 38, 38];
                if (data.cell.raw === "RIESGO BAJO") data.cell.styles.textColor = [217, 119, 6];
                if (data.cell.raw === "SEGURO") data.cell.styles.textColor = [5, 150, 105];
            }
        }
    });

    const finalY = (doc.lastAutoTable?.finalY || 140) + 10;
    doc.setTextColor(80, 90, 110);
    doc.setFontSize(8.5);
    doc.text("Declaración: Protocolo de seguridad EPP / Ausencia de tensión / Consignación de tableros verificado antes de la emisión.", 14, finalY);

    doc.save(`ElectriApp_Reporte_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast("Reporte general PDF descargado.");
}

function exportarComprobantePDF(id) {
    const item = state.trabajos.find(t => t.id === id);
    if (!item) return;

    if (!window.jspdf || !window.jspdf.jsPDF) {
        window.print();
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const fecha = new Date().toLocaleString("es-AR");

    doc.setFillColor(10, 14, 23);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(245, 158, 11);
    doc.setFontSize(17);
    doc.text("ELECTRIAPP · SIGES-ELEC", 14, 14);
    doc.setTextColor(240, 244, 255);
    doc.setFontSize(10);
    doc.text(`Comprobante de Servicio Técnico: ${item.comprobante || "FAC-" + item.id}`, 14, 23);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    let y = 46;
    const campos = [
        ["Fecha de emisión:", fecha],
        ["Cliente:", item.nombre],
        ["Teléfono:", item.telefono],
        ["Dirección:", item.direccion],
        ["Rubro / Oficio:", item.oficio_nombre || item.id_oficio || "Electricidad"],
        ["Técnico responsable:", item.tecnico_nombre || operadorActual],
        ["Estado operativo:", item.estado || "PENDIENTE"],
        ["Nivel de riesgo:", LABEL_RIESGO[item.seguridad] || item.seguridad],
        ["Relevado en campo:", item.detallesArreglos ? "SÍ" : "NO"]
    ];

    campos.forEach(([k, v]) => {
        doc.setFont(undefined, "bold");
        doc.text(k, 14, y);
        doc.setFont(undefined, "normal");
        doc.text(String(v), 62, y);
        y += 8;
    });

    y += 4;
    doc.setFont(undefined, "bold");
    doc.text("Detalle técnico de la intervención:", 14, y);
    y += 7;
    doc.setFont(undefined, "normal");
    const lines = doc.splitTextToSize(item.descripcion, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 12;

    doc.setFillColor(245, 158, 11);
    doc.rect(14, y, 182, 14, "F");
    doc.setTextColor(10, 14, 23);
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`TOTAL PRESUPUESTADO: ${formatMoney(item.monto)}`, 20, y + 9.5);

    doc.save(`Comprobante_${item.comprobante || item.id}.pdf`);
    showToast(`Comprobante ${item.comprobante || "#" + item.id} descargado en PDF.`);
}

document.getElementById("btn-exportar").addEventListener("click", exportarReporteGeneralPDF);

/* ------------------------------------------------------------------
   INICIALIZACIÓN
   ------------------------------------------------------------------ */
(async function bootstrap() {
    await initBackendConnection();
    await syncData();
})();
