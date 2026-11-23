# ElectriApp - Sistema de Gestión de Servicios Técnicos y Multioficio

*Atencion: LEER COMPLETAMENTE antes de ejecutar

Solución integral orientada al control, seguimiento y trazabilidad del flujo de trabajo operativo para servicios técnicos particulares. Diseñada inicialmente para electricistas e implementada con arquitectura desacoplada para escalar nativamente hacia entornos multioficio (plomería, climatización, albañilería, etc.).

---

## 📌 Objetivos y Alcance

- **Trazabilidad operativa:** Registro exhaustivo de servicios desde la solicitud inicial del cliente hasta la emisión del comprobante final.
- **Modelo multioficio escalable:** Gestión centralizada de rubros mediante catálogos parametrizados, permitiendo asignar técnicos según especialidad y disponibilidad.
- **Control de estados y semaforización:** Registro histórico de eventos (`historial_estados`) con niveles de criticidad (Verde, Amarillo, Rojo) para monitoreo visual de demoras o bloqueos.
- **Arquitectura en capas:** Diseño iniciado desde la persistencia relacional (MySQL) para garantizar integridad referencial estricta y normalización de datos.

---

## 🗄️ Modelo Relacional y Arquitectura de Persistencia

La base de datos (`AviGoZa_elec_db`) implementa el motor **InnoDB** con codificación `utf8mb4_unicode_ci`, garantizando integridad transaccional mediante claves foráneas y restricciones de actualización/borrado en cascada.


AviGoZa – Base de Datos

Descripción

Base de datos relacional desarrollada en MySQL para un sistema de gestión de servicios técnicos y trabajos de mantenimiento.

El sistema permite administrar clientes, técnicos, especialidades, trabajos, seguimiento de estados y comprobantes.

Tecnologías utilizadas

- MySQL
- SQL
- Motor InnoDB
- Codificación UTF-8 (utf8mb4)

Estructura de la base de datos

La base de datos está compuesta por 7 tablas:

1. super_admin: administración del sistema.
2. clientes: información de los clientes.
3. oficios: especialidades de los técnicos.
4. usuarios_tecnicos: registro de técnicos.
5. trabajos: gestión de trabajos solicitados.
6. historial_estados: seguimiento del estado de los trabajos.
7. comprobantes: registro de comprobantes asociados a los trabajos.

Funcionalidades SQL implementadas

- Creación de base de datos y tablas.
- Claves primarias y foráneas.
- Relaciones entre tablas.
- Restricciones de integridad referencial.
- Inserción de datos de prueba.
- Consultas SELECT.
- INNER JOIN.
- LEFT JOIN.
- Consultas con GROUP BY y COUNT.
- Consultas con SUM.
- Filtros mediante WHERE.
- Consultas generales para comprobar relaciones.

Instalación

1. Descargar el archivo SQL del repositorio.
2. Abrir MySQL Workbench o un gestor compatible.
3. Ejecutar el archivo "bdd.sql".
4. La base de datos "AviGoZa_elec_db" se creará automáticamente.
5. Ejecutar las consultas de prueba para verificar su funcionamiento.

Objetivo del proyecto

Desarrollar una estructura de datos relacional que permita gestionar y realizar el seguimiento de servicios técnicos, desde el registro del cliente hasta la finalización del trabajo y la emisión de su comprobante.

---


AviGoZa – Base de Datos

Descripción

Base de datos relacional desarrollada en MySQL para un sistema de gestión de servicios técnicos y trabajos de mantenimiento.

El sistema permite administrar clientes, técnicos, especialidades, trabajos, seguimiento de estados y comprobantes.

Tecnologías utilizadas

- MySQL
- SQL
- Motor InnoDB
- Codificación UTF-8 (utf8mb4)

Estructura de la base de datos

La base de datos está compuesta por 7 tablas:

1. super_admin: administración del sistema.
2. clientes: información de los clientes.
3. oficios: especialidades de los técnicos.
4. usuarios_tecnicos: registro de técnicos.
5. trabajos: gestión de trabajos solicitados.
6. historial_estados: seguimiento del estado de los trabajos.
7. comprobantes: registro de comprobantes asociados a los trabajos.

Funcionalidades SQL implementadas

- Creación de base de datos y tablas.
- Claves primarias y foráneas.
- Relaciones entre tablas.
- Restricciones de integridad referencial.
- Inserción de datos de prueba.
- Consultas SELECT.
- INNER JOIN.
- LEFT JOIN.
- Consultas con GROUP BY y COUNT.
- Consultas con SUM.
- Filtros mediante WHERE.
- Consultas generales para comprobar relaciones.

Instalación

1. Descargar el archivo SQL del repositorio.
2. Abrir MySQL Workbench o un gestor compatible.
3. Ejecutar el archivo "bdd.sql".
4. La base de datos "AviGoZa_elec_db" se creará automáticamente.
5. Ejecutar las consultas de prueba para verificar su funcionamiento.

Objetivo del proyecto

Desarrollar una estructura de datos relacional que permita gestionar y realizar el seguimiento de servicios técnicos, desde el registro del cliente hasta la finalización del trabajo y la emisión de su comprobante.

---

Proyecto académico – Base de Datos SQL.

Solución web integral para el control, seguimiento y trazabilidad operativa de servicios técnicos particulares. Diseñada inicialmente para electricistas matriculados con protocolo obligatorio de seguridad y escalable de forma nativa hacia rubros multioficio (plomería, gas/climatización, albañilería).

## 🧱 Arquitectura (¿Por qué Backend API y no Vue?)

El navegador (ya sea con **HTML/JS puro** o con **Vue.js**) **no puede ni debe conectarse directamente a MySQL**. Para vincular el frontend con la base de datos SQL se implementa una **API REST en Node.js + Express (`backend/`)** que:

- Ejecuta consultas SQL parametrizadas (prevención de SQL Injection).
- Gestiona la autenticación del **Super Admin** con contraseñas hasheadas (`bcryptjs`) y tokens **JWT**.
- Aplica automatizaciones de seguridad (`helmet`, `rate-limit`, sanitización XSS, bloqueo por fuerza bruta y auditoría).
- Sirve automáticamente el frontend (`frontend/`), evitando problemas de CORS.

> **Modo dual inteligente:** Si abrís `frontend/index.html` directamente sin levantar MySQL ni Node.js, la app funciona en **Modo Demo / Offline (`localStorage`)** con todas las funciones operativas (Super Admin, CRUD, filtros, protocolo y exportación a PDF). Al iniciar el servidor Node + MySQL, se sincroniza automáticamente con `AviGoZa_elec_db`.

---

## 📁 Estructura del Proyecto

```text
ElectriApp-SIGES/
├── database/
│   ├── bdd.sql                  # Esquema completo MySQL 8 (9 tablas + datos de prueba)
│   └── consultas_prueba.sql     # Consultas JOIN, agregaciones e integridad
├── backend/
│   ├── package.json
│   ├── .env.example             # Plantilla de configuración (copiar a .env)
│   └── src/
│       ├── server.js            # Servidor Express + estáticos del frontend
│       ├── config/db.js         # Pool de conexiones MySQL2
│       ├── middleware/security.js # Helmet, rate limit, sanitización XSS, JWT y auditoría
│       └── routes/
│           ├── auth.routes.js   # Login Super Admin + bloqueo fuerza bruta
│           ├── trabajos.routes.js # CRUD trabajos/clientes + historial + protocolo
│           └── admin.routes.js  # Gestión de oficios, técnicos y auditoría
├── frontend/
│   ├── index.html               # Interfaz SIGES-ELEC + Panel Super Admin + Modales
│   ├── style.css                # Diseño oscuro industrial + estilos @media print
│   └── script.js                # Lógica modular + detección API/Demo + PDF real (jsPDF)
├── security/
│   └── audit_check.js           # Automatización de chequeo de seguridad previo a commit
└── .gitignore
```

---

## 🚀 Instalación y Puesta en Marcha

### Opción A — Modo Completo (MySQL + Node.js + Frontend)

1. **Crear la base de datos en MySQL:**
   - Abrí MySQL Workbench (o CLI) y ejecutá `database/bdd.sql`.
   - Se creará la base `AviGoZa_elec_db` con 9 tablas y datos de prueba.

2. **Configurar el backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```
   Editá `backend/.env` con tus credenciales de MySQL y una clave segura para `JWT_SECRET`.

3. **Inicializar contraseña segura de Super Admin (recomendado) y levantar el servidor:**
   ```bash
   npm run seed:admin
   npm start
   ```
   Abrí `http://localhost:3000` en el navegador.

### Opción B — Prueba Inmediata sin Backend (Modo Demo)
Abrí `frontend/index.html` directamente en tu navegador. La aplicación detectará que el backend no está activo y trabajará con persistencia local (`localStorage`).

---

## 🔐 Credenciales Iniciales de Super Admin

- **Email:** `admin@electriapp.com`
- **Contraseña:** `Admin#2026`

*(Cambiar en producción mediante `.env` o desde la tabla `super_admin` usando hash bcrypt).*

---

## 🛡️ Automatizaciones de Seguridad Incluidas

1. **Protocolo de Seguridad Obligatorio:** Bloqueo inicial de interfaz hasta confirmar EPP, ausencia de tensión y consignación de tableros, con registro en `protocolos_seguridad` y **autobloqueo por inactividad (15 min)**.
2. **Protección contra Fuerza Bruta:** Límite de intentos en `/api/auth/login` (rate-limit + bloqueo temporal de cuenta tras 5 intentos fallidos).
3. **Prevención de SQL Injection:** 100% de consultas parametrizadas (`?`) con `mysql2`.
4. **Prevención de XSS:** Sanitización en backend y escape estricto (`escapeHTML`) en el renderizado del frontend.
5. **Auditoría Automática:** Registro en `auditoria_seguridad` de logins, fallos de acceso, cambios de estado y operaciones de Super Admin.
6. **Script de Chequeo Pre-Commit:** Ejecutá `node security/audit_check.js` antes de hacer `git push` para verificar que no subás secretos (`.env`), contraseñas en texto plano ni patrones inseguros.

---

## 📄 Exportación de Reportes PDF

- **Reporte General de Auditoría (PDF):** Generado con `jsPDF` + `jspdf-autotable` (incluye KPIs, tabla con semáforo de riesgo, totales facturados y sello de protocolo de seguridad).
- **Comprobante Individual (`FAC-XXXX`):** Botón en cada tarjeta de trabajo para descargar la orden/comprobante en PDF.
- **Fallback sin internet:** Si no hay conexión para cargar la CDN de jsPDF, se activa automáticamente una vista de impresión limpia (`@media print`) lista para guardar como PDF.

Proyecto académico – Base de Datos SQL.
