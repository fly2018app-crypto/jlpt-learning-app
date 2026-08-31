# QNAP 部署指南

## 系统要求

- QNAP TS-473A（已确认）
- Container Station（Container Station 2.x）
- 至少 512MB RAM 分配给容器
- Web Server（可选，用于反向代理）

## 部署步骤

### 1. 准备工作

在 QNAP 上创建目录结构：
```
/share/Web/jlpt-app/           # 应用根目录
├── index.html
├── main.js
├── manifest.json
├── components/
├── japanese-assets/
└── japanese-data/             # 数据目录（持久化挂载）
    ├── words.json
    ├── grammar.json
    ├── scenes.json
    └── topics.json
```

### 2. 上传文件

将以下文件上传到 QNAP `/share/Web/jlpt-app/`：
- `index.html`
- `main.js`
- `manifest.json`
- `components/` 目录
- `japanese-assets/` 目录
- `japanese-data/` 目录

### 3. 方法一：Container Station（推荐）

1. 打开 QNAP Container Station
2. 点击「构建」→「Dockerfile」
3. 上传 `Dockerfile` 和 `docker-compose.yml`
4. 点击「构建镜像」
5. 启动容器

### 4. 方法二：纯 Web Server（更简单）

1. 打开 QNAP Web Server（或安装 Apache/Nginx）
2. 将 `/share/Web/jlpt-app/` 设为 Web 根目录
3. 确保 MIME 类型包含 `.json` → `application/json`
4. 通过 `http://<NAS-IP>/jlpt-app/` 访问

### 5. 数据更新

每日数据由 cron job 自动生成，更新流程：
1. 在本地电脑运行 cron job 生成新数据
2. 将更新的 JSON 文件上传到 QNAP `/share/Web/jlpt-app/japanese-data/`
3. 文件会自动生效（带 `?t=Date.now()` 缓存清除）

## 网络配置

### 内网访问
- 直接通过 `http://<NAS-IP>/jlpt-app/` 访问

### 外部访问（Cloudflare Tunnel）
1. 在 QNAP 上安装 `cloudflared` 容器
2. 创建 Tunnel，指向 `http://<NAS-IP>/jlpt-app/`
3. 配置 Cloudflare DNS
4. 通过自定义域名访问

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| JSON 文件无法加载 | 检查 Web Server MIME 类型配置 |
| 页面空白 | 检查浏览器控制台，确认 Vue 和 Tailwind 加载正常 |
| 数据不更新 | 清除浏览器缓存，或检查 `?t=Date.now()` 是否正确 |
| 容器无法启动 | 检查端口是否被占用，确认 8080 端口可用 |

## 数据备份

建议定期备份 `japanese-data/` 目录：
- 每日自动快照（QNAP 内置功能）
- 定期导出到外部存储
