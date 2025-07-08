# @mdck/tsconfig

mdckパッケージ用の共有TypeScript設定。

## 使用方法

このパッケージは、mdckモノレポ内の他のパッケージで拡張できるベースTypeScript設定を提供します。

### インストール

```bash
npm install --save-dev @mdck/tsconfig
```

### 設定

`tsconfig.json`で：

```json
{
  "extends": "@mdck/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## ベース設定

ベース設定には以下が含まれます：

- **ターゲット**: ES2022
- **モジュール**: Node解決を使用したESNext
- **厳密モード**: 全ての厳密チェックを有効化
- **ソースマップ**: デバッグのために有効化
- **宣言**: 型定義のために有効化
- **インクリメンタル**: より高速なビルドのために有効化

## ライセンス

MIT License - 詳細は[LICENSE](../../LICENSE)をご覧ください。