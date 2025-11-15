const express = require('express');
const cors = require('cors'); // ← Asegúrate de importar cors si lo necesitas
const app = express();
const port = process.env.PORT || 4000;
const usersRoutes = require('./routes/users');
const poemaRoute = require('./routes/poema');
const autorRoute = require('./routes/autor');
const palabraRoute = require('./routes/palabra');

// Middleware para habilitar CORS (si estás llamando desde Next.js u otro origen)
app.use(cors());

// Middleware necesario para leer JSON en req.body
app.use(express.json());

// Ruta base
app.get('/', (req, res) => {
  res.send('Welcome to the REST API!');
});


app.get("/health/db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Rutas de usuarios
app.use('/users', usersRoutes);

// Rutas de poemas
app.use('/poema',poemaRoute)

//Rutas de autores
app.use('/autor',autorRoute)

//Rutas de palabra
app.use('/palabra',palabraRoute)

// Iniciar servidor
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
