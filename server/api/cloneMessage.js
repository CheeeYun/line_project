import {defineEventHandler, readBody} from 'h3';
import {Client, validateSignature} from '@line/bot-sdk';
import dotenv from 'dotenv';
import pool from './db'; // 导入数据库连接池

dotenv.config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// 指定要模仿的用户 ID
const TARGET_USER_ID = 'U28efaeb3c903677cad4386401e65f876';
console.log('welcome cloneMessage');

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // 验证请求的签名
  const signature = event.req.headers['x-line-signature'];
  if (
    signature &&
    !validateSignature(JSON.stringify(body), config.channelSecret, signature)
  ) {
    console.error('Unauthorized request');
    return {statusCode: 401, body: 'Unauthorized'};
  }

  try {
    if (body.events) {
      await Promise.all(body.events.map(handleEvent));
    }
    return {statusCode: 200, body: 'OK'};
  } catch (error) {
    console.error('Error handling event from cloneMessage:', error);
    return {statusCode: 500, body: 'Internal Server Error'};
  }
});

async function handleEvent(event) {
  console.log('Handling event at cloneMessage:', event);

  // 检查是否来自指定的用户
  if (event.source && event.source.userId === TARGET_USER_ID) {
    console.log(`Message from target user: ${TARGET_USER_ID}`);

    if (event.message && event.message.type === 'text') {
      const reply = {type: 'text', text: event.message.text};
      console.log('$$', reply.text);

      await client.replyMessage(event.replyToken, reply);
      return;
    }

    if (event.message && event.message.type === 'image') {
      const messageId = event.message.id;

      try {
        const imageBuffer = await getImageContent(messageId);
        const mimeType = 'image/jpeg';

        // 存储图片到数据库
        const insertResult = await storeImageToDatabase(
          messageId,
          imageBuffer,
          mimeType
        );

        console.log('Image stored in database:', insertResult);

        // 构造图片 URL
        const imageUrl = `${process.env.BASE_URL}/api/getImage?id=${messageId}`;

        const reply = {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        };

        await client.replyMessage(event.replyToken, reply);
        return;
      } catch (error) {
        console.error('Error handling image message:', error);
      }
    }

    console.log('Unsupported message type:', event.message.type);
  } else {
    console.log('Message not from target user, ignoring.');
  }
}

async function getImageContent(messageId) {
  try {
    const stream = await client.getMessageContent(messageId);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Failed to fetch image content:', error);
    throw error;
  }
}

async function storeImageToDatabase(messageId, buffer, mimeType) {
  try {
    const [result] = await pool.query(
      'INSERT INTO images (message_id, data, mime_type) VALUES (?, ?, ?)',
      [messageId, buffer, mimeType]
    );
    // 查询最小的 id
    const [rows] = await pool.query(
      'SELECT id FROM images ORDER BY id ASC LIMIT 1'
    );

    if (rows.length > 0) {
      const oldestId = rows[0].id;

      // 删除最小 id 的记录
      const [deleteResult] = await pool.query(
        'DELETE FROM images WHERE id = ?',
        [oldestId]
      );

      console.log('Deleted oldest record with id:', oldestId, deleteResult);
    }
    return result;
  } catch (error) {
    console.error('Failed to store image in database:', error);
    throw error;
  }
}
