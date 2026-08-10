# 记录（entry-tracker）

个人记录工具：需求池 + 随手记 + 待办 + Kimi AI 助手，多用户账号体系，管理员只读全站数据，支持附件/图片上传、日期天气栏。

## 本地开发

1. 安装依赖：`npm install`
2. 复制 `.env.example` 为 `.env` 并填写：
   - `DATABASE_URL`：到 [Neon](https://neon.tech) 免费建一个 Postgres 项目，复制连接串
   - `AUTH_SECRET`：运行 `npx auth secret` 自动生成写入
   - `ADMIN_EMAILS`：管理员邮箱，逗号分隔
   - `BLOB_READ_WRITE_TOKEN`：Vercel Blob token（本地不需要上传可留空）
   - `MOONSHOT_API_KEY`：Kimi API Key（可留空，AI 功能将不可用）
3. 初始化数据库：`npx prisma migrate dev --name init`
4. 启动：`npm run dev`，打开 http://localhost:3000
5. 测试：`npm run test`

## 部署（Vercel + Neon）

1. 把仓库推到 GitHub
2. Vercel 导入仓库，配置环境变量（同 .env.example）
3. Vercel 项目 Storage 页创建 Blob Store，自动注入 `BLOB_READ_WRITE_TOKEN`
4. 部署后执行数据库迁移：`npx prisma migrate deploy`（本地对准生产 DATABASE_URL 跑一次，或在 Vercel build command 前加 `prisma migrate deploy &&`）

## 说明

- 附件存在 Vercel Blob，URL 公网可达但不可猜测；敏感文件请勿上传
- 管理员能力：主页「全部数据」开关只读浏览全站记录，不能改他人数据
