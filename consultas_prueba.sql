-- =====================================================================
-- ElectriApp / SIGES-ELEC — Consultas de Verificación y Reportes SQL
-- =====================================================================
USE AviGoZa_elec_db;

-- 1. Vista general consolidada (último estado por trabajo + cliente + técnico + oficio + comprobante)
SELECT
    tr.id_trabajo,
    c.nombre AS cliente,
    c.telefono,
    t.nombre AS tecnico,
    o.descripcion AS oficio,
    tr.descripcion AS trabajo,
    tr.prioridad_riesgo,
    he.estado,
    he.semaforo,
    tr.total,
    co.codigo_comprobante
FROM trabajos tr
INNER JOIN clientes c ON tr.id_cliente = c.id_cliente
INNER JOIN usuarios_tecnicos t ON tr.id_tecnico = t.id_tecnico
LEFT JOIN oficios o ON t.id_oficio = o.id_oficio
LEFT JOIN historial_estados he ON he.id_historial = (
    SELECT MAX(h2.id_historial)
    FROM historial_estados h2
    WHERE h2.id_trabajo = tr.id_trabajo
)
LEFT JOIN comprobantes co ON tr.id_trabajo = co.id_trabajo
ORDER BY FIELD(tr.prioridad_riesgo, 'RIESGO_ALTO', 'RIESGO_BAJO', 'SEGURO'), tr.id_trabajo DESC;

-- 2. Facturación acumulada por técnico
SELECT
    te.nombre AS tecnico,
    o.descripcion AS oficio,
    COUNT(tr.id_trabajo) AS cantidad_trabajos,
    COALESCE(SUM(tr.total), 0) AS total_facturado
FROM usuarios_tecnicos te
LEFT JOIN oficios o ON te.id_oficio = o.id_oficio
LEFT JOIN trabajos tr ON tr.id_tecnico = te.id_tecnico
GROUP BY te.id_tecnico, te.nombre, o.descripcion;

-- 3. Cantidad de trabajos por nivel de riesgo
SELECT
    prioridad_riesgo,
    COUNT(*) AS cantidad,
    SUM(total) AS monto_estimado
FROM trabajos
GROUP BY prioridad_riesgo;

-- 4. Trabajos sin comprobante emitido
SELECT
    tr.id_trabajo,
    c.nombre AS cliente,
    tr.descripcion,
    tr.total
FROM trabajos tr
INNER JOIN clientes c ON tr.id_cliente = c.id_cliente
LEFT JOIN comprobantes co ON tr.id_trabajo = co.id_trabajo
WHERE co.id_comprobante IS NULL;

-- 5. Control de integridad referencial (debe devolver 0 filas)
SELECT tr.id_trabajo
FROM trabajos tr
LEFT JOIN clientes c ON tr.id_cliente = c.id_cliente
WHERE c.id_cliente IS NULL;

-- 6. Últimos eventos de auditoría de seguridad
SELECT * FROM auditoria_seguridad
ORDER BY fecha_evento DESC
LIMIT 20;
