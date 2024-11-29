import pool from './db';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const {id} = query;

  if (!id) {
    return {statusCode: 400, body: 'Image ID is required'};
  }

  try {
    const [rows] = await pool.query(
      'SELECT data, mime_type FROM images WHERE message_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return {statusCode: 404, body: 'Image not found'};
    }

    const {data, mime_type} = rows[0];

    // 返回图片数据
    return send(event, Buffer.from(data), mime_type);
  } catch (error) {
    console.error('Error fetching image:', error);
    return {statusCode: 500, body: 'Internal Server Error'};
  }
});
