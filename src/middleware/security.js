const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "electriapp_dev_secret_change_me";

/**
 * Límite general de peticiones API (mitiga abuso y DoS básico)
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas solicitudes. Intentá nuevamente en unos minutos." }
});

/**
 * Límite estricto para intentos de login (protección contra fuerza bruta)
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiados intentos de inicio de sesión. Esperá 15 minutos." }
});

/**
 * Sanitizador recursivo de entradas para prevenir XSS almacenado
 */
function cleanString(value) {
    if (typeof value !== "string") return value;
    return value
        .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script>/gi, "")
        .replace(/[<>]/g, "")
        .trim();
}

function sanitizeObject(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    const sanitized = {};
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") {
            // No modificar contraseñas antes de comparar/hashear
            sanitized[k] = k.toLowerCase().includes("password") || k.toLowerCase().includes("contrasena")
                ? v
                : cleanString(v);
        } else if (v && typeof v === "object") {
            sanitized[k] = sanitizeObject(v);
        } else {
            sanitized[k] = v;
        }
    }
    return sanitized;
}

function sanitizeBody(req, _res, next) {
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeObject(req.body);
    }
    next();
}

/**
 * Verificación de token JWT para rutas protegidas de Super Admin
 */
function requireSuperAdmin(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Autenticación de Super Admin requerida." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== "SUPER_ADMIN") {
            return res.status(403).json({ error: "Permisos insuficientes." });
        }
        req.admin = decoded;
        next();
    } catch (_err) {
        return res.status(401).json({ error: "Sesión expirada o token inválido." });
    }
}

/**
 * Registro automático de eventos en auditoria_seguridad
 */
async function logAudit({ actorEmail, accion, entidad, detalle = "", ip = "", nivel = "INFO" }) {
    try {
        await pool.execute(
            `INSERT INTO auditoria_seguridad (actor_email, accion, entidad, detalle, ip_origen, nivel)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [actorEmail || "anonimo", accion, entidad, detalle.slice(0, 255), (ip || "").slice(0, 45), nivel]
        );
    } catch (err) {
        console.error("[AUDIT ERROR]", err.message);
    }
}

module.exports = {
    JWT_SECRET,
    apiLimiter,
    loginLimiter,
    sanitizeBody,
    requireSuperAdmin,
    logAudit
};
