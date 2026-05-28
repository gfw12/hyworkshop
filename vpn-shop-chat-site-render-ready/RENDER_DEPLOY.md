# Render 部署检查

这个项目现在以仓库根目录为部署入口。

Render 设置建议：

- Root Directory: 留空
- Build Command: 留空
- Start Command: `npm start`
- Node Version: `20`

如果线上仍然显示旧界面：

1. 确认 GitHub 仓库根目录里的 `index.html`、`app.js`、`styles.css` 是最新文件。
2. 在 Render 点 `Manual Deploy` -> `Clear build cache & deploy`。
3. 打开浏览器无痕窗口，或清理站点缓存后再访问。
4. 如果后台改过商品但重新部署后变回默认商品，需要给 Render 配持久化存储，并设置 `STORE_FILE` 指向持久磁盘里的 `store.json`。
