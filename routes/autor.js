// routes/autores.js
const express = require('express');
const router = express.Router();
const pool = require('../db/connection'); // tu Pool de pg

// Crear un autor
router.post('/', async (req, res) => {
  const { nombre, nacionalidad, fecha_nacimiento, fecha_fallecimiento, biografia } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del autor es obligatorio' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO autores (nombre, nacionalidad, fecha_nacimiento, fecha_fallecimiento, biografia)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nombre, nacionalidad, fecha_nacimiento, fecha_fallecimiento, biografia]
    );

    res.status(201).json({ mensaje: 'Autor creado exitosamente', id: result.rows[0].id });
  } catch (err) {
    console.error('Error al insertar autor:', err);
    res.status(500).json({ error: 'Error al guardar el autor' });
  }
});

// Obtener todos los autores
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM autores');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener autores:', err);
    res.status(500).json({ error: 'Error al obtener autores' });
  }
});

// Obtener autor por ID
router.get('/:id', async (req, res) => {
  const autorId = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM autores WHERE id = $1', [autorId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Autor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener autor:', err);
    res.status(500).json({ error: 'Error al obtener autor' });
  }
});

// Eliminar autor
router.delete('/:id', async (req, res) => {
  const autorId = req.params.id;
  try {
    await pool.query('DELETE FROM autores WHERE id = $1', [autorId]);
    res.json({ mensaje: 'Autor eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar autor:', err);
    res.status(500).json({ error: 'Error al eliminar autor' });
  }
});

// Actualizar autor
router.put('/:id', async (req, res) => {
  const autorId = req.params.id;
  const { nombre, nacionalidad, fecha_nacimiento, fecha_fallecimiento, biografia } = req.body;

  try {
    await pool.query(
      `UPDATE autores
       SET nombre = $1, nacionalidad = $2, fecha_nacimiento = $3, fecha_fallecimiento = $4, biografia = $5
       WHERE id = $6`,
      [nombre, nacionalidad, fecha_nacimiento, fecha_fallecimiento, biografia, autorId]
    );
    res.json({ mensaje: 'Autor actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar autor:', err);
    res.status(500).json({ error: 'Error al actualizar autor' });
  }
});

// Obtener todos los poemas de un autor
router.get('/:id/poemas', async (req, res) => {
  const autorId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT id, titulo, fecha_creacion
       FROM poemas
       WHERE autor_id = $1
       ORDER BY fecha_creacion DESC`,
      [autorId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener poemas del autor:', err);
    res.status(500).json({ error: 'Error al obtener poemas' });
  }
});

module.exports = router;
