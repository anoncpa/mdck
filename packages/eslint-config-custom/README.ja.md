# @mdck/eslint-config-custom

mdckパッケージ用の共有ESLint設定。

## 使用方法

このパッケージは、全てのmdckパッケージで一貫したESLint設定を提供します。

### インストール

```bash
npm install --save-dev @mdck/eslint-config-custom
```

### 設定

`.eslintrc.js`で：

```javascript
module.exports = {
  extends: ['@mdck/eslint-config-custom'],
  // パッケージ固有のオーバーライドをここに追加
};
```

## ルール

設定には以下が含まれます：

- **ベース**: ESLint推奨ルール
- **TypeScript**: TypeScript固有のリンティングルール
- **コードスタイル**: 一貫したフォーマットとスタイルルール
- **ベストプラクティス**: セキュリティとパフォーマンスのベストプラクティス

## ライセンス

MIT License - 詳細は[LICENSE](../../LICENSE)をご覧ください。