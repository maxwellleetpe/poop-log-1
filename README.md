# 💩 大便日誌 Android APP

## 快速 Build APK（不需要 Android Studio）

### 第一步：安裝 Node.js
https://nodejs.org 下載安裝 LTS 版本

### 第二步：安裝 Expo CLI 和 EAS CLI
```bash
npm install -g expo-cli eas-cli
```

### 第三步：進入專案目錄並安裝依賴
```bash
cd 大便日誌-RN
npm install
```

### 第四步：登入 Expo 帳號（免費）
```bash
eas login
# 或 eas register 註冊新帳號
```

### 第五步：雲端 Build APK
```bash
eas build -p android --profile preview
```
- Build 完成後會給你下載連結（約 5-10 分鐘）
- 下載 .apk 後直接安裝到 Android 手機

---

## 本機測試（需要 Android Studio）
```bash
npm start
# 按 a 開啟 Android 模擬器
```

## 專案結構
```
大便日誌-RN/
├── App.tsx          ← 主程式
├── src/
│   └── constants.ts ← 常數設定
├── app.json         ← Expo 設定
├── eas.json         ← Build 設定
└── package.json     ← 套件清單
```

## 功能
- ✅ 新增紀錄（分類、大小、顏色、備註、日期）
- ✅ 紀錄列表（編輯、刪除、一鍵清除）
- ✅ 統計分析（分類趨勢圖、分佈圖）
- ✅ 資料備份（匯出 JSON / 匯入還原）
- ✅ AsyncStorage 本地儲存
- ✅ 支援 Android 8.0+
