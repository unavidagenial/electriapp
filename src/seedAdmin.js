/**
 * Script seguro para crear o actualizar la contraseña hasheada del Super Admin
 * Uso: npm run seed:admin
 */
const bcrypt = require("bcryptjs");
const { pool } = require("./config/db");
require("dotenv").config();

async function seedAdmin() {
    const nombre = process.env.SEED_ADMIN_NAME || "Administrador Principal";
    const email = process.env.SEED_ADMIN_EMAIL || "admin@electriapp.com";
    const password = process.env.SEED_ADMIN_PASSWORD || "Admin#2026";

    const hash = await bcrypt.hash(password, 10);

    await pool.execute(
        `INSERT INTO super_admin (nombre, email, password_hash, activo)
         VALUES (?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            password_hash = VALUES(password_hash),
            activo = TRUE,
            intentos_fallidos = 0,
            bloqueado_hasta = NULL`,
        [nombre, email, hash]
    );

    console.log(`[OK] Super Admin configurado: ${email}`);
    process.exit(0);
}

seedAdmin().catch((err) => {
    console.error("[ERROR] No se pudo inicializar el Super Admin:", err.message);
    process.exit(1);
});
