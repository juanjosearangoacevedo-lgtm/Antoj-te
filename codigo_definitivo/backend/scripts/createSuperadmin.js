require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

// Uso: node scripts/createSuperadmin.js "Nombre Apellido" correo@ejemplo.com claveSegura123
(async () => {
  const [, , nombre, email, password] = process.argv;
  if (!nombre || !email || !password) {
    console.error('Uso: node scripts/createSuperadmin.js "<nombre>" <email> <password>');
    process.exitCode = 1;
    return;
  }

  try {
    const [roles] = await pool.query("SELECT id FROM roles WHERE nombre_rol = 'superadmin'");
    if (!roles[0]) {
      console.error('No existe el rol superadmin. Corre primero: npm run seed:roles');
      process.exitCode = 1;
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, restaurante_id, role_id) VALUES (?, ?, ?, NULL, ?)',
      [nombre, email, hash, roles[0].id]
    );
    console.log(`Superadmin creado: ${email}`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.error('Ya existe un usuario con ese email');
    } else {
      console.error('Error creando superadmin:', err.message);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
