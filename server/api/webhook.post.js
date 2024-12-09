import {defineEventHandler, readRawBody} from 'h3';
import {Client, validateSignature} from '@line/bot-sdk';
import * as dotenv from 'dotenv';
import {createFlexMessage} from '../flexMessageTemplate';
import axios from 'axios';

dotenv.config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// 全局開關狀態
let broadcastEnabled = false;

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event);
  const parsedRawBody = JSON.parse(rawBody); //rawBody轉JSON

  const signature = event.req.headers['x-line-signature'];
  if (signature) {
    if (!validateSignature(rawBody, config.channelSecret, signature)) {
      console.error('Unauthorized request');
      return {statusCode: 401, body: 'Unauthorized'};
    }
  }

  // 處理事件
  try {
    if (parsedRawBody?.events) {
      const replies = await Promise.all(parsedRawBody.events.map(handleEvent));
      return replies[0]; // 返回第一個事件的結果
    } else {
      console.log('No valid events found in rawBody.');
      return {statusCode: 400, body: 'No events found'};
    }
  } catch (error) {
    console.error('Error processing event:', error);
    return {statusCode: 500, body: 'Internal Server Error'};
  }
});

async function handleEvent(event) {
  console.log('Handling event at webhook:', event);

  //存用戶Id
  if (event.source && event.source.userId) {
    const userId = event.source.userId;

    // 获取 DisplayName
    const displayName = await getDisplayName(userId);

    // 保存用户信息
    try {
      const response = await axios.post(
        `${process.env.BASE_URL}/api/insertMembers`,
        {
          userId: userId,
          displayName: displayName,
        }
      );
      console.log('SaveUser API response:', response.data);
    } catch (error) {
      console.error('Error calling SaveUser API:', error.message);
    }
  }

  // 处理来自LINE的普通消息
  if (event.replyToken) {
    if (event.type === 'message') {
      if (event.message.type === 'text' && !broadcastEnabled) {
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
            'https://docs.google.com/forms/d/e/1FAIpQLSdM74yhdahZfMwCi6JRfdc06cEQPJR0fz5m8Xg2FS7dJFaFHA/viewform?usp=pp_url&entry.1987383699=PLACEHOLDER_USER_ID';
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

        // 控制廣播開關
        if (userInput === 'broadcast-open') {
          broadcastEnabled = true;
          const reply = {
            type: 'text',
            text: 'Broadcast enabled for the next message.',
          };
          await client.replyMessage(event.replyToken, reply);
          return;
        }
      }
      // 调用 cloneMessage API
      if (broadcastEnabled) {
        console.log('Broadcast enabled, preparing to call cloneMessage API...');
        console.log('廣播資料：', event);

        try {
          // 从数据库中获取所有用户的 userId
          const userIdsResponse = await axios.get(
            `${process.env.BASE_URL}/api/getAllUserIds`
          );
          const userIds = userIdsResponse.data;
          console.log('userId列表>>>', userIds);

          // 发送事件到 cloneMessage API
          const response = await axios.post(
            `${process.env.BASE_URL}/api/cloneMessage`,
            {
              events: [event], // 将事件包装为数组，符合 `cloneMessage` API 的格式
            }
          );

          console.log('cloneMessage API response:', response.data);

          // 将克隆消息的内容发送回用户
          const clonedMessage = response.data;
          // 检查消息类型
          if (!clonedMessage || !clonedMessage.type) {
            throw new Error('Invalid message returned from cloneMessage API');
          }

          // 给每个用户发送消息
          await Promise.all(
            userIds.map(async (userId) => {
              try {
                console.log('發送給每個人');

                if (clonedMessage.type === 'text') {
                  // 发送文本消息
                  await client.pushMessage(userId, clonedMessage);
                } else if (clonedMessage.type === 'image') {
                  // 发送图片消息
                  await client.pushMessage(userId, {
                    type: 'image',
                    originalContentUrl: clonedMessage.originalContentUrl,
                    previewImageUrl: clonedMessage.previewImageUrl,
                  });
                } else {
                  console.warn(
                    `Unsupported message type: ${clonedMessage.type}`
                  );
                }
              } catch (sendError) {
                console.error(
                  `Error sending message to userId ${userId}:`,
                  sendError.message
                );
              }
            })
          );

          // 回复原始触发者
          await client.replyMessage(event.replyToken, clonedMessage);

          console.log('Sent cloned message:', clonedMessage);
        } catch (error) {
          console.error('Error calling cloneMessage API:', error.message);

          const errorMessage =
            error.response && error.response.data
              ? `Error broadcasting message: ${error.response.data}`
              : 'Error broadcasting message.';

          const reply = {type: 'text', text: errorMessage};
          await client.replyMessage(event.replyToken, reply);
        } finally {
          // 在任何情况下都关闭广播模式
          broadcastEnabled = false;
          console.log('Broadcast mode disabled.');
        }

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

//用userId獲取名字
async function getDisplayName(userId) {
  try {
    const profile = await client.getProfile(userId);
    console.log('User Profile:', profile);
    return profile.displayName; // 返回显示名称
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null; // 如果获取失败，返回 null
  }
}
