// db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',        // tu usuario de PostgreSQL
  host: '127.0.0.1',       // servidor (localhost si es local)
  database: 'alAlimon',      // nombre de tu base de datos
  password: 'Acuario2021', // contraseña del usuario
  port: 5432,              // puerto por defecto
});

module.exports = pool