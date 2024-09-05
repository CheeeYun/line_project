<template>
  <div>請稍後，等待付款頁面跳轉。</div>
  <div style="color: red">
    （若頁面未跳轉代表支付連結已過期，請重新下單付款，或選擇現場付款。）
  </div>
</template>

<script setup>
const createPayment = async (amount, orderId, userId) => {
  const errorMessage = ref('');
  const paymentUrl = ref('');
  try {
    // 定义请求体
    const requestBody = {
      amount: amount, // 金额
      orderId: orderId, // 订单ID
      userId: userId,
    };
    console.log(userId);

    // 发起 POST 请求调用 API
    const response = await fetch('/api/createPayment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const reply = await response.json();
    console.log(reply);

    if (reply.result.paymentUrl) {
      console.log(reply.result.paymentUrl.web);
      paymentUrl.value = reply.result.paymentUrl.web; // 成功时设置 paymentUrl
      window.location.href = paymentUrl.value; // 重定向到支付页面
    } else {
      errorMessage.value = result.error; // 处理错误信息
      paymentUrl.value = ''; // 清空 paymentUrl
    }
  } catch (error) {
    errorMessage.value = 'Failed to create payment: ' + error.message;
    paymentUrl.value = ''; // 清空 paymentUrl
  }
};

onMounted(() => {
  // 解析 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const amount = urlParams.get('amount'); // 从 URL 中获取金额
  const orderId = urlParams.get('orderId'); // 从 URL 中获取订单 ID
  const userId = urlParams.get('userId');

  if (amount && orderId) {
    console.log('Order ID:', orderId);
    console.log('Amount:', amount);

    // 调用 createPayment 发起付款请求
    createPayment(amount, orderId, userId);
  } else {
    console.error('Invalid parameters: amount or orderId is missing.');
  }
});
</script>

<style scoped></style>
