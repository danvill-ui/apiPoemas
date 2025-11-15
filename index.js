const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Importa el cliente pg
require('dotenv').config(); // Usar dotenv para cargar .env si estás en local

const app = express();
const port = process.env.PORT || 4000;

// --- Configuración de PostgreSQL ---
// El constructor de Pool leerá automáticamente la variable de entorno
// DATABASE_URL si está presente.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false, // Render requiere esta configuración SSL en producción
});

// Mensaje de éxito o error al conectar la base de datos
pool.connect()
  .then(client => {
    console.log('✅ Conectado a PostgreSQL con éxito.');
    client.release(); // Libera el cliente inmediatamente
  })
  .catch(err => {
    console.error('❌ Error al conectar a PostgreSQL:', err.message);
    // Puedes decidir si quieres que la aplicación falle si no se conecta a la DB
    // process.exit(1);
  });
// --- Fin Configuración DB ---


// Middleware para habilitar CORS (considera limitar los orígenes en producción)
app.use(cors());

// Middleware necesario para leer JSON en req.body
app.use(express.json());

// Pasa el pool a tus rutas para que puedan hacer consultas
app.use((req, res, next) => {
  req.pool = pool;
  next();
});


// Importación y uso de rutas (Asegúrate de que estas rutas usen req.pool para consultar)
// const usersRoutes = require('./routes/users');
// const poemaRoute = require('./routes/poema');
// const autorRoute = require('./routes/autor');
// const palabraRoute = require('./routes/palabra');

// Ruta base
app.get('/', (req, res) => {
  res.send('Bievenidos a los poemas. Backend operativo.');
});


// Ruta de Health Check de la base de datos
app.get("/health/db", async (req, res) => {
  try {
    // Usa req.pool o la variable pool directamente
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", time: result.rows[0].now });
  } catch (err) {
    console.error("Error en health check DB:", err.message);
    res.status(500).json({ status: "error", message: "Fallo de conexión a la DB." });
  }
});

/*
// Rutas de usuarios (Descomentar cuando estén implementadas)
app.use('/users', usersRoutes);

// Rutas de poemas
app.use('/poema',poemaRoute)

//Rutas de autores
app.use('/autor',autorRoute)

//Rutas de palabra
app.use('/palabra',palabraRoute)
*/

// Iniciar servidor
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`¡Modo producción! Puerto: ${port}`);
  }
});