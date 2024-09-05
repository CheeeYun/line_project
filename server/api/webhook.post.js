import {defineEventHandler, readBody} from 'h3';
import {Client, validateSignature} from '@line/bot-sdk';
import * as dotenv from 'dotenv';
import {createFlexMessage} from '../flexMessageTemplate';

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
      const formData = parseFormSubmission(event.text);
      console.log('formData', formData);
      const flexMessage = createFlexMessage(
        formData.items,
        formData.total,
        formData,
        userId
      );
      console.log('date', formData.items.date);

      await client.pushMessage(userId, flexMessage);
    } else {
      console.error('No userId found in form submission text.');
    }
  } else {
    console.log('Event is not a text message, ignoring...');
  }

  function parseFormSubmission(text) {
    const lines = text.split('\n');
    const items = [];
    let total = 0;
    let date = '';
    let time = '';
    let userId = '';
    let contact = '';
    let username = '';
    let diningMethod = '';
    let pay = '';

    const itemsWithUnit = ['胡椒蝦', '蒜蓉蝦', '鹽焗蝦', '胡椒風螺', '鹽烤魚'];

    for (const line of lines) {
      if (line.startsWith('USER_ID: ')) {
        userId = line.split(': ')[1];
      } else if (line.startsWith('取餐日期: ')) {
        date = line.split(': ')[1];
      } else if (line.startsWith('取餐時間: ')) {
        time = line.split(': ')[1];
      } else if (line.startsWith('聯絡電話: ')) {
        contact = line.split(': ')[1];
      } else if (line.startsWith('訂購人（line稱呼): ')) {
        username = line.split(': ')[1];
      } else if (line.startsWith('用餐方式: ')) {
        diningMethod = line.split(': ')[1];
      } else if (line.startsWith('支付方式: ')) {
        pay = line.split(': ')[1];
      } else if (line.includes(':')) {
        const [name, qtyStr] = line.split(': ');
        let qty = 0;
        if (itemsWithUnit.includes(name)) {
          qty = parseInt(qtyStr.replace(/[^0-9]/g, '')); // 去掉數量後面的字
        } else {
          qty = parseInt(qtyStr); // 直接解析数量
        }
        if (!isNaN(qty)) {
          items.push({name, qty: `${qty}`});
          total += qty; // 累加总数量
        }
      }
    }

    return {
      items,
      total,
      date,
      time,
      userId,
      contact,
      username,
      diningMethod,
      pay,
    };
  }
  // 提取用戶ID
  function extractUserIdFromFormSubmission(text) {
    const userIdMatch = text.match(/USER_ID: (\w+)/);
    return userIdMatch ? userIdMatch[1] : null;
  }
}
