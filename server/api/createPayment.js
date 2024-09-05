import axios from 'axios';
import crypto from 'crypto';

export default defineEventHandler(async (event) => {
  const CHANNEL_ID = process.env.LINE_TEST_CHANNELID;
  const CHANNEL_SECRET = process.env.LINE_TEST_CHANNELSECRETKEY;
  const BASE_URL = 'https://sandbox-api-pay.line.me';
  const URI = '/v3/payments/request';

  const body = await readBody(event);
  const {amount, orderId, userId} = body;
  console.log(userId);

  const amount2 = Math.floor(amount);
  const nonce = crypto.randomBytes(16).toString('hex');

  const paymentBody = {
    amount: amount2,
    currency: 'TWD',
    orderId: orderId,
    packages: [
      {
        id: orderId,
        amount: amount2,
        products: [
          {
            id: `porduct_${orderId}`,
            name: '支付中，請等待跳轉「支付結果」頁面。',
            quantity: 1,
            price: amount2,
          },
        ],
      },
    ],
    redirectUrls: {
      confirmUrl: `https://line-project-3.onrender.com/success?amount=${amount2}&userId=${userId}`,
      cancelUrl: 'https://line-project-3.onrender.com/',
    },
  };

  const signatureString = `${CHANNEL_SECRET}${URI}${JSON.stringify(
    paymentBody
  )}${nonce}`;
  const signature = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(signatureString)
    .digest('base64');

  try {
    const response = await axios.post(`${BASE_URL}${URI}`, paymentBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': `${process.env.LINE_TEST_CHANNELID}`,
        'X-LINE-Authorization-Nonce': nonce,
        'X-LINE-Authorization': signature,
      },
    });

    if (response.data.returnCode === '0000') {
      console.log(response.data.info);
      // return {paymentUrl: response.data.info.paymentUrl.web};
      return {result: response.data.info};
    } else {
      return {error: response.data.returnMessage};
    }
  } catch (error) {
    return {error: error.message};
  }
});
