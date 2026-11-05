# 第三方授權與修改說明

繁體中文顯示字典衍生自 [OpenCC](https://github.com/BYVoid/OpenCC)，來源為 `opencc-python-reimplemented==0.1.7` 的字典與 `s2twp` 設定。該分發採 Apache License 2.0；完整授權與原始 NOTICE 分別保留於 `licenses/OPENCC-LICENSE.txt`、`licenses/OPENCC-NOTICE.txt`。

本 fork 將字典轉為瀏覽器可用的 JavaScript 資料，補入介面用語及台灣用詞覆蓋，只用於文字顯示。此為衍生顯示字典，不宣稱提供完整 OpenCC 引擎或所有語境的等價轉換。語言資料直接附於編譯完成的 Client，安裝與執行不會下載轉換工具。

`lib/zh-tw-data.js` 由 `scripts/build-zh-tw.py` 產生；`lib/zh-tw-presentation.js` 為本 fork 的顯示層與原始資料保護邏輯。`scripts/build-zh-tw-client.mjs` 將兩者嵌入既有 Client，並同步舊載入路徑的相容 artifact。

原市場程式碼沿用根目錄 LICENSE 的授權；新增字典授權不取代原專案授權。
