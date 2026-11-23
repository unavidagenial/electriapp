const express = require("express");
const { pool } = require("../config/db");
const { requireSuperAdmin, logAudit } = require("../middleware/security");

const router = express.Router();

/**
 * GET /api/admin/catalogos
 * Público para poblar selectores de oficios y técnicos activos en el formulario
 */
router.get("/catalogos", async (_req, res) => {
    try {
        const [oficios] = await pool.execute(
            `SELECT id_oficio, descripcion, activo FROM oficios ORDER BY descripcion ASC`
        );
        const [tecnicos] = await pool.execute(
            `SELECT t.id_tecnico, t.nombre, t.email, t.telefono, t.disponibilidad, t.id_oficio, t.activo,
                    o.descripcion AS oficio_nombre
             FROM usuarios_tecnicos t
             LEFT JOIN oficios o ON t.id_oficio = o.id_oficio
             ORDER BY t.nombre ASC`
        );
        res.json({ oficios, tecnicos });
    } catch (err) {
        console.error("[GET /api/admin/catalogos]", err.message);
        res.status(500).json({ error: "Error al cargar catálogos." });
    }
});

/**
 * POST /api/admin/oficios (Solo Super Admin)
 */
router.post("/oficios", requireSuperAdmin, async (req, res) => {
    const { id_oficio, descripcion } = req.body || {};
    if (!id_oficio || !descripcion) {
        return res.status(400).json({ error: "Código y descripción del oficio son obligatorios." });
    }
    const cleanCode = id_oficio.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    try {
        await pool.execute(
            `INSERT INTO oficios (id_oficio, descripcion, activo) VALUES (?, ?, TRUE)`,
            [cleanCode, descripcion]
        );
        await logAudit({
            actorEmail: req.admin.email,
            accion: "CREATE_OFICIO",
            entidad: "oficios",
            detalle: `Nuevo rubro: ${cleanCode} - ${descripcion}`,
            ip: req.ip
        });
        res.status(201).json({ id_oficio: cleanCode, descripcion, activo: true });
    } catch (err) {
        res.status(400).json({ error: "El oficio ya existe o los datos son inválidos." });
    }
});

/**
 * PATCH /api/admin/oficios/:id/toggle (Solo Super Admin)
 */
router.patch("/oficios/:id/toggle", requireSuperAdmin, async (req, res) => {
    try {
        await pool.execute(`UPDATE oficios SET activo = NOT activo WHERE id_oficio = ?`, [req.params.id]);
        await logAudit({
            actorEmail: req.admin.email,
            accion: "TOGGLE_OFICIO",
            entidad: "oficios",
            detalle: `Estado cambiado para ${req.params.id}`,
            ip: req.ip
        });
        res.json({ message: "Estado de oficio actualizado." });
    } catch (err) {
        res.status(500).json({ error: "Error al actualizar oficio." });
    }
});

/**
 * POST /api/admin/tecnicos (Solo Super Admin)
 */
router.post("/tecnicos", requireSuperAdmin, async (req, res) => {
    const { nombre, email, telefono = "", id_oficio = null } = req.body || {};
    if (!nombre || !email) {
        return res.status(400).json({ error: "Nombre y email del técnico son obligatorios." });
    }
    try {
        const [result] = await pool.execute(
            `INSERT INTO usuarios_tecnicos (nombre, email, telefono, id_oficio, disponibilidad, activo)
             VALUES (?, ?, ?, ?, TRUE, TRUE)`,
            [nombre, email.toLowerCase(), telefono, id_oficio || null]
        );
        await logAudit({
            actorEmail: req.admin.email,
            accion: "CREATE_TECNICO",
            entidad: "usuarios_tecnicos",
            detalle: `Técnico creado: ${nombre} (${email})`,
            ip: req.ip
        });
        res.status(201).json({ id_tecnico: result.insertId, nombre, email, telefono, id_oficio });
    } catch (err) {
        res.status(400).json({ error: "Email duplicado o datos inválidos." });
    }
});

/**
 * PATCH /api/admin/tecnicos/:id/toggle (Solo Super Admin)
 */
router.patch("/tecnicos/:id/toggle", requireSuperAdmin, async (req, res) => {
    try {
        await pool.execute(
            `UPDATE usuarios_tecnicos SET activo = NOT activo WHERE id_tecnico = ?`,
            [Number(req.params.id)]
        );
        await logAudit({
            actorEmail: req.admin.email,
            accion: "TOGGLE_TECNICO",
            entidad: "usuarios_tecnicos",
            detalle: `Estado cambiado para técnico #${req.params.id}`,
            ip: req.ip
        });
        res.json({ message: "Estado del técnico actualizado." });
    } catch (err) {
        res.status(500).json({ error: "Error al actualizar técnico." });
    }
});

/**
 * GET /api/admin/auditoria (Solo Super Admin)
 */
router.get("/auditoria", requireSuperAdmin, async (_req, res) => {
    try {
        const [eventos] = await pool.execute(
            `SELECT * FROM auditoria_seguridad ORDER BY fecha_evento DESC LIMIT 50`
        );
        const [protocolos] = await pool.execute(
            `SELECT * FROM protocolos_seguridad ORDER BY fecha_aceptacion DESC LIMIT 30`
        );
        res.json({ eventos, protocolos });
    } catch (err) {
        res.status(500).json({ error: "Error al obtener registros de auditoría." });
    }
});

module.exports = router;
