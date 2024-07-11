import {defineEventHandler, readBody} from 'h3';
import {Client, validateSignature} from '@line/bot-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  console.log('Received event:', body);

  // Verify the request only if it has the signature header
  const signature = event.req.headers['x-line-signature'];
  if (signature) {
    if (
      !validateSignature(JSON.stringify(body), config.channelSecret, signature)
    ) {
      console.error('Unauthorized request');
      return {statusCode: 401, body: 'Unauthorized'};
    }
  }

  // Process the event
  try {
    if (body.events) {
      await Promise.all(body.events.map(handleEvent));
    } else {
      await handleEvent(body); // For local testing
    }
    return {statusCode: 200, body: 'OK'};
  } catch (err) {
    console.error('Error handling event:', err);
    return {statusCode: 500, body: 'Internal Server Error'};
  }
});

async function handleEvent(event) {
  console.log('Handling event:', event);

  // 处理来自LINE的普通消息
  if (event.replyToken) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userInput = event.message.text;
      const keywords = {
        營業: '營業時間:五、六、日 18:00-賣完為止。更詳細資訊請詳見”FB粉絲專頁“',
        有開: '營業時間:五、六、日 18:00-賣完為止。更詳細資訊請詳見”FB粉絲專頁”',
      };

      for (const keyword of Object.keys(keywords)) {
        if (userInput.includes(keyword)) {
          const reply = {type: 'text', text: keywords[keyword]};
          await client.replyMessage(event.replyToken, reply);
          return;
        }
      }

      if (userInput.includes('訂餐')) {
        const userId = event.source.userId;
        const formLinkTemplate =
          'https://docs.google.com/forms/d/e/1FAIpQLSdM74yhdahZfMwCi6JRfdc06cEQPJR0fz5m8Xg2FS7dJFaFHA/viewform?usp=pp_url&entry.734283474=PLACEHOLDER_USER_ID';
        const personalizedLink = formLinkTemplate.replace(
          'PLACEHOLDER_USER_ID',
          userId
        );

        const message = {
          type: 'text',
          text: `請點擊以下連結訂餐：\n${personalizedLink}`,
        };

        await client.replyMessage(event.replyToken, message);
        return;
      }
    } else {
      console.log('Unsupported message type or event type:', event);
    }
  }

  // 处理来自Google表单的消息
  if (event.text && event.text.startsWith('New form submission:')) {
    const userId = extractUserIdFromFormSubmission(event.text);
    if (userId) {
      const message = {
        type: 'text',
        text: `我們已收到您的訂單：\n${event.text}`,
      };

      await client.pushMessage(userId, message);
    } else {
      console.error('No userId found in form submission text.');
    }
  } else {
    console.log('Event is not a text message, ignoring...');
  }
}

function extractUserIdFromFormSubmission(text) {
  const userIdMatch = text.match(/USER_ID: (\w+)/);
  return userIdMatch ? userIdMatch[1] : null;
}
