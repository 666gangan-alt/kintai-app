# APKビルド手順

## 必要なもの

- Node.js 22以降
- JDK 21
- Android StudioまたはAndroid SDK（Android 36 / Build Tools 36.0.0）

## 初回準備

プロジェクトのフォルダーで次を実行します。

```powershell
npm install
npm run build
npx cap sync android
```

Android Studioで開く場合：

```powershell
npx cap open android
```

## Debug APK

Android Studioでは `Build > Build Bundle(s) / APK(s) > Build APK(s)` を選びます。

コマンドラインでは、`JAVA_HOME` がJDK 21を指している状態で実行します。

```powershell
npm run android:debug
```

生成場所：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Release APK

未署名のRelease APKは次で生成できます。

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleRelease
```

配布・更新に使うRelease APKは、Android Studioの `Build > Generate Signed Bundle / APK` から同じ署名鍵で署名してください。署名鍵は紛失すると同じアプリとして更新できないため、安全な場所へ保管します。

## Web版の確認

```powershell
npm run dev
```

計算テスト：

```powershell
npm test
```

## 祝日データの更新

内閣府の祝日CSVを `data/official-holidays.csv` へ保存した後、次を実行します。

```powershell
npm run holidays:build
npm run build
npx cap sync android
```
