import {defineEventHandler} from 'h3';
import pool from './db'; // 导入数据库连接池

export default defineEventHandler(async () => {
  try {
    const [rows] = await pool.query('SELECT userId FROM members');
    const userIds = rows.map((row) => row.userId);
    return userIds; // 返回 userId 数组
  } catch (error) {
    console.error('Error fetching user IDs from database:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
});
