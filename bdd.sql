-- =====================================================================
-- ElectriApp / SIGES-ELEC — Base de Datos Relacional (AviGoZa_elec_db)
-- Motor: MySQL 8.x | InnoDB | UTF-8 (utf8mb4_unicode_ci)
-- Versión 2.0: Integración con frontend SIGES-ELEC + Auditoría y Seguridad
-- =====================================================================

DROP DATABASE IF EXISTS AviGoZa_elec_db;

CREATE DATABASE AviGoZa_elec_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE AviGoZa_elec_db;

-- =====================================================================
-- 1. SUPER ADMIN (con bloqueo ante fuerza bruta y hash seguro)
-- =====================================================================
CREATE TABLE super_admin (
    id_supad          INT AUTO_INCREMENT PRIMARY KEY,
    nombre            VARCHAR(120) NOT NULL,
    email             VARCHAR(120) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    intentos_fallidos INT NOT NULL DEFAULT 0,
    bloqueado_hasta   DATETIME NULL,
    ultimo_acceso     DATETIME NULL,
    fecha_creacion    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- 2. CLIENTES
-- =====================================================================
CREATE TABLE clientes (
    id_cliente     INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL,
    telefono       VARCHAR(30)  NOT NULL,
    direccion      VARCHAR(255) NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_clientes_nombre (nombre)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. OFICIOS (Catálogo multioficio escalable)
-- =====================================================================
CREATE TABLE oficios (
    id_oficio   VARCHAR(60)  PRIMARY KEY,
    descripcion VARCHAR(120) NOT NULL,
    activo      BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- =====================================================================
-- 4. USUARIOS TÉCNICOS
-- =====================================================================
CREATE TABLE usuarios_tecnicos (
    id_tecnico     INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    telefono       VARCHAR(25),
    disponibilidad BOOLEAN NOT NULL DEFAULT TRUE,
    id_oficio      VARCHAR(60),
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tecnico_oficio
        FOREIGN KEY (id_oficio)
        REFERENCES oficios(id_oficio)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_tecnico_oficio (id_oficio, activo)
) ENGINE=InnoDB;

-- =====================================================================
-- 5. TRABAJOS (alineado con semáforo de riesgo y relevamiento en campo)
-- =====================================================================
CREATE TABLE trabajos (
    id_trabajo        INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente        INT NOT NULL,
    id_tecnico        INT NOT NULL,
    descripcion       VARCHAR(500) NOT NULL,
    prioridad_riesgo  ENUM('SEGURO', 'RIESGO_BAJO', 'RIESGO_ALTO') NOT NULL DEFAULT 'RIESGO_BAJO',
    detalles_arreglos BOOLEAN NOT NULL DEFAULT FALSE,
    total             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    fecha_inicio      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin         DATETIME NULL,

    CONSTRAINT fk_trabajo_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_trabajo_tecnico
        FOREIGN KEY (id_tecnico)
        REFERENCES usuarios_tecnicos(id_tecnico)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_trabajos_riesgo (prioridad_riesgo),
    INDEX idx_trabajos_fecha (fecha_inicio)
) ENGINE=InnoDB;

-- =====================================================================
-- 6. HISTORIAL DE ESTADOS (trazabilidad y semaforización operativa)
-- =====================================================================
CREATE TABLE historial_estados (
    id_historial  INT AUTO_INCREMENT PRIMARY KEY,
    id_trabajo    INT NOT NULL,
    estado        ENUM('PENDIENTE', 'EN PROCESO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    semaforo      ENUM('VERDE', 'AMARILLO', 'ROJO') NOT NULL DEFAULT 'ROJO',
    observaciones VARCHAR(255),
    fecha_cambio  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historial_trabajo
        FOREIGN KEY (id_trabajo)
        REFERENCES trabajos(id_trabajo)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    INDEX idx_historial_trabajo_fecha (id_trabajo, fecha_cambio)
) ENGINE=InnoDB;

-- =====================================================================
-- 7. COMPROBANTES
-- =====================================================================
CREATE TABLE comprobantes (
    id_comprobante     INT AUTO_INCREMENT PRIMARY KEY,
    id_trabajo         INT NOT NULL,
    fecha_emision      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total              DECIMAL(12,2) NOT NULL,
    codigo_comprobante VARCHAR(30) NOT NULL UNIQUE,

    CONSTRAINT fk_comprobante_trabajo
        FOREIGN KEY (id_trabajo)
        REFERENCES trabajos(id_trabajo)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 8. PROTOCOLOS DE SEGURIDAD (declaración jurada EPP/Tensión/Bloqueo)
-- =====================================================================
CREATE TABLE protocolos_seguridad (
    id_protocolo      INT AUTO_INCREMENT PRIMARY KEY,
    id_tecnico        INT NULL,
    operador_nombre   VARCHAR(120) NOT NULL,
    epp_verificado    BOOLEAN NOT NULL DEFAULT FALSE,
    ausencia_tension  BOOLEAN NOT NULL DEFAULT FALSE,
    bloqueo_tableros  BOOLEAN NOT NULL DEFAULT FALSE,
    ip_origen         VARCHAR(45) NULL,
    fecha_aceptacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_protocolo_tecnico
        FOREIGN KEY (id_tecnico)
        REFERENCES usuarios_tecnicos(id_tecnico)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 9. AUDITORÍA DE SEGURIDAD (accesos, altas, bajas, cambios críticos)
-- =====================================================================
CREATE TABLE auditoria_seguridad (
    id_auditoria  INT AUTO_INCREMENT PRIMARY KEY,
    actor_email   VARCHAR(120) NOT NULL,
    accion        VARCHAR(80)  NOT NULL,
    entidad       VARCHAR(60)  NOT NULL,
    detalle       VARCHAR(255) NULL,
    ip_origen     VARCHAR(45)  NULL,
    nivel         ENUM('INFO', 'WARN', 'CRITICAL') NOT NULL DEFAULT 'INFO',
    fecha_evento  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_auditoria_fecha (fecha_evento),
    INDEX idx_auditoria_nivel (nivel)
) ENGINE=InnoDB;

-- =====================================================================
-- DATOS INICIALES DE PRUEBA
-- =====================================================================

-- Nota: El hash corresponde a "Admin#2026" generado con bcrypt (10 rondas).
-- En producción, cambiar la contraseña inmediatamente desde el script de seed o panel.
INSERT INTO super_admin (nombre, email, password_hash, activo) VALUES
('Administrador Principal', 'admin@electriapp.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE);

INSERT INTO oficios (id_oficio, descripcion, activo) VALUES
('ELECTRICIDAD', 'Electricidad e Instalaciones', TRUE),
('PLOMERIA',     'Plomería y Redes de Agua',     TRUE),
('GAS_CLIMA',    'Gas y Climatización',          TRUE),
('ALBANILERIA',  'Construcción y Albañilería',   TRUE);

INSERT INTO clientes (nombre, telefono, direccion) VALUES
('Carlos Mendoza',               '+54 9 381 455-8822', 'Barrio Norte, Block B, Depto 4, Tucumán'),
('Marta Rodríguez',              '+54 9 381 509-2144', 'Av. Avellaneda 1245, Tucumán'),
('Talleres Metalúrgicos S.R.L.', '+54 9 381 671-0099', 'Ruta 9, Km 120 — Galpón Industrial');

INSERT INTO usuarios_tecnicos (nombre, email, telefono, id_oficio) VALUES
('Pedro Electricista', 'pedro@electriapp.com', '+54 9 381 111-1111', 'ELECTRICIDAD'),
('Lucas Plomero',      'lucas@electriapp.com', '+54 9 381 222-2222', 'PLOMERIA'),
('Jorge Gasista',      'jorge@electriapp.com', '+54 9 381 333-3333', 'GAS_CLIMA');

INSERT INTO trabajos (id_cliente, id_tecnico, descripcion, prioridad_riesgo, detalles_arreglos, total) VALUES
(1, 1, 'Cortocircuito intermitente en fase trifásica de acometida. Se detectó falla en el neutro.', 'RIESGO_ALTO', TRUE,  45000.00),
(2, 1, 'Instalación y certificación de tablero seccional nuevo con disyuntor diferencial.',         'SEGURO',      FALSE, 32000.00),
(3, 3, 'Revisión de cable a tierra y corrientes de fuga en maquinaria pesada. Requiere informe.',   'RIESGO_BAJO', TRUE,  125000.00);

INSERT INTO historial_estados (id_trabajo, estado, semaforo, observaciones) VALUES
(1, 'PENDIENTE',  'ROJO',     'Esperando materiales aislantes y autorización de corte'),
(2, 'FINALIZADO', 'VERDE',    'Tablero certificado y prueba de disyuntor aprobada'),
(3, 'EN PROCESO', 'AMARILLO', 'Medición de jabalina en curso');

INSERT INTO comprobantes (id_trabajo, total, codigo_comprobante) VALUES
(1,  45000.00, 'FAC-0001'),
(2,  32000.00, 'FAC-0002'),
(3, 125000.00, 'FAC-0003');

INSERT INTO auditoria_seguridad (actor_email, accion, entidad, detalle, nivel) VALUES
('sistema@electriapp.com', 'INIT_DB', 'AviGoZa_elec_db', 'Base de datos inicializada con esquema v2.0', 'INFO');
