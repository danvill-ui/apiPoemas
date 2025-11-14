const express = require('express');
const router = express.Router();
const pool = require('../db/connection'); // asegúrate que exporta Pool de pg

// Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener usuarios');
  }
});

// Obtener usuario por ID
router.get('/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).send('ID de usuario inválido');
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).send('Usuario no encontrado');
    }
  } catch (err) {
    console.error('Error al consultar la base de datos:', err);
    res.status(500).send('Error interno del servidor');
  }
});

// Login de usuario
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({ id: user.id, name: user.nombre });
    } else {
      res.status(401).send('Credenciales inválidas');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error interno');
  }
});

router.post('/register', async (req, res) => {

  console.log(req)
  const { nombre, email, password } = req.body;

  try {
    // Generar hash de la contraseña
   // const hashedPassword = await bcrypt.hash(password, 10);
    console.log(req.body)
    // Insertar en la base de datos
    await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)',
      [nombre, email, password]
    );

    res.status(201).send('Usuario registrado correctamente');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al registrar usuario');
  }
});

module.exports = router;
