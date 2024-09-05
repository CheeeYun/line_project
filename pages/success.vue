<template>
  <div>
    <h1>支付結果：</h1>
    <div v-if="successPay === 1">
      <h1 style="color: red">支付成功！</h1>
      <h1>我們已收到您的款項。</h1>
    </div>
    <div v-if="successPay === 0">
      <h1 style="color: red">支付失敗！</h1>
    </div>
    <h2>訂單編號:{{ viewOrderId }}</h2>
    <h2>金額:{{ viewAmount }}TWD</h2>
  </div>
</template>

<script setup>
const paymentStatus = ref('');
const errorMessage = ref('');
const viewOrderId = ref('');
const viewAmount = ref('');
const successPay = ref('');

const confirmPayment = async () => {
  try {
    // 从 URL 中获取 transactionId 和 orderId
    const query = new URLSearchParams(window.location.search);
    const transactionId = query.get('transactionId');
    const orderId = query.get('orderId');
    const amount = query.get('amount');
    const userId = query.get('userId');

    viewAmount.value = amount;
    viewOrderId.value = orderId;

    // 调用后端的确认支付 API
    const response = await fetch(
      `/api/confirmPayment?transactionId=${transactionId}&orderId=${orderId}&amount=${amount}&userId=${userId}`
    );
    const result = await response.json();

    if (result.success) {
      paymentStatus.value = 'Payment confirmed!';
      successPay.value = 1;
    } else {
      successPay.value = 0;
      errorMessage.value = `Payment confirmation failed: ${result.error}`;
    }
  } catch (error) {
    errorMessage.value = `Failed to confirm payment: ${error.message}`;
  }
};

confirmPayment();
</script>

<style scoped></style>
