import pool from './db.js';

export default defineEventHandler(async (event) => {
  const query = 'SELECT * FROM images LIMIT 10';

  try {
    const [rows] = await pool.query(query);
    return {status: 'success', data: rows};
  } catch (error) {
    console.error('Database query failed:', error);
    return {status: 'error', message: error.message};
  }
});
