# テスト記録

## 2026-09-28 / v1.3

- `npm test`: 17件すべて成功
- `npm run build`: 成功（Viteのチャンクサイズ警告のみ）
- `npx cap sync android`: 成功
- `gradlew.bat clean assembleDebug`: 成功
- ブラウザ操作確認: 時刻・休憩・飲食代・詳細の入力、自動計算、自動保存、再読み込み後の保持、月間集計、PDFプレビューを確認
- 画面幅確認: 360×800pxおよび430×900pxで横方向の画面はみ出しがなく、下部ナビゲーションが画面下端に固定されることを確認
- 祝日確認: 2026年9月21日、22日、23日の祝日名および休日表示を確認
- APK署名: v2署名を検証済み
- パッケージ: `jp.local.kintai`
- versionCode: 4
- versionName: 1.3
- minSdk: 24
- targetSdk: 36
- INTERNET権限なし（オフライン利用を維持）
- APK: `artifacts/勤怠管理-v1.3-FigmaUI-debug.apk`
- APK SHA-256: `3ACB079F04DFFA12649F6421E9629CEBBC906AEA4258D7282203B290E3357615`
- 未確認: 実Android端末での上書きインストール、OSナビゲーションバーとのSafe Area、PDFの端末保存および共有先アプリ起動

## 2026-09-23 / v1.2

- `npm test`: 13件すべて成功
- `npm run build`: 成功
- `npx cap sync android`: 成功
- `gradlew.bat clean assembleDebug`: 成功
- APK署名: v2署名を検証済み
- パッケージ: `jp.local.kintai`
- versionCode: 3
- versionName: 1.2
- APK内に2026年9月21日、22日、23日の祝日データが含まれることを確認
- 未確認: 利用端末での上書きインストールおよびPDF再生成
