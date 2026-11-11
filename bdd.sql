-- =====================================================
-- ELIMINAR Y CREAR BASE DE DATOS
-- =====================================================

DROP DATABASE IF EXISTS AviGoZa_elec_db;

CREATE DATABASE AviGoZa_elec_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE AviGoZa_elec_db;

-- =====================================================
-- SUPER ADMIN
-- =====================================================

CREATE TABLE super_admin (
    id_supad INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- =====================================================
-- CLIENTES
-- =====================================================

CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- OFICIOS
-- =====================================================

CREATE TABLE oficios (
    id_oficio VARCHAR(60) PRIMARY KEY,
    descripcion VARCHAR(120) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- =====================================================
-- TECNICOS
-- =====================================================

CREATE TABLE usuarios_tecnicos (
    id_tecnico INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    disponibilidad BOOLEAN NOT NULL DEFAULT TRUE,
    id_oficio VARCHAR(60),
    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_tecnico_oficio
        FOREIGN KEY (id_oficio)
        REFERENCES oficios(id_oficio)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- TRABAJOS
-- =====================================================

CREATE TABLE trabajos (
    id_trabajo INT AUTO_INCREMENT PRIMARY KEY,

    id_cliente INT NOT NULL,
    id_tecnico INT NOT NULL,

    descripcion VARCHAR(255) NOT NULL,

    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME NULL,

    CONSTRAINT fk_trabajo_cliente
        FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_trabajo_tecnico
        FOREIGN KEY (id_tecnico)
        REFERENCES usuarios_tecnicos(id_tecnico)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- HISTORIAL DE ESTADOS
-- =====================================================

CREATE TABLE historial_estados (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,

    id_trabajo INT NOT NULL,

    estado VARCHAR(30) NOT NULL,

    semaforo ENUM('VERDE','AMARILLO','ROJO')
    NOT NULL DEFAULT 'ROJO',

    observaciones VARCHAR(255),

    fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historial_trabajo
        FOREIGN KEY (id_trabajo)
        REFERENCES trabajos(id_trabajo)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- COMPROBANTES
-- =====================================================

CREATE TABLE comprobantes (
    id_comprobante INT AUTO_INCREMENT PRIMARY KEY,

    id_trabajo INT NOT NULL,

    fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    total DECIMAL(12,2) NOT NULL,

    codigo_comprobante VARCHAR(30) NOT NULL UNIQUE,

    CONSTRAINT fk_comprobante_trabajo
        FOREIGN KEY (id_trabajo)
        REFERENCES trabajos(id_trabajo)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================

INSERT INTO super_admin
(nombre, contrasena)
VALUES
('Administrador','admin123');

INSERT INTO oficios
(id_oficio, descripcion, activo)
VALUES
('ELECTRICIDAD','Electricidad e Instalaciones',TRUE),
('PLOMERIA','Plomería y Redes de Agua',TRUE),
('GAS_CLIMA','Gas y Climatización',TRUE),
('ALBANILERIA','Construcción',TRUE);

INSERT INTO clientes
(nombre, telefono, direccion)
VALUES
('Juan Perez','3814567890','Av. Sarmiento 100'),
('Maria Gomez','3815558888','Belgrano 250'),
('Carlos Ruiz','3814447777','San Martín 350');

INSERT INTO usuarios_tecnicos
(nombre,email,telefono,id_oficio)
VALUES
('Pedro Electricista',
'pedro@gmail.com',
'3811111111',
'ELECTRICIDAD'),

('Lucas Plomero',
'lucas@gmail.com',
'3812222222',
'PLOMERIA'),

('Jorge Gasista',
'jorge@gmail.com',
'3813333333',
'GAS_CLIMA');

INSERT INTO trabajos
(id_cliente,id_tecnico,descripcion,total)
VALUES
(1,1,'Instalación tablero eléctrico',35000),
(2,2,'Reparación de pérdida de agua',18000),
(3,3,'Mantenimiento aire acondicionado',25000);

INSERT INTO historial_estados
(id_trabajo,estado,semaforo,observaciones)
VALUES
(1,'PENDIENTE','ROJO','Esperando materiales'),
(2,'EN PROCESO','AMARILLO','Trabajo iniciado'),
(3,'FINALIZADO','VERDE','Trabajo terminado');

INSERT INTO comprobantes
(id_trabajo,total,codigo_comprobante)
VALUES
(1,35000,'FAC-0001'),
(2,18000,'FAC-0002'),
(3,25000,'FAC-0003');

-- =====================================================
-- CONSULTAS DE PRUEBA
-- =====================================================

-- Clientes
SELECT * FROM clientes;

-- Técnicos
SELECT * FROM usuarios_tecnicos;

-- Oficios
SELECT * FROM oficios;

-- Trabajos
SELECT * FROM trabajos;

-- Historial
SELECT * FROM historial_estados;

-- Comprobantes
SELECT * FROM comprobantes;

-- consultas JOINs

SELECT -- Muestra cada trabajo junto con el cliente que lo solicitó
    t.id_trabajo,
    c.nombre AS cliente,
    t.descripcion,
    t.total
FROM trabajos t
INNER JOIN clientes c
ON t.id_cliente = c.id_cliente; 

SELECT -- Permite saber qué especialidad tiene cada técnico.
    t.nombre,
    o.descripcion AS oficio
FROM usuarios_tecnicos t
INNER JOIN oficios o
ON t.id_oficio = o.id_oficio;

SELECT -- Muestra quién realiza cada trabajo.
    tr.id_trabajo,
    tr.descripcion,
    te.nombre AS tecnico
FROM trabajos tr
INNER JOIN usuarios_tecnicos te
ON tr.id_tecnico = te.id_tecnico;

-- INNER JOIN de 3 tablas
SELECT 
    tr.id_trabajo,
    c.nombre AS cliente,
    te.nombre AS tecnico,
    tr.descripcion
FROM trabajos tr
INNER JOIN clientes c
ON tr.id_cliente = c.id_cliente
INNER JOIN usuarios_tecnicos te
ON tr.id_tecnico = te.id_tecnico;

-- INNER JOIN de 4 tablas
SELECT
    tr.id_trabajo,
    c.nombre AS cliente,
    te.nombre AS tecnico,
    o.descripcion AS oficio
FROM trabajos tr
INNER JOIN clientes c
ON tr.id_cliente = c.id_cliente
INNER JOIN usuarios_tecnicos te
ON tr.id_tecnico = te.id_tecnico
INNER JOIN oficios o
ON te.id_oficio = o.id_oficio;

-- LEFT JOIN: Ver técnicos aunque no tengan oficio
SELECT
    te.nombre,
    o.descripcion
FROM usuarios_tecnicos te
LEFT JOIN oficios o
ON te.id_oficio = o.id_oficio;

-- LEFT JOIN: Ver trabajos aunque no tengan comprobante, Permite detectar trabajos facturados y no facturados.
SELECT
    tr.id_trabajo,
    tr.descripcion,
    co.codigo_comprobante
FROM trabajos tr
LEFT JOIN comprobantes co
ON tr.id_trabajo = co.id_trabajo;

-- Permite visualizar el seguimiento del trabajo
SELECT
    tr.id_trabajo,
    tr.descripcion,
    he.estado,
    he.semaforo
FROM trabajos tr
INNER JOIN historial_estados he
ON tr.id_trabajo = he.id_trabajo;


-- Técnicos con oficio
SELECT
t.id_tecnico,
t.nombre,
o.descripcion AS oficio
FROM usuarios_tecnicos t
JOIN oficios o
ON t.id_oficio = o.id_oficio;

-- Trabajos con cliente y técnico
SELECT
tr.id_trabajo,
c.nombre AS cliente,
t.nombre AS tecnico,
tr.descripcion,
tr.total
FROM trabajos tr
JOIN clientes c
ON tr.id_cliente = c.id_cliente
JOIN usuarios_tecnicos t
ON tr.id_tecnico = t.id_tecnico;

-- Consulta general: Comprueba todas las relaciones de la base
SELECT
tr.id_trabajo,
c.nombre AS cliente,
t.nombre AS tecnico,
o.descripcion AS oficio,
tr.descripcion AS trabajo,
he.estado,
he.semaforo,
tr.total,
co.codigo_comprobante
FROM trabajos tr
JOIN clientes c
ON tr.id_cliente = c.id_cliente
JOIN usuarios_tecnicos t
ON tr.id_tecnico = t.id_tecnico
LEFT JOIN oficios o
ON t.id_oficio = o.id_oficio
LEFT JOIN historial_estados he
ON tr.id_trabajo = he.id_trabajo
LEFT JOIN comprobantes co
ON tr.id_trabajo = co.id_trabajo;

-- Calcula el importe total producido por cada técnico.
SELECT
    te.nombre,
    SUM(tr.total) AS total_facturado
FROM trabajos tr
INNER JOIN usuarios_tecnicos te
ON tr.id_tecnico = te.id_tecnico
GROUP BY te.nombre;

-- cantidad de trabajos por estado
SELECT
    he.estado,
    COUNT(*) AS cantidad
FROM historial_estados he
GROUP BY he.estado;

-- Buscar trabajos finalizados
SELECT
    tr.id_trabajo,
    tr.descripcion,
    he.estado
FROM trabajos tr
INNER JOIN historial_estados he
ON tr.id_trabajo = he.id_trabajo
WHERE he.estado = 'FINALIZADO';

-- Consulta para comprobar que no hay registros huérfanos: Busca trabajos sin cliente asociado.
SELECT
    tr.id_trabajo
FROM trabajos tr
LEFT JOIN clientes c
ON tr.id_cliente = c.id_cliente
WHERE c.id_cliente IS NULL;