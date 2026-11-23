const express = require("express");
const { pool } = require("../config/db");
const { requireSuperAdmin, logAudit } = require("../middleware/security");

const router = express.Router();

const MAP_SEMAFORO = {
    RIESGO_ALTO: "ROJO",
    RIESGO_BAJO: "AMARILLO",
    SEGURO: "VERDE"
};

/**
 * GET /api/trabajos
 * Lista consolidada de trabajos con cliente, técnico, oficio, último estado y comprobante
 */
router.get("/", async (req, res) => {
    try {
        const { q = "", oficio = "", riesgo = "", estado = "" } = req.query;
        const params = [];
        let where = "WHERE 1=1";

        if (q.trim()) {
            where += " AND (c.nombre LIKE ? OR c.direccion LIKE ? OR tr.descripcion LIKE ? OR CAST(tr.id_trabajo AS CHAR) = ?)";
            const like = `%${q.trim()}%`;
            params.push(like, like, like, q.trim());
        }
        if (oficio.trim()) {
            where += " AND o.id_oficio = ?";
            params.push(oficio.trim());
        }
        if (riesgo.trim()) {
            where += " AND tr.prioridad_riesgo = ?";
            params.push(riesgo.trim());
        }
        if (estado.trim()) {
            where += " AND he.estado = ?";
            params.push(estado.trim());
        }

        const [rows] = await pool.execute(
            `SELECT
                tr.id_trabajo AS id,
                c.id_cliente,
                c.nombre,
                c.telefono,
                c.direccion,
                tr.id_tecnico,
                te.nombre AS tecnico_nombre,
                o.id_oficio,
                o.descripcion AS oficio_nombre,
                tr.descripcion,
                tr.prioridad_riesgo AS seguridad,
                tr.detalles_arreglos AS detallesArreglos,
                tr.total AS monto,
                tr.fecha_inicio,
                COALESCE(he.estado, 'PENDIENTE') AS estado,
                COALESCE(he.semaforo, 'ROJO') AS semaforo,
                co.codigo_comprobante AS comprobante
             FROM trabajos tr
             INNER JOIN clientes c ON tr.id_cliente = c.id_cliente
             INNER JOIN usuarios_tecnicos te ON tr.id_tecnico = te.id_tecnico
             LEFT JOIN oficios o ON te.id_oficio = o.id_oficio
             LEFT JOIN historial_estados he ON he.id_historial = (
                 SELECT MAX(h2.id_historial) FROM historial_estados h2 WHERE h2.id_trabajo = tr.id_trabajo
             )
             LEFT JOIN comprobantes co ON co.id_trabajo = tr.id_trabajo
             ${where}
             ORDER BY FIELD(tr.prioridad_riesgo, 'RIESGO_ALTO', 'RIESGO_BAJO', 'SEGURO'), tr.id_trabajo DESC`,
            params
        );

        res.json(rows.map((r) => ({ ...r, monto: Number(r.monto), detallesArreglos: Boolean(r.detallesArreglos) })));
    } catch (err) {
        console.error("[GET /api/trabajos]", err.message);
        res.status(500).json({ error: "No se pudieron obtener los trabajos." });
    }
});

/**
 * POST /api/trabajos
 * Crea cliente + trabajo + estado inicial + comprobante dentro de una transacción ACID
 */
router.post("/", async (req, res) => {
    const {
        nombre, telefono, direccion, descripcion,
        monto, seguridad = "RIESGO_BAJO", detallesArreglos = false,
        id_tecnico = 1, estado = "PENDIENTE"
    } = req.body || {};

    if (!nombre || !telefono || !direccion || !descripcion || Number.isNaN(Number(monto))) {
        return res.status(400).json({ error: "Completá todos los campos obligatorios." });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [cliResult] = await conn.execute(
            `INSERT INTO clientes (nombre, telefono, direccion) VALUES (?, ?, ?)`,
            [nombre, telefono, direccion]
        );
        const idCliente = cliResult.insertId;

        const [trabResult] = await conn.execute(
            `INSERT INTO trabajos (id_cliente, id_tecnico, descripcion, prioridad_riesgo, detalles_arreglos, total)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [idCliente, Number(id_tecnico) || 1, descripcion, seguridad, Boolean(detallesArreglos), Number(monto)]
        );
        const idTrabajo = trabResult.insertId;

        await conn.execute(
            `INSERT INTO historial_estados (id_trabajo, estado, semaforo, observaciones)
             VALUES (?, ?, ?, ?)`,
            [idTrabajo, estado, MAP_SEMAFORO[seguridad] || "AMARILLO", "Registro inicial de trabajo"]
        );

        const codigo = `FAC-${String(idTrabajo).padStart(4, "0")}`;
        await conn.execute(
            `INSERT INTO comprobantes (id_trabajo, total, codigo_comprobante) VALUES (?, ?, ?)`,
            [idTrabajo, Number(monto), codigo]
        );

        await conn.commit();

        await logAudit({
            actorEmail: req.admin?.email || "operador@electriapp.com",
            accion: "CREATE_TRABAJO",
            entidad: "trabajos",
            detalle: `Trabajo #${idTrabajo} (${codigo}) creado para ${nombre}`,
            ip: req.ip
        });

        res.status(201).json({ id: idTrabajo, comprobante: codigo, message: "Registro creado correctamente." });
    } catch (err) {
        await conn.rollback();
        console.error("[POST /api/trabajos]", err.message);
        res.status(500).json({ error: "Error al crear el registro." });
    } finally {
        conn.release();
    }
});

/**
 * PUT /api/trabajos/:id
 * Actualiza datos del cliente, trabajo, comprobante y agrega registro en historial_estados
 */
router.put("/:id", async (req, res) => {
    const idTrabajo = Number(req.params.id);
    const {
        nombre, telefono, direccion, descripcion,
        monto, seguridad, detallesArreglos, id_tecnico, estado
    } = req.body || {};

    if (!idTrabajo) return res.status(400).json({ error: "ID inválido." });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existing] = await conn.execute(
            `SELECT id_cliente FROM trabajos WHERE id_trabajo = ?`,
            [idTrabajo]
        );
        if (!existing.length) {
            await conn.rollback();
            return res.status(404).json({ error: "Trabajo no encontrado." });
        }

        const idCliente = existing[0].id_cliente;

        await conn.execute(
            `UPDATE clientes SET nombre = ?, telefono = ?, direccion = ? WHERE id_cliente = ?`,
            [nombre, telefono, direccion, idCliente]
        );

        await conn.execute(
            `UPDATE trabajos
             SET id_tecnico = COALESCE(?, id_tecnico),
                 descripcion = ?,
                 prioridad_riesgo = ?,
                 detalles_arreglos = ?,
                 total = ?,
                 fecha_fin = CASE WHEN ? = 'FINALIZADO' THEN NOW() ELSE fecha_fin END
             WHERE id_trabajo = ?`,
            [id_tecnico || null, descripcion, seguridad, Boolean(detallesArreglos), Number(monto), estado || "PENDIENTE", idTrabajo]
        );

        await conn.execute(
            `UPDATE comprobantes SET total = ? WHERE id_trabajo = ?`,
            [Number(monto), idTrabajo]
        );

        if (estado) {
            await conn.execute(
                `INSERT INTO historial_estados (id_trabajo, estado, semaforo, observaciones)
                 VALUES (?, ?, ?, ?)`,
                [idTrabajo, estado, MAP_SEMAFORO[seguridad] || "AMARILLO", "Actualización desde SIGES-ELEC"]
            );
        }

        await conn.commit();

        await logAudit({
            actorEmail: req.admin?.email || "operador@electriapp.com",
            accion: "UPDATE_TRABAJO",
            entidad: "trabajos",
            detalle: `Trabajo #${idTrabajo} actualizado (${estado || "sin cambio de estado"})`,
            ip: req.ip
        });

        res.json({ message: "Trabajo actualizado correctamente." });
    } catch (err) {
        await conn.rollback();
        console.error("[PUT /api/trabajos/:id]", err.message);
        res.status(500).json({ error: "Error al actualizar el registro." });
    } finally {
        conn.release();
    }
});

/**
 * DELETE /api/trabajos/:id
 * Solo Super Admin puede eliminar un trabajo y su comprobante
 */
router.delete("/:id", requireSuperAdmin, async (req, res) => {
    const idTrabajo = Number(req.params.id);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.execute(`DELETE FROM comprobantes WHERE id_trabajo = ?`, [idTrabajo]);
        const [del] = await conn.execute(`DELETE FROM trabajos WHERE id_trabajo = ?`, [idTrabajo]);
        if (!del.affectedRows) {
            await conn.rollback();
            return res.status(404).json({ error: "Trabajo no encontrado." });
        }
        await conn.commit();

        await logAudit({
            actorEmail: req.admin.email,
            accion: "DELETE_TRABAJO",
            entidad: "trabajos",
            detalle: `Trabajo #${idTrabajo} eliminado por Super Admin`,
            ip: req.ip,
            nivel: "WARN"
        });

        res.json({ message: "Trabajo eliminado." });
    } catch (err) {
        await conn.rollback();
        console.error("[DELETE /api/trabajos/:id]", err.message);
        res.status(500).json({ error: "No se pudo eliminar el trabajo." });
    } finally {
        conn.release();
    }
});

/**
 * POST /api/trabajos/protocolo
 * Persiste la declaración jurada de protocolo de seguridad
 */
router.post("/protocolo", async (req, res) => {
    const { operador_nombre = "Técnico en Campo", id_tecnico = null, epp, tension, bloqueo } = req.body || {};
    if (!epp || !tension || !bloqueo) {
        return res.status(400).json({ error: "Debés confirmar los 3 puntos obligatorios del protocolo." });
    }
    try {
        await pool.execute(
            `INSERT INTO protocolos_seguridad (id_tecnico, operador_nombre, epp_verificado, ausencia_tension, bloqueo_tableros, ip_origen)
             VALUES (?, ?, TRUE, TRUE, TRUE, ?)`,
            [id_tecnico || null, operador_nombre, (req.ip || "").slice(0, 45)]
        );

        await logAudit({
            actorEmail: operador_nombre,
            accion: "PROTOCOLO_CONFIRMADO",
            entidad: "protocolos_seguridad",
            detalle: "EPP, ausencia de tensión y bloqueo verificados",
            ip: req.ip,
            nivel: "INFO"
        });

        res.status(201).json({ message: "Protocolo de seguridad registrado." });
    } catch (err) {
        console.error("[POST /api/trabajos/protocolo]", err.message);
        res.status(500).json({ error: "No se pudo registrar el protocolo." });
    }
});

module.exports = router;
