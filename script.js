/**
 * ====================================================================
 * SIGES-ELEC — LÓGICA PRINCIPAL (Vanilla JS ES6+)
 * Boceto implementado: búsqueda + historial, agregar cliente (datos),
 * descripción con checkbox, prioridad semáforo numerada
 * ====================================================================
 */

/* ------------------------------------------------------------------
   DATOS INICIALES (Mock DB en memoria)
   ------------------------------------------------------------------ */
let db = [
    {
        id: 1,
        nombre: "Carlos Mendoza",
        telefono: "+54 9 381 455-8822",
        direccion: "Barrio Norte, Block B, Depto 4",
        descripcion: "Cortocircuito intermitente en fase trifásica de acometida. Se detectó falla en el neutro.",
        monto: 45000.00,
        seguridad: "RIESGO_ALTO",
        detallesArreglos: true
    },
    {
        id: 2,
        nombre: "Marta Rodríguez",
        telefono: "+54 9 11 5092-1144",
        direccion: "Av. Avellaneda 1245",
        descripcion: "Instalación y certificación de tablero seccional nuevo con disyuntor diferencial.",
        monto: 32000.00,
        seguridad: "SEGURO",
        detallesArreglos: false
    },
    {
        id: 3,
        nombre: "Talleres Metalúrgicos S.R.L.",
        telefono: "+54 9 341 671-0099",
        direccion: "Ruta 9, Km 120 — Galpón Industrial",
        descripcion: "Revisión de cable a tierra y corrientes de fuga en maquinaria pesada. Requiere informe técnico.",
        monto: 125000.00,
        seguridad: "RIESGO_BAJO",
        detallesArreglos: true
    }
];

/* ------------------------------------------------------------------
   REFERENCIAS AL DOM
   ------------------------------------------------------------------ */
// Seguridad
const modalSeguridad   = document.getElementById("modal-seguridad");
const appContainer     = document.getElementById("app-container");
const btnAceptar       = document.getElementById("btn-aceptar-seguridad");
const chkEpp           = document.getElementById("chk-epp-ui");
const chkTension       = document.getElementById("chk-tension-ui");
const chkBloqueo       = document.getElementById("chk-bloqueo-ui");

// Búsqueda e historial
const inputBusqueda    = document.getElementById("input-busqueda");
const btnLimpiar       = document.getElementById("btn-limpiar-busqueda");
const btnHistorial     = document.getElementById("btn-historial");
const btnMostrarTodos  = document.getElementById("btn-mostrar-todos");
const contenedor       = document.getElementById("contenedor-resultados");

// Acciones
const btnAbrirAlta     = document.getElementById("btn-abrir-alta");
const btnExportar      = document.getElementById("btn-exportar");

// Modal formulario
const modalFormulario  = document.getElementById("modal-formulario");
const formTitulo       = document.getElementById("form-title");
const form             = document.getElementById("form-cliente-trabajo");
const btnCerrarForm    = document.getElementById("btn-cerrar-form");
const btnCancelarForm  = document.getElementById("btn-cancelar-form");

// Campos del form
const fieldId          = document.getElementById("form-id");
const fieldNombre      = document.getElementById("form-nombre");
const fieldTelefono    = document.getElementById("form-telefono");
const fieldDireccion   = document.getElementById("form-direccion");
const fieldDesc        = document.getElementById("form-descripcion");
const fieldMonto       = document.getElementById("form-monto");
const fieldSeguridad   = document.getElementById("form-seguridad");
const chkDetalles      = document.getElementById("chk-detalles-arreglos");

// Modal historial
const modalHistorial   = document.getElementById("modal-historial");
const btnCerrarHist    = document.getElementById("btn-cerrar-historial");
const historialContenido = document.getElementById("historial-contenido");

/* ------------------------------------------------------------------
   1. PROTOCOLO DE SEGURIDAD
   ------------------------------------------------------------------ */
function actualizarBtnSeguridad() {
    btnAceptar.disabled = !(chkEpp.checked && chkTension.checked && chkBloqueo.checked);
    if (!btnAceptar.disabled) {
        btnAceptar.querySelector(".lock-icon").textContent = "🔓";
    } else {
        btnAceptar.querySelector(".lock-icon").textContent = "🔒";
    }
}

[chkEpp, chkTension, chkBloqueo].forEach(chk =>
    chk.addEventListener("change", actualizarBtnSeguridad)
);

btnAceptar.addEventListener("click", () => {
    modalSeguridad.classList.add("hidden");
    appContainer.classList.remove("app-blur");
    // Mostrar todos los trabajos al ingresar
    renderizar(ordenarPorRiesgo(db));
});

/* ------------------------------------------------------------------
   2. ORDENAR POR PRIORIDAD SEMÁFORO
   ------------------------------------------------------------------ */
const PRIORIDAD = { RIESGO_ALTO: 0, RIESGO_BAJO: 1, SEGURO: 2 };

function ordenarPorRiesgo(lista) {
    return [...lista].sort((a, b) => PRIORIDAD[a.seguridad] - PRIORIDAD[b.seguridad]);
}

/* ------------------------------------------------------------------
   3. RENDERIZACIÓN DE TARJETAS CON SEMÁFORO NUMERADO
   ------------------------------------------------------------------ */
const LABEL_RIESGO = {
    RIESGO_ALTO: "RIESGO ALTO",
    RIESGO_BAJO: "RIESGO BAJO",
    SEGURO:      "SEGURO"
};

function renderizar(lista) {
    contenedor.innerHTML = "";

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>No se encontraron registros.</p>
                <button class="btn btn-ghost" onclick="mostrarTodos()">Ver todos</button>
            </div>
        `;
        return;
    }

    lista.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = "job-card";
        card.style.animationDelay = `${idx * 50}ms`;

        const detIcon = item.detallesArreglos ? "✅" : "";

        card.innerHTML = `
            <div class="semaforo-bar bar-${item.seguridad}"></div>
            <div class="job-num num-${item.seguridad}">${idx + 1}</div>
            <div class="job-body">
                <div class="job-top">
                    <span class="job-name">${item.nombre}</span>
                    <span class="badge-riesgo badge-${item.seguridad}">${LABEL_RIESGO[item.seguridad]}</span>
                </div>
                <div class="job-meta">
                    <span>📞 ${item.telefono}</span>
                    <span>📍 ${item.direccion}</span>
                </div>
                <div class="job-desc">⚡ ${item.descripcion} ${detIcon}</div>
                <div class="job-footer">
                    <span class="job-monto">$${item.monto.toLocaleString("es-AR", {minimumFractionDigits: 2})}</span>
                    <div class="job-actions">
                        <button class="btn-edit" onclick="abrirEditar(${item.id})">✏️ Editar</button>
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

/* ------------------------------------------------------------------
   4. BÚSQUEDA EN TIEMPO REAL
   ------------------------------------------------------------------ */
inputBusqueda.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    btnLimpiar.classList.toggle("hidden", q === "");

    if (q === "") {
        contenedor.innerHTML = `
            <div class="empty-state">
                <p>Use el buscador o muestre todos los registros.</p>
                <button class="btn btn-ghost" onclick="mostrarTodos()">Ver todos los clientes</button>
            </div>`;
        return;
    }

    const filtrados = db.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        String(c.id) === q ||
        c.direccion.toLowerCase().includes(q)
    );
    renderizar(ordenarPorRiesgo(filtrados));
});

btnLimpiar.addEventListener("click", () => {
    inputBusqueda.value = "";
    btnLimpiar.classList.add("hidden");
    mostrarTodos();
});

function mostrarTodos() {
    renderizar(ordenarPorRiesgo(db));
}
window.mostrarTodos = mostrarTodos;

// Botón "Ver todos" del estado vacío inicial
if (btnMostrarTodos) {
    btnMostrarTodos.addEventListener("click", mostrarTodos);
}

/* ------------------------------------------------------------------
   5. HISTORIAL COMPLETO (botón del boceto)
   ------------------------------------------------------------------ */
btnHistorial.addEventListener("click", () => {
    historialContenido.innerHTML = "";

    if (db.length === 0) {
        historialContenido.innerHTML = `<p style="color:var(--text-lo);text-align:center;padding:30px;">Sin registros aún.</p>`;
    } else {
        db.forEach(item => {
            const el = document.createElement("div");
            el.className = "historial-item";
            el.innerHTML = `
                <span class="h-id">#${item.id}</span>
                <span class="h-nombre">${item.nombre}</span>
                <span class="badge-riesgo badge-${item.seguridad}" style="font-size:0.65rem;">
                    ${LABEL_RIESGO[item.seguridad]}
                </span>
                <span class="h-monto">$${item.monto.toLocaleString("es-AR", {minimumFractionDigits: 2})}</span>
            `;
            historialContenido.appendChild(el);
        });
    }

    modalHistorial.classList.remove("hidden");
});

btnCerrarHist.addEventListener("click", () => modalHistorial.classList.add("hidden"));
modalHistorial.addEventListener("click", (e) => {
    if (e.target === modalHistorial) modalHistorial.classList.add("hidden");
});

/* ------------------------------------------------------------------
   6. ABM: ALTA Y EDICIÓN
   ------------------------------------------------------------------ */
btnAbrirAlta.addEventListener("click", () => {
    form.reset();
    fieldId.value = "";
    formTitulo.textContent = "Agregar Cliente";
    modalFormulario.classList.remove("hidden");
});

[btnCerrarForm, btnCancelarForm].forEach(btn =>
    btn.addEventListener("click", () => modalFormulario.classList.add("hidden"))
);

// Cerrar modal al hacer clic en el overlay
modalFormulario.addEventListener("click", (e) => {
    if (e.target === modalFormulario) modalFormulario.classList.add("hidden");
});

window.abrirEditar = function(id) {
    const c = db.find(x => x.id === id);
    if (!c) return;

    formTitulo.textContent = `Editar — ${c.nombre}`;
    fieldId.value      = c.id;
    fieldNombre.value  = c.nombre;
    fieldTelefono.value= c.telefono;
    fieldDireccion.value = c.direccion;
    fieldDesc.value    = c.descripcion;
    fieldMonto.value   = c.monto;
    fieldSeguridad.value = c.seguridad;
    chkDetalles.checked  = c.detallesArreglos || false;

    modalFormulario.classList.remove("hidden");
};

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const datos = {
        nombre:   fieldNombre.value.trim(),
        telefono: fieldTelefono.value.trim(),
        direccion:fieldDireccion.value.trim(),
        descripcion: fieldDesc.value.trim(),
        monto:    parseFloat(fieldMonto.value),
        seguridad:fieldSeguridad.value,
        detallesArreglos: chkDetalles.checked
    };

    const idVal = fieldId.value;

    if (idVal) {
        // EDICIÓN
        const idx = db.findIndex(c => c.id === parseInt(idVal));
        if (idx !== -1) {
            db[idx] = { id: parseInt(idVal), ...datos };
            console.log(`[SQL UPDATE] UPDATE trabajos SET ... WHERE id = ${idVal}`);
        }
    } else {
        // ALTA
        const nuevoId = db.length > 0 ? Math.max(...db.map(c => c.id)) + 1 : 1;
        db.push({ id: nuevoId, ...datos });
        console.log(`[SQL INSERT] INSERT INTO clientes VALUES (${nuevoId}, ...)`);
    }

    modalFormulario.classList.add("hidden");
    inputBusqueda.value = "";
    btnLimpiar.classList.add("hidden");
    renderizar(ordenarPorRiesgo(db));
});

/* ------------------------------------------------------------------
   7. EXPORTAR PDF (simulado con descarga de texto estructurado)
   ------------------------------------------------------------------ */
btnExportar.addEventListener("click", () => {
    const fecha = new Date().toLocaleDateString("es-AR");
    let contenido = `REPORTE DE AUDITORÍA ELÉCTRICA — SIGES-ELEC\n`;
    contenido    += `Emisión: ${fecha}\n`;
    contenido    += `${"═".repeat(52)}\n\n`;

    const ordenados = ordenarPorRiesgo(db);
    ordenados.forEach((c, i) => {
        contenido += `${i + 1}. [${LABEL_RIESGO[c.seguridad]}] ${c.nombre}\n`;
        contenido += `   Tel: ${c.telefono}\n`;
        contenido += `   Dir: ${c.direccion}\n`;
        contenido += `   Trabajo: ${c.descripcion}\n`;
        contenido += `   Presupuesto: $${c.monto.toLocaleString("es-AR", {minimumFractionDigits: 2})}\n`;
        contenido += `   Detalles relevados: ${c.detallesArreglos ? "SÍ" : "NO"}\n`;
        contenido += `   ${"─".repeat(48)}\n\n`;
    });

    // Descarga como .txt (simulación estructural sin librería externa)
    const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `SIGES_Reporte_${fecha.replace(/\//g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    console.log("[EXPORTAR] Reporte generado. Integrar jsPDF para PDF nativo.");
});
