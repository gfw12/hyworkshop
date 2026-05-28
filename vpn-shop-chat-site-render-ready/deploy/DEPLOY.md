# 部署说明

## 方案 A：Linux 服务器 + Nginx + VPN/IP 白名单

服务器需要：

- Linux 服务器一台
- Node.js
- Nginx
- 你的 VPN 出口 IP 或 VPN 网段

上传项目到服务器：

```bash
sudo mkdir -p /opt/private-shop
sudo cp -r vpn-shop-chat-site/* /opt/private-shop/
```

启动网站：

```bash
cd /opt/private-shop
SITE_PASSWORD='你的访问密码' PORT=8080 node server.js
```

配置 systemd：

```bash
sudo cp /opt/private-shop/deploy/systemd-private-shop.service /etc/systemd/system/private-shop.service
sudo systemctl daemon-reload
sudo systemctl enable --now private-shop
sudo systemctl status private-shop
```

配置 Nginx：

```bash
sudo cp /opt/private-shop/deploy/nginx-vpn-ip-whitelist.conf /etc/nginx/sites-available/private-shop.conf
sudo ln -s /etc/nginx/sites-available/private-shop.conf /etc/nginx/sites-enabled/private-shop.conf
sudo nginx -t
sudo systemctl reload nginx
```

把 `nginx-vpn-ip-whitelist.conf` 里的：

```nginx
server_name your-domain.com;
```

改成你的域名或服务器 IP。

如果要限制必须挂 VPN 才能访问，把 VPN 出口 IP 写成：

```nginx
allow 你的VPN出口IP;
deny all;
```

## 方案 B：Tailscale / ZeroTier 内网访问

这种更简单，也更安全：

1. 服务器安装 Tailscale 或 ZeroTier。
2. 你的电脑也加入同一个私有网络。
3. 网站只监听内网 IP 或通过防火墙禁止公网访问。
4. 只有加入 VPN 网络的设备能访问。

## 当前原型限制

当前版本是静态原型：

- 商品数据保存在浏览器 localStorage。
- 聊天记录也保存在浏览器 localStorage。
- 如果要多人客服、真实顾客聊天、订单和数据库，需要升级成后端数据库版本。
