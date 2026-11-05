# Portable Market — 完整可攜修正版（非官方）

這個分支是可以直接安裝的完整插件套件，不是小 patch，也不需要原電腦的資料夾。版本 **0.4.17-portable.2**，基於 `@dsh-market/plugin` 0.4.17。

## 在家裡的電腦安裝

1. 安裝／開啟 DeepSeek Harness，建議使用已實測的 **0.2.1-rc.5** 或符合套件版本需求的版本。
2. 若已裝另一份插件市場，先在 Harness **內建「外掛」管理頁**移除 `@dsh-market/plugin`，不要從市場自己的按鈕移除自身。
3. 在內建「外掛」的新增安裝來源中輸入：

```text
github:n4714806/dsh-market#portable-v0.4.17.2
```

4. 完成後重新整理／重開 Harness。語意搜尋會使用那台電腦的全域預設模型，請自行設定／登入 AI 供應商。

固定版本原始碼：https://github.com/n4714806/dsh-market/tree/portable-v0.4.17.2

如果 Desktop 的新增介面只接受本機資料夾：下載上述固定版本的 ZIP、解壓縮，再將套件根目錄交給內建外掛管理器安裝。讓管理器處理 production dependencies，不要手改 profile 設定。

CLI 已安裝且可用時，可在**目標 profile**執行（下例的 `web` 請換成實際名稱）：

```sh
dsh plugin --profile web add github:n4714806/dsh-market#portable-v0.4.17.2
```

不需要在家裡重現修正過程，也不要執行這個上游大型 repository 的一般開發建置命令。此分支根目錄本身就是已建好的 bundle，沒有 prepare/install/build lifecycle scripts。

## 包含的完整修正

- 一般 Cordis 插件安裝、更新、移除走宿主插件管理器，不依賴外部 `dsh` 命令。
- 以宿主目前 profile 為準，拒絕跨 profile 誤操作；不寫死 desktop/web。
- 精確辨識目前 profile 的已裝套件；市場資訊有歧義時保留真實套件名管理，不胡亂對應另一個插件。
- 顯示真實安裝階段、錯誤、重啟需求；狀態查詢有上限，不把未知／逾時當成功。
- registry 更新失敗時嘗試還原精確舊版與原 enabled 狀態，還原結果明確顯示。
- 語意搜尋跟隨全域預設 provider/model/reasoning effort，顯示模型與降級原因，具有逾時保護。
- 包含回歸測試；production dependencies 固定為已測版本。

## 任務追蹤與來源版本（portable.2）

- 「安裝任務」可重新開啟，顯示階段、時間線、結果、錯誤和完整子會話 ID；只在分頁可見時每 3 秒查詢，15 秒無回應會明確報錯。
- 任務先落盤才開始操作。保留最近 100 筆、每筆 50 個事件；保留已用 ID 的雜湊以避免重複執行。重啟時未完成任務標為「已中斷」，不自動重試。只支援單一 Host 寫入同一 profile。
- AI 審查／診斷必須明確選擇父會話，並確認真實子會話與結果管道後才稱為委派。非原生插件的 AI 路徑只要求診斷，不會由市場自動執行模型建議命令。完整建議留在子會話，不存入任務診斷副本。
- 取消表示已提出停止要求，不等於所有變更已回復。逾時、停止狀態不明及重啟需求會顯示「需要處理」。舊版未保存的歷史任務無法補回。
- 安裝視窗分別查詢 npm `dist-tags.latest` 與 GitHub 最新正式 release，顯示來源、查詢時間及快取狀態；可手動略過 5 分鐘快取。查詢失敗、限流、找不到 release 都不是「已是最新版」。
- 已裝更新檢查優先使用宿主**明確設定的 registry**，其次才是 pnpm 解析來源；不拿 GitHub 修改時間替代失敗的 npm 查詢。Git／本機來源不假裝可比較 npm 版本。
- 市場首頁顯示索引生成時間，並可重新取得索引。**這不是全市場即時同步**：新條目收錄仍受上游索引發布進度影響；GitHub release 與 npm 是不同發布渠道，不保證版本號相同。
- fork 使用固定 tag，不以官方市場 npm 版本判斷自我更新。更新此市場請用內建外掛管理；安裝後重新整理／重開 GUI，確認看得到「安裝任務」及「任務追蹤版 .2」。

## 不包含個人資料

沒有攜帶帳號、API key、OAuth token、聊天、桌布、profile、原電腦絕對路徑或 node_modules。安裝套件仍需要網路下載依賴；家中電腦的 AI 登入需自行完成。這不是離線攜帶整個 Harness 的備份。

## 驗證及限制

- 已在 Windows 的 DSH 0.2.1-rc.5 Desktop 驗證。
- 真實隔離 CLI／Web 測試通過：安裝、精確清單、啟用、更新、刻意失敗後還原、移除、跨 profile 拒絕。
- UI 函式有 mock 回歸測試；沒有宣稱瀏覽器畫面、第三方桌布效果或其他作業系統皆已驗證。
- 純 headless CLI 沒有市場 Web UI；此套件仍需要 Web Host。
- 市場自我更新／移除、安全審查後安裝、需要額外 build-script 批准等情況，請使用宿主內建外掛管理。
- 技能、MCP、備份匯入等特殊流程仍保留原市場實作，未全數遷移。
- 更新還原不是斷電交易保證；無法精確還原的 Git／本機來源更新會提示手動處理，不先移除。
- 不繞過宿主版本檢查或自動批准執行腳本。

## 開發與測試

有 Node.js 即可執行不需網路的 mock 測試：

```sh
npm test
```

這個 portable branch 與最小上游 PR 分支不同：`fix/scoped-inventory-default-model` 只包含兩個窄範圍的原始碼修補；要跨電腦使用完整版本，請用這個 portable tag。

## 授權與來源

原始碼基於 [2BingLing/dsh-market](https://github.com/2BingLing/dsh-market)，遵守 MIT 授權及原始 copyright notice。這是非官方衍生版本，並非原作者發行。上游保留的品牌 Logo 未隨此版本散佈，已換成原創箱型線條圖示。

回復官方版：在內建外掛管理移除此套件，再安裝 `@dsh-market/plugin`。官方更新可能覆蓋此修正版；固定 tag 不會自動跟著官方改動。
