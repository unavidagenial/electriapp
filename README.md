# ElectriApp - Sistema de Gestión de Servicios Técnicos y Multioficio

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

