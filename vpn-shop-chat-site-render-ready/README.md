# 云桥优选商品站

这是一个不需要安装依赖的商品展示 + 后台编辑 + 顾客聊天网站原型。

## 怎么打开

双击打开：

- `index.html`：顾客前台
- `admin.html`：后台管理

后台演示密码：

```text
admin123
```

## 已有功能

- 商品上架、编辑、删除
- 商品分类筛选和搜索
- 顾客右下角聊天咨询
- 后台查看聊天记录
- 数据临时保存在浏览器 `localStorage`

## 关于“挂 VPN 才能进去”

当前是本地原型，真正上线时建议这样做：

1. 网站部署到服务器。
2. 后台 `/admin` 加正式登录。
3. 服务器配置 VPN 或 IP 白名单，只允许你的 VPN 出口 IP 访问后台。
4. 聊天功能接入真实数据库和 WebSocket。

如果要整站都必须挂 VPN 才能访问，可以在 Nginx / Cloudflare / Tailscale / ZeroTier 上做访问控制。

## 本地部署测试

如果只是在本机测试部署版：

```powershell
$env:SITE_PASSWORD="123456"
$env:PORT="8080"
node .\server.js
```

浏览器打开：

```text
http://localhost:8080
```

输入任意用户名，密码输入 `123456`。

服务器部署文件在：

```text
deploy/
```

## 后续升级建议

- 前端：Next.js / Vue
- 后端：Node.js + Express / NestJS
- 数据库：PostgreSQL / MySQL
- 图片：对象存储 OSS / S3
- 聊天：WebSocket 或第三方客服系统
- 权限：管理员账号、商品审核、客服账号
