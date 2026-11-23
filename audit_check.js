#!/usr/bin/env node
/**
 * ElectriApp / SIGES-ELEC — Automatización de Chequeo de Seguridad Pre-Commit
 * Uso: node security/audit_check.js
 */
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const issues = [];
const warnings = [];

function checkFileExists(relPath) {
    return fs.existsSync(path.join(rootDir, relPath));
}

function scanDir(dir, exts, callback) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(full, exts, callback);
        } else if (exts.some((ext) => entry.name.endsWith(ext))) {
            callback(full, fs.readFileSync(full, "utf8"));
        }
    }
}

console.log("🛡️  Ejecutando auditoría automática de seguridad de ElectriApp...\n");

// 1. Verificar .gitignore
if (!checkFileExists(".gitignore")) {
    issues.push("Falta .gitignore en la raíz del proyecto.");
} else {
    const gi = fs.readFileSync(path.join(rootDir, ".gitignore"), "utf8");
    if (!gi.includes(".env")) issues.push(".gitignore no excluye archivos .env.");
    if (!gi.includes("node_modules")) issues.push(".gitignore no excluye node_modules/.");
}

// 2. Verificar que no exista .env real listo para subirse
if (checkFileExists("backend/.env") || checkFileExists(".env")) {
    warnings.push("Existe un archivo .env local. Asegurate de no agregarlo a git (git status).");
}

// 3. Escanear JS en busca de patrones peligrosos (eval, contraseñas en texto plano, SQL concatenado)
scanDir(rootDir, [".js"], (file, content) => {
    const rel = path.relative(rootDir, file);
    if (rel.startsWith("security")) return;

    if (/\beval\s*\(/.test(content)) {
        issues.push(`[XSS/RCE] Uso de eval() detectado en ${rel}`);
    }
    if (/SELECT\s+.*\$\{.*\}\s*FROM/i.test(content) || /INSERT\s+INTO\s+.*\$\{/i.test(content)) {
        issues.push(`[SQLi] Posible concatenación de variables en consulta SQL en ${rel}`);
    }
});

// 4. Escanear SQL en busca de contraseñas en texto plano obvias
scanDir(path.join(rootDir, "database"), [".sql"], (file, content) => {
    const rel = path.relative(rootDir, file);
    if (/'admin123'/i.test(content)) {
        issues.push(`[AUTH] Contraseña en texto plano 'admin123' encontrada en ${rel}`);
    }
});

if (warnings.length) {
    console.log("⚠️  Advertencias:");
    warnings.forEach((w) => console.log("   - " + w));
    console.log("");
}

if (issues.length) {
    console.error("❌ Problemas de seguridad encontrados:");
    issues.forEach((i) => console.error("   - " + i));
    process.exit(1);
} else {
    console.log("✅ Auditoría de seguridad aprobada sin vulnerabilidades críticas.");
    process.exit(0);
}
