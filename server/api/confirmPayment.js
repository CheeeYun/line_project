import axios from 'axios';
import crypto from 'crypto';

export default defineEventHandler(async (event) => {
  const CHANNEL_ID = process.env.LINE_TEST_CHANNELID;
  const CHANNEL_SECRET = process.env.LINE_TEST_CHANNELSECRETKEY;
  const BASE_URL = 'https://sandbox-api-pay.line.me';

  // 从 URL 查询参数中获取 transactionId 和 orderId
  const {amount, transactionId, orderId, userId} = getQuery(event);
  console.log('userId->', userId);

  // 假设你已经存储了订单金额和货币类型，或者可以从数据库获取
  const checkAmount = amount; // 原订单金额
  const currency = 'TWD'; // 原订单货币

  const URI = `/v3/payments/${transactionId}/confirm`;
  const nonce = crypto.randomBytes(16).toString('hex');

  const confirmBody = {
    amount: checkAmount,
    currency: currency,
  };

  // 生成签名
  const signatureString = `${CHANNEL_SECRET}${URI}${JSON.stringify(
    confirmBody
  )}${nonce}`;
  const signature = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(signatureString)
    .digest('base64');

  try {
    // 发送支付确认请求
    const response = await axios.post(`${BASE_URL}${URI}`, confirmBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': CHANNEL_ID,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
      },
    });

    if (response.data.returnCode === '0000') {
      console.log('Payment confirmed:', response.data);
      await sendPaymentConfirmation(userId, amount, orderId); //發送確認支付消息

      return {success: true, data: response.data};
    } else {
      console.error(
        'Payment confirmation failed:',
        response.data.returnMessage
      );
      return {success: false, error: response.data.returnMessage};
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    return {success: false, error: error.message};
  }
});

// 发送付款确认消息
const sendPaymentConfirmation = async (userId, amount, orderId) => {
  const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message/push';

  const messageBody = {
    to: userId, // 用户的 Line User ID
    messages: [
      {
        type: 'text',
        text: `我們已收到您的款項！\n訂單編號: ${orderId}\n支付金額: ${amount} 元`,
      },
    ],
  };

  try {
    await axios.post(LINE_MESSAGING_API, messageBody, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    });
    console.log('付款確認消息已發送給用戶');
  } catch (error) {
    console.error('發送付款確認消息失敗:', error);
  }
};
