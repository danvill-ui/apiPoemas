// routes/palabra.js
const express = require('express');
const router = express.Router();
const pool = require('../db/connection'); // tu Pool de pg
const spanishVerbs = require('spanish-verbs');
const dictionary = spanishVerbs.dictionary;

// PATCH para actualizar con definición RAE
router.patch("/:palabra", async (req, res) => {
  const { palabra } = req.params;

  try {
    const checkQuery = `
      SELECT rae
      FROM diccionario_palabras
      WHERE texto = $1
      LIMIT 1;
    `;
    const checkResult = await pool.query(checkQuery, [palabra]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: "No se encontró la palabra en el diccionario" });
    }

    if (checkResult.rows[0].rae) {
      return res.status(400).json({ error: "El campo RAE ya está relleno" });
    }

    const response = await fetch(`https://rae-api.com/api/words/${encodeURIComponent(palabra)}`);
    const data = await response.json();

    if (data.error) {
      console.error(`RAE API error: ${data.error}`);
      return res.status(400).json({ error: `RAE API error: ${data.error}` });
    }

    const updateQuery = `
      UPDATE diccionario_palabras
      SET rae = $1
      WHERE texto = $2
      RETURNING texto, rae;
    `;
    const updateResult = await pool.query(updateQuery, [data, palabra]); // 👈 si rae es JSONB

    res.json({
      palabra: {
        texto: updateResult.rows[0].texto,
        rae: updateResult.rows[0].rae
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar la palabra" });
  }
});

// PATCH para limpiar definición RAE
router.patch("/:palabra/clear", async (req, res) => {
  const { palabra } = req.params;

  try {
    const checkQuery = `
      SELECT texto, rae
      FROM diccionario_palabras
      WHERE texto = $1
      LIMIT 1;
    `;
    const checkResult = await pool.query(checkQuery, [palabra]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: "No se encontró la palabra en el diccionario" });
    }

    const updateQuery = `
      UPDATE diccionario_palabras
      SET rae = NULL
      WHERE texto = $1
      RETURNING texto, rae;
    `;
    const updateResult = await pool.query(updateQuery, [palabra]);

    res.json({
      palabra: {
        texto: updateResult.rows[0].texto,
        rae: updateResult.rows[0].rae // será null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al limpiar la definición RAE" });
  }
});

//sinonimos
router.get("/:palabra/sinonimos", async (req, res) => {
  const { palabra } = req.params;

  try {
    const query = `
      SELECT jsonb_array_elements_text(sense->'synonyms') AS sinonimo
FROM diccionario_palabras,
     jsonb_array_elements(rae->'data'->'meanings') AS meaning,
     jsonb_array_elements(meaning->'senses') AS sense
WHERE texto = $1
  AND jsonb_typeof(sense->'synonyms') = 'array';
    `;

    const result = await pool.query(query, [palabra.toUpperCase()]); // 👈 normalizamos la entrada

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No se encontró la palabra en el diccionario" });
    }

    const sinonimos = result.rows.map(r => r.sinonimo);

    res.json({
      palabra,
      sinonimos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los sinónimos" });
  }
});


//Antonimos
router.get("/:palabra/antonimos", async (req, res) => {
  const { palabra } = req.params;

  try {
    const query = `
SELECT DISTINCT
  jsonb_array_elements_text(s->'antonyms') AS antonimo
FROM diccionario_palabras d
CROSS JOIN LATERAL jsonb_array_elements(d.rae->'data'->'meanings') AS m
CROSS JOIN LATERAL jsonb_array_elements(m->'senses') AS s
WHERE d.texto = $1
  AND jsonb_typeof(s->'antonyms') = 'array';


    `;

    // 👇 normalizamos la entrada para asegurar coincidencia
    const result = await pool.query(query, [palabra.toUpperCase()]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No se encontró la palabra en el diccionario" });
    }

    const antonimos = result.rows.map(r => r.antonimo);

    res.json({
      palabra,
      antonimos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los antónimos" });
  }
});



router.get("/:palabra/acepciones", async (req, res) => {
  const { palabra } = req.params;

  try {
    const query = `
      SELECT s->>'meaning_number' AS numero,
             s->>'description'    AS descripcion,
             s->>'category'       AS categoria,
             s->>'usage'          AS uso,
             s->>'raw'            AS texto_crudo
      FROM diccionario_palabras d
      CROSS JOIN LATERAL jsonb_array_elements(d.rae->'data'->'meanings') AS m
      CROSS JOIN LATERAL jsonb_array_elements(m->'senses') AS s
      WHERE d.texto = $1;
    `;

    const result = await pool.query(query, [palabra.toUpperCase()]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No se encontró la palabra en el diccionario" });
    }

    res.json({
      palabra,
      acepciones: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las acepciones" });
  }
});

//get Origen
router.get("/:palabra/origen", async (req, res) => {
  const { palabra } = req.params;

  try {
    const query = `
      SELECT m->'origin'->>'raw'   AS origen_raw,
             m->'origin'->>'text'  AS origen_texto,
             m->'origin'->>'type'  AS tipo,
             m->'origin'->>'voice' AS voz
      FROM diccionario_palabras d
      CROSS JOIN LATERAL jsonb_array_elements(d.rae->'data'->'meanings') AS m
      WHERE d.texto = $1;
    `;

    const result = await pool.query(query, [palabra.toUpperCase()]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No se encontró la palabra en el diccionario" });
    }

    res.json({
      palabra,
      origen: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el origen de la palabra" });
  }
});

function encontrarConjugacion(conjugations, palabra) {
  for (const modo in conjugations) {
    const tiempos = conjugations[modo];

    // Caso especial: formas no personales (infinitivo, gerundio, participio)
    if (modo === "non_personal") {
      for (const forma in tiempos) {
        if (tiempos[forma].toLowerCase().includes(palabra.toLowerCase())) {
          return { modo, tiempo: forma, persona: null };
        }
      }
    } else {
      // Recorremos tiempos y personas
      for (const tiempo in tiempos) {
        const personas = tiempos[tiempo];
        for (const persona in personas) {
          if (personas[persona].toLowerCase().includes(palabra.toLowerCase())) {
            return { modo, tiempo, persona };
          }
        }
      }
    }
  }
  return null;
}

// Endpoint
router.get("/:palabra/persona-verbal", async (req, res) => {
  const { palabra } = req.params;

  try {
    const result = await pool.query(
      `SELECT (rae->'data'->'meanings'->0->'conjugations') AS conjugations
       FROM diccionario_palabras
       WHERE texto = $1`,
      [palabra.toUpperCase()]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No se encontró la palabra en el diccionario" });
    }

    const conjugations = result.rows[0].conjugations;
    const analisis = encontrarConjugacion(conjugations, palabra);

    if (!analisis) {
      return res.status(404).json({ error: "No se pudo identificar la forma verbal" });
    }

    res.json({
      palabra,
      ...analisis
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al analizar la forma verbal" });
  }
});



module.exports = router;
