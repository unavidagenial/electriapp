const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { JWT_SECRET, loginLimiter, requireSuperAdmin, logAudit } = require("../middleware/security");

const router = express.Router();
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/**
 * POST /api/auth/login
 * Autenticación de Super Admin con bloqueo automático ante intentos fallidos
 */
router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: "Ingresá email y contraseña." });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT id_supad, nombre, email, password_hash, activo, intentos_fallidos, bloqueado_hasta
             FROM super_admin WHERE email = ? LIMIT 1`,
            [email.toLowerCase()]
        );

        const admin = rows[0];
        if (!admin || !admin.activo) {
            await logAudit({
                actorEmail: email,
                accion: "LOGIN_FAILED",
                entidad: "super_admin",
                detalle: "Usuario inexistente o inactivo",
                ip: req.ip,
                nivel: "WARN"
            });
            return res.status(401).json({ error: "Credenciales inválidas." });
        }

        if (admin.bloqueado_hasta && new Date(admin.bloqueado_hasta) > new Date()) {
            return res.status(423).json({
                error: "Cuenta bloqueada temporalmente por intentos fallidos. Reintentá más tarde."
            });
        }

        const isValid = await bcrypt.compare(password, admin.password_hash);
        if (!isValid) {
            const nextAttempts = (admin.intentos_fallidos || 0) + 1;
            const lockUntil = nextAttempts >= MAX_ATTEMPTS
                ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
                : null;

            await pool.execute(
                `UPDATE super_admin SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id_supad = ?`,
                [nextAttempts, lockUntil, admin.id_supad]
            );

            await logAudit({
                actorEmail: admin.email,
                accion: lockUntil ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
                entidad: "super_admin",
                detalle: `Intento fallido #${nextAttempts}`,
                ip: req.ip,
                nivel: lockUntil ? "CRITICAL" : "WARN"
            });

            return res.status(401).json({ error: "Credenciales inválidas." });
        }

        // Login exitoso: resetear contador y registrar acceso
        await pool.execute(
            `UPDATE super_admin SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW()
             WHERE id_supad = ?`,
            [admin.id_supad]
        );

        const token = jwt.sign(
            { id: admin.id_supad, nombre: admin.nombre, email: admin.email, role: "SUPER_ADMIN" },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "4h" }
        );

        await logAudit({
            actorEmail: admin.email,
            accion: "LOGIN_SUCCESS",
            entidad: "super_admin",
            detalle: "Acceso Super Admin concedido",
            ip: req.ip,
            nivel: "INFO"
        });

        res.json({
            token,
            admin: { id: admin.id_supad, nombre: admin.nombre, email: admin.email, role: "SUPER_ADMIN" }
        });
    } catch (err) {
        console.error("[AUTH ERROR]", err.message);
        res.status(500).json({ error: "Error interno al autenticar." });
    }
});

/**
 * GET /api/auth/me
 * Valida la sesión activa del Super Admin
 */
router.get("/me", requireSuperAdmin, (req, res) => {
    res.json({ admin: req.admin });
});

module.exports = router;
