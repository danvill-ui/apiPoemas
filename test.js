const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'alAlimon',
  password: 'Acuario2021',
  port: 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error de conexión:', err);
  } else {
    console.log('Conexión exitosa:', res.rows);
  }
  pool.end();
});
