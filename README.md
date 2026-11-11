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


Proyecto académico – Base de Datos SQL.