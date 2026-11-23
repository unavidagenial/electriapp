const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
require("dotenv").config();

const { checkConnection } = require("./config/db");
const { apiLimiter, sanitizeBody } = require("./middleware/security");
const authRoutes = require("./routes/auth.routes");
const trabajosRoutes = require("./routes/trabajos.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Seguridad HTTP (CSP ajustado para fuentes de Google y CDN de jsPDF)
app.use(
    helmet({
        contentSecurityPolicy: false
    })
);
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeBody);
app.use("/api", apiLimiter);

// Healthcheck (usado por el frontend para detectar si el backend SQL está activo)
app.get("/api/health", async (_req, res) => {
    try {
        await checkConnection();
        res.json({ status: "ok", mode: "MYSQL_API", database: process.env.DB_NAME || "AviGoZa_elec_db" });
    } catch (err) {
        res.status(503).json({ status: "degraded", error: "Sin conexión a MySQL: " + err.message });
    }
});

// Rutas API
app.use("/api/auth", authRoutes);
app.use("/api/trabajos", trabajosRoutes);
app.use("/api/admin", adminRoutes);

// Servir Frontend estático desde ../frontend
const frontendDir = path.join(__dirname, "../../frontend");
app.use(express.static(frontendDir));

app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
});

app.listen(PORT, () => {
    console.log(`⚡ ElectriApp / SIGES-ELEC corriendo en http://localhost:${PORT}`);
});
