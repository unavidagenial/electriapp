-- 1. CREACIÓN Y USO DE LA BASE DE DATOS
CREATE DATABASE IF NOT EXISTS AviGoZa_elec_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE AviGoZa_elec_db;

-- 2. TABLA: SUPERADMIN
CREATE TABLE super_admin (
    id_supad INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- 3. TABLA: CLIENTES
CREATE TABLE clientes (
    id_cliente INT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. TABLA: OFICIOS
CREATE TABLE oficios (
    id_oficio VARCHAR(60) NOT NULL PRIMARY KEY,
    activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- 5. TABLA: TÉCNICOS
CREATE TABLE usuarios_tecnicos (
    id_tecnico INT NOT NULL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    telefono INT (15) NULL,
    disponibilidad BOOLEAN NOT NULL DEFAULT TRUE,
    id_oficio VARCHAR (60),                       
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_tecnico_oficio FOREIGN KEY (id_oficio) 
	REFERENCES oficios (id_oficio) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. 
CREATE TABLE historial_estados (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_trabajo INT NULL,
    estado VARCHAR(30) NOT NULL, 
    semaforo ENUM('VERDE', 'AMARILLO', 'ROJO') NOT NULL DEFAULT 'VERDE', -- "verde/amar./rojo" en el dibujo
    observaciones VARCHAR(255) NULL,
    fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. TABLA: TRABAJOS
CREATE TABLE trabajos (
    id_trabajo INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_tecnico INT NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00, 
    fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    fecha_fin DATETIME NULL, 
    id_historial INT NULL,
    CONSTRAINT fk_trabajo_cliente FOREIGN KEY (id_cliente) 
        REFERENCES clientes (id_cliente) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_trabajo_tecnico FOREIGN KEY (id_tecnico) 
        REFERENCES usuarios_tecnicos (id_tecnico) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_trabajo_historial FOREIGN KEY (id_historial) 
        REFERENCES historial_estados (id_historial) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;


ALTER TABLE historial_estados 
ADD CONSTRAINT fk_historial_trabajo FOREIGN KEY (id_trabajo) 
REFERENCES trabajos (id_trabajo) ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. TABLA: COMPROBANTES
CREATE TABLE comprobantes (
    id_comprobante INT AUTO_INCREMENT PRIMARY KEY,
    id_trabajo INT NOT NULL,
    fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- "datetime fecha_emision"
    total DECIMAL(12,2) NOT NULL,
    codigo_comprobante VARCHAR(30) NOT NULL UNIQUE,
    CONSTRAINT fk_comprobante_trabajo FOREIGN KEY (id_trabajo) 
        REFERENCES trabajos (id_trabajo) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 9. INSERCIÓN DE DATOS INICIALES (Semillas de Oficios)
INSERT INTO oficios (codigo, id_oficio, activo) VALUES
('ELECTRICIDAD', 'Electricidad e Instalaciones', TRUE),
('PLOMERIA', 'Plomería y Redes de Agua', TRUE),
('GAS_CLIMA', 'Gas y Climatización', TRUE),
('ALBANILERIA', 'construccion', TRUE)
ON DUPLICATE KEY UPDATE id_oficio=VALUES(id_oficio);

-- Cambio a tabla oficios que le faltaba una columna
alter table oficios
add codigo varchar(60) not null;

-- mostrar tabla oficios para verificar
select * from oficios;
