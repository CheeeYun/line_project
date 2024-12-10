# 使用多階段構建
# 構建階段
FROM node:18-alpine AS builder

# 設置工作目錄
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package.json 和 pnpm-lock.yaml (如果有的話)
COPY package.json pnpm-lock.yaml* ./

# 安裝所有依賴（包括開發依賴）
RUN pnpm install --frozen-lockfile

# 複製應用程式代碼
COPY . .

# 構建應用
RUN pnpm run build

# 運行階段
FROM node:18-alpine

WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 從構建階段複製必要文件
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* ./

# 只安裝生產環境依賴
RUN pnpm install --prod --frozen-lockfile

# 設置環境變量
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

# 暴露端口
EXPOSE 10000

# 啟動命令
CMD ["node", ".output/server/index.mjs"]