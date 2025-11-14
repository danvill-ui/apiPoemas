// routes/poema.js
const express = require('express');
const router = express.Router();
const pool = require('../db/connection'); // tu Pool de pg

router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, titulo, fecha_creacion
       FROM poemas
       ORDER BY fecha_creacion DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener poemas:', err);
    res.status(500).json({ error: 'Error al obtener poemas' });
  } finally {
    client.release();
  }
});

// POST: enviar poema y guardarlo con estrofas, versos y palabras
router.post('/', async (req, res) => {
  const { titulo, texto } = req.body;

  if (!titulo || !texto) {
    return res.status(400).json({ error: 'Faltan campos requeridos: titulo, texto' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insertar el poema
   const resultPoema = await client.query(
      'INSERT INTO poemas (titulo, autor_id) VALUES ($1, $2) RETURNING id',
      [titulo, 1]   // 👈 autor_id siempre 1
    );
    const poemaId = resultPoema.rows[0].id;

    // 2. Separar estrofas por doble salto de línea
    const estrofas = texto.split(/\n\s*\n/);

    for (let i = 0; i < estrofas.length; i++) {
      // Insertar estrofa (si tienes columna contenido, úsala; si no, quita el campo)
      const resultEstrofa = await client.query(
        'INSERT INTO estrofas (poema_id, numero) VALUES ($1, $2) RETURNING id',
        [poemaId, i + 1]
      );
      const estrofaId = resultEstrofa.rows[0].id;

      // 3. Separar versos por salto de línea
      const versos = estrofas[i].trim().split('\n');
      for (let j = 0; j < versos.length; j++) {
        // Insertar verso (igual: si tienes columna contenido, añádela)
        const resultVerso = await client.query(
          'INSERT INTO versos (estrofa_id, numero) VALUES ($1, $2) RETURNING id',
          [estrofaId, j + 1]
        );
        const versoId = resultVerso.rows[0].id;

        // 4. Separar palabras por espacios
        const palabras = versos[j].trim().split(/\s+/);
        for (let k = 0; k < palabras.length; k++) {
          const originalTexto = palabras[k]; // tal cual aparece en el poema
          const palabraNormalizada = originalTexto
            .toUpperCase()
            .replace(/[.,]/g, ""); // quitar puntos y comas

          // Insertar o recuperar palabra normalizada en el diccionario
          const resultPalabra = await client.query(
            `INSERT INTO diccionario_palabras (texto)
             VALUES ($1)
             ON CONFLICT (texto) DO UPDATE SET texto = EXCLUDED.texto
             RETURNING id`,
            [palabraNormalizada]
          );

          const palabraId = resultPalabra.rows[0].id;

          // Relacionar palabra con el verso, guardando también la forma original
          await client.query(
            'INSERT INTO palabras (verso_id, numero, palabra_id, original) VALUES ($1, $2, $3, $4)',
            [versoId, k + 1, palabraId, originalTexto]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Poema guardado con estructura completa', id: poemaId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el poema' });
  } finally {
    client.release();
  }
});




// GET: reconstruir poema completo por ID
router.get('/:id', async (req, res) => {
  const poemaId = req.params.id;
  const client = await pool.connect();

  try {
    // 1. Obtener título del poema
    const poemaResult = await client.query(
      'SELECT titulo FROM poemas WHERE id = $1',
      [poemaId]
    );
    if (poemaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Poema no encontrado' });
    }
    const titulo = poemaResult.rows[0].titulo;

    // 2. Obtener estrofas
    const estrofasResult = await client.query(
      'SELECT id, numero, contenido FROM estrofas WHERE poema_id = $1 ORDER BY numero',
      [poemaId]
    );

    const estrofas = [];
    for (const estrofaRow of estrofasResult.rows) {
      // 3. Obtener versos de cada estrofa
      const versosResult = await client.query(
        'SELECT id, numero, contenido FROM versos WHERE estrofa_id = $1 ORDER BY numero',
        [estrofaRow.id]
      );

      const versos = [];
      for (const versoRow of versosResult.rows) {
        // 4. Obtener palabras de cada verso con texto normalizado, rae y forma original
        const palabrasResult = await client.query(
          `SELECT p.original, d.texto AS normalizado, d.rae
           FROM palabras p
           JOIN diccionario_palabras d ON p.palabra_id = d.id
           WHERE p.verso_id = $1
           ORDER BY p.numero`,
          [versoRow.id]
        );

        const palabras = palabrasResult.rows.map(p => ({
          original: p.original,       // tal cual estaba en el poema
          normalizado: p.normalizado, // versión limpia en el diccionario
          rae: p.rae
        }));

        versos.push({
          numero: versoRow.numero,
          contenido: versoRow.contenido,
          palabras
        });
      }

      estrofas.push({
        numero: estrofaRow.numero,
        contenido: estrofaRow.contenido,
        versos
      });
    }

    // 5. Devolver objeto completo
    res.json({ titulo, estrofas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener poema' });
  } finally {
    client.release();
  }
});




module.exports = router;
