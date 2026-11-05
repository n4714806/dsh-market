# 可攜版本交付與驗證

## 範圍

本 repository 的 `portable-market` 分支包含完整市場 Host / Client 程式、繁體中文資源、建置腳本、測試、授權文件、依賴鎖定及發布包；不是只提供局部 patch。

- 已測程式版本：`0.4.17-portable.6`
- 固定程式 tag：[`portable-v0.4.17.6`](https://github.com/n4714806/dsh-market/tree/portable-v0.4.17.6)
- [完整發布包](../releases/dsh-market-plugin-0.4.17-portable.6.tgz)
- [發布包 SHA-256](../releases/SHA256SUMS.txt)
- [安裝說明](../README.md)
- [依賴鎖定](../pnpm-lock.yaml)

這次補充交付文件與發布包，不移動已發布 tag、不變更已測試的程式版本。安裝可以繼續使用 `github:n4714806/dsh-market#portable-v0.4.17.6`。Git tag 原始版本未含後補的鎖定檔；需重現本次開發依賴時使用包含該鎖定檔的分支 commit。

開發／重現測試時，在專案根目錄執行：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
```

不要在正式 DSH profile 手動執行這些開發命令；正式安裝交給 DSH 內建外掛管理器處理。

## 已驗證與尚未驗證

2026-11-05 在 DSH `0.2.1-rc.5`：

- 完整市場回歸測試通過；新增相容流程測試 96 項：95 通過、1 跳過。跳過項目為 Windows 檔案 symlink 權限不足；junction 防護測試有執行。
- 真實 `market_compat` Agent 工具與 GUI HTTP API 取得同一份 Better Sidebar 診斷：latest `0.30.1`、官方選項 `0.28.2`、`official-option`、`not-applied`。
- 已確認服務端供應 `portable.6` 繁體中文 Client。Client 視覺檢查未完成，不能宣稱實際畫面驗收通過。
- 本案例沒有呼叫額外 AI 草稿生成，沒有安裝、執行或豁免 Better Sidebar。
- AI 生成分支透過模擬模型測試驗證，沒有冒稱真實供應商端到端生成成功。
- 草稿只通過 JSON 結構與唯一前文等靜態檢查；語法、隔離建置、執行及畫面測試仍是 `not-run`。草稿不是可直接安裝的修補套件。

## Better Sidebar 的公開證據

- [作者固定 commit 的版本對照說明](https://github.com/omdsh-dev/DSH-better-sidebar/blob/0b6293f05145d6852428a05035d5ea0f370992be/README.md#L47-L63)建議 DSH `0.2.1-rc.1` 至 `rc.5` 使用 `0.28.2`。
- [0.28.2 registry manifest](https://registry.npmjs.org/dsh-better-sidebar/0.28.2)：13 個 DSH peers 為 `^0.2.1-rc.1`。
- [0.30.1 registry manifest](https://registry.npmjs.org/dsh-better-sidebar/0.30.1)：14 個 DSH peers 為 `^0.2.2-rc.1`。
- [公開來源核對摘要](compatibility-evidence.json)：保留 pinned commit、來源 URL、manifest / license 雜湊與 peer agreement 結果。這不是完整可重現建置或安全審計證明。
- 官方 `0.28.2` tarball SHA-256：`f5ed557f45e9ecab81d5a2216b1a59d21dc19f4ce25e9c386edea7958cbcfac5`。
- 兩版上游授權均為 MIT，copyright 2026 dsh-external；未把上游整份程式碼重新包裝成自己的成果。

## 未上傳的資料

不包含登入憑證、使用者 profile、任務原始日誌、私人會話、`node_modules`、DSH 核心安裝目錄或重複下載的第三方研究原碼。研究所需上游來源以固定 commit、公開 URL 與雜湊引用，避免把本機 workspace 備份誤當可攜發布。
