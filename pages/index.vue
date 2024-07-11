<template>
  <div>
    <h1>LINE Bot Integration</h1>
    <button @click="sendMessage">Send Test Message</button>
  </div>
</template>

<script setup>
const message = ref('Hello from Nuxt 3');

const sendMessage = async () => {
  try {
    const response = await fetch('/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({message: message.value}),
    });
    const result = await response.json();
    console.log(result);
  } catch (error) {
    console.error('Error sending message:', error);
  }
};
</script>
