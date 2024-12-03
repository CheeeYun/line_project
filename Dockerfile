# 使用官方 Node.js 镜像作为基础镜像
FROM node:18

# 创建和设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm install

# 安装指定版本的 esbuild
RUN npm install esbuild@latest

# 设置环境变量以增加 esbuild 内存限制
ENV NODE_OPTIONS=--max_old_space_size=4096

# 复制项目的其余文件
COPY . .

# 暴露应用程序的端口
EXPOSE 10000

# 启动应用程序
CMD [ "npm", "run", "dev" ]