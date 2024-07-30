const createFlexMessage = (items, total, formData) => {
  const itemContents = items.map((item) => ({
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      {
        type: 'text',
        text: item.name,
        color: '#aaaaaa',
        size: 'sm',
        flex: 1,
      },
      {
        type: 'text',
        text: `${item.qty} 份`,
        wrap: true,
        color: '#666666',
        size: 'sm',
        flex: 1,
      },
      {
        type: 'text',
        text: `${item.qty * 300} 元`, // 每样商品都是300元
        wrap: true,
        color: '#666666',
        size: 'sm',
        flex: 1,
        align: 'end',
      },
    ],
  }));

  // 获取当前日期
  const currentDate = new Date().toISOString().split('T')[0];
  // 计算折扣
  const discountRate =
    new Date(formData.date) > new Date(currentDate) ? 0.9 : 1;
  const originalTotalPrice = total * 300;
  const discountedTotalPrice = originalTotalPrice * discountRate;
  const discountAmount = originalTotalPrice - discountedTotalPrice;

  return {
    type: 'flex',
    altText: '收到您的訂餐囉！',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '已確認您的餐點',
            weight: 'bold',
            size: 'xl',
            color: '#ED6FC0',
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '項目',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: '數量',
                    wrap: true,
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: '價格',
                    wrap: true,
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 1,
                    align: 'end',
                  },
                ],
              },
              {
                type: 'separator',
                margin: 'md',
              },
              ...itemContents,
              {
                type: 'separator',
                margin: 'md',
              },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '小計',
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: `${total} 份`,
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: `${originalTotalPrice} 元`, // 原总价格
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 1,
                align: 'end',
              },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '提前訂餐折扣 (9折)',
                color: '#FFB829',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: `${discountAmount.toFixed(2)} 元`,
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 1,
                align: 'end',
              },
            ],
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '總價',
                color: '#000000',
                size: 'sm',
                flex: 1,
              },
              {
                type: 'text',
                text: `${discountedTotalPrice.toFixed(2)} 元`, // 打折后的总价格
                wrap: true,
                color: '#000000',
                size: 'sm',
                flex: 1,
                align: 'end',
              },
            ],
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical', // 增加一个空白行
            margin: 'md',
            contents: [],
          },
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: `取餐日期: ${formData.date}`,
                color: '#ED6FC0',
                size: 'sm',
                flex: 1,
              },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: `取餐時間: ${formData.time}`,
                color: '#ED6FC0',
                size: 'sm',
                flex: 1,
              },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: `用餐方式: ${formData.diningMethod}`,
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: `訂購人: ${formData.username}`,
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
            ],
          },
          {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: `聯絡電話: ${formData.contact}`,
                color: '#aaaaaa',
                size: 'sm',
                flex: 1,
              },
            ],
          },
        ],
      },
    },
  };
};

export {createFlexMessage};
