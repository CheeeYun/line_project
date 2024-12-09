import {defineEventHandler, readBody} from 'h3';
import pool from './db'; // 导入数据库连接池

export default defineEventHandler(async (event) => {
  try {
    // 读取请求体
    const {userId, displayName} = await readBody(event);
    console.log('儲存Id:', displayName + ':' + userId);

    // 验证输入
    if (!userId) {
      return {
        statusCode: 400,
        body: 'Missing required parameter: userId',
      };
    }

    // 检查是否已存在 userId
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM members WHERE userId = ?',
      [userId]
    );
    if (rows[0].count > 0) {
      console.log(`User with userId ${userId} already exists.`);
      return {
        statusCode: 200,
        body: 'User already exists. No action taken.',
      };
    }

    // 写入数据库
    const query = `
      INSERT INTO members (userId, name)
      VALUES (?, ?)
    `;

    try {
      await pool.query(query, [userId, displayName || null]);
      console.log(`User with userId ${userId} saved.`);
      return {
        statusCode: 200,
        body: 'User information successfully saved.',
      };
    } catch (dbError) {
      console.error('Database error:', dbError);
      return {
        statusCode: 500,
        body: 'Database error occurred.',
      };
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
});
