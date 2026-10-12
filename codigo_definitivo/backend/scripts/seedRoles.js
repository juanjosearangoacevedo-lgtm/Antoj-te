require('dotenv').config();
const pool = require('../src/config/db');

const ROLES = ['superadmin', 'admin_restaurante', 'cocinero', 'mesero'];

(async () => {
  try {
    for (const nombre of ROLES) {
      await pool.query('INSERT IGNORE INTO roles (nombre_rol) VALUES (?)', [nombre]);
    }
    console.log('Roles base insertados:', ROLES.join(', '));
  } catch (err) {
    console.error('Error insertando roles:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
