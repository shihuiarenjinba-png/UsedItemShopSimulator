# Group A — 残5製品・統一QA実行と引継ぎ（2026-10-25）

本資料とQAスクリプトは**開発者用**であり、購入者UIに表示しない。5リポジトリはPrivateのまま。GitHubの支払い/公開設定、main/release、Partner Centerには変更を加えていない。

## 1. この作業で実装したこと

| 製品 | 対象コミット（この資料作成前） | 実施内容 |
|---|---|---|
| Used Item Shop Simulator (`UsedItemShopSimulator`) | `ef03417b2560e99ab1e8b7d2b779e212ce56f604` | 開業画面の通過、7タブ全操作と対応パネルの存在、月次/Seller遷移の単発通知、HOME/END、1024/1280正確なピクセル画面検証 |
| Factory Inspection Simulator (`FactoryInspectionSimulator`) | `f33dca5cce7098f23874d42a2e3cdd33fc2a9d77` | 4タブの実画面/ARIA/方向キー、全パネルと本編の接続、正確な画像寸法検証 |
| 引継ぎ室 (`game-new`) | `87a5640b4e66669b9b1de64cf0adda59ef66ef7d` | 物語/手がかりの2タブ、クリック/ジャンプ/戻り/方向キー、本物のタブコードをモックDOMで実行する2テスト追加 |
| EKIDEN MANAGER (`game-stadium`) | `638154d2ea5b3002277a689a1af6dd2fc02dcbd5` | 5タブとパネル対応、初見の練習画面、クリック/キーボード、実タブコードのモックDOMテスト2件追加 |
| LUCK LAB (`game`) | `3e3657585b8e24b3f3ca7dc4b936622dc42a8cba` | 販売用 `store-entry.html` への別エントリ切替、66原本SHAを保持、元indexをMSIXペイロードから除外、7ゲームボード/本編/本物の`lucklab:credits:v4`再読み込みチェック、保護ファイル改変なし |

5製品全てのブラウザQAを**タブ全数巡回・該当パネル実表示・Home/Endキー・1024×768/1280×720のPNGヘッダ実寸検証・JS例外・ネットワーク要求ゼロ・内部開発テキスト無し**に統一。

## 2. GitHub Actionsは5製品とも依然 BLOCKED（テストの実FAILではない）

| 製品 | 最新Run | 結果 |
|---|---|---|
| UsedItemShopSimulator | [40159238432](https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40159238432) | Runner ID 0 / steps 0 |
| FactoryInspectionSimulator | [40159143681](https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40159143681) | Runner ID 0 / steps 0 |
| game-new | [40159150635](https://github.com/shihuiarenjinba-png/game-new/actions/runs/40159150635) | Runner ID 0 / steps 0 |
| game-stadium | [40159157778](https://github.com/shihuiarenjinba-png/game-stadium/actions/runs/40159157778) | Runner ID 0 / steps 0 |
| game | [40159164650](https://github.com/shihuiarenjinba-png/game/actions/runs/40159164650) | Runner ID 0 / steps 0 |

**PASSしていないもの**: GitHub Actionsのnpm test、実Playwright Chromium UI、実Windowsパッケージ/MSIXの動作、署名、WACK、正式Store認定。コードの構文・模擬DOM操作が成功したことを実アプリQAの代わりにしない。

## 3. Privateを保ったまま5製品の検証をまとめて回すコマンド

コード担当者がGitHubへのPrivate閲覧権限とGit for Windows/Node.js 22以上を備えた信頼できるWindows PCを利用する。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/run-all-five-private-qa.ps1
```

`UsedItemShopSimulator` の本作業ブランチから上のファイルを実行する。既存ディレクトリを勝手に削除/上書きせず、5製品を各正確な作業ブランチから `git clone --depth 1` して、各 `scripts/run-unified-qa-windows.ps1` を実行する。ユーザーにZIPのダウンロードは求めない。

- すべての製品で Source tests→Chromium UI→PNG寸法検証を実施。
- 成功した製品だけ、ソースSHAと一致した`LOCAL_QA_HANDOFF.json`を受理。
- 横断結果は `%USERPROFILE%\GroupA-Private-QA-20261025\GROUP_A_FIVE_QA_SUMMARY.json`。
- 実行環境に接続できない、テストが失敗した、SHA/PNG不整合がある場合はHOLDとして原因を記録する。すべてPASSするまで「5件完了」と言わない。
- **この一括スクリプトは作成済みだがWindows上での実行は未実施**。ログとスクリーンショットを確認してから合格判定する。

## 4. 追加で行った限定検査

GitHubコネクタから実際のタブモジュールを取得し、V8上の模擬DOMで以下の状態遷移を確認した（Windows/ブラウザでの操作保証ではない）。

- UsedItemShop: 新規売り手/支払期限の初回通知による自動タブ切替、タブを手動で変えた後に巻き戻らないこと、ArrowRight。
- FactoryInspection: 4タブの表示/非表示、履歴パネル、ArrowUp、aria-panel対応。
- Handover Room: 物語/証拠の切替、証拠へジャンプして戻る、方向キー、関連パネル。
- EKIDEN: 初期練習画面、5タブ、経営→編成キー切替、該当パネル表示。

模擬DOMテストのうち引継ぎ室/EKIDENはリポジトリの`tests/*.test.cjs`にも保存した。実際の正式PASSはNodeテストとブラウザQA完走後に認定する。

## 5. MSIXとStoreの停止条件

低価格Night Office Auditor、Small Business Simulator、finance-simulation の公開3製品は従来のソース・UI・未署名MSIX候補検証PASSを維持。残りPrivate5製品ではこの段階の成果物はまだ存在しない。

有料/低価格/ゲーム別の正式Store Identity・PFN・Store VersionはPartner Centerまたは承認済みの正規情報で必ず照合する。推測したIdentityで正式候補や公開承認を進めない。署名/Windowsインストール/WACK/認定提出は実際の手順を実施してから判定する。

**購入者向けUIに開発工程・検証進捗・GitHub Actions・内部QA表記を露出しない。**
