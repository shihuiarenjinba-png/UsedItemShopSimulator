# Group A — 未完了5製品 QA実行引継ぎ（2026-10-25）

対象: `shihuiarenjinba-png` 下の以下5件。**main/release未変更。非公開状態維持。Store未提出。**

## 実装の進捗
| リポジトリ | QA対象のソースHEAD（資料作成前） | 修正・検証追加 |
|---|---|---|
| `UsedItemShopSimulator` | `fd911d14d4ee20a02d82c810d47b564b81adf601` | 初回開業画面を通過して7タブを確認、売り手待ちでのタブ強制巻き戻りを修正 |
| `FactoryInspectionSimulator` | `ed514f6069b7655a4247d8a80595b474b6d4d240` | 4タブ・操作パネルの対応、方向キー、1024/1280実ピクセル撮影 |
| `game-new` 引継ぎ室 | `b4ead7c158c12e6932b231a9120bf9e0ac47af95` | 物語/手がかり2タブのARIA対応と上下左右キー |
| `game-stadium` EKIDEN MANAGER | `52250ba530829df3c9a8bd99697190ac7ad407c5` | レース・練習・編成・経営・ガイド5タブのパネル対応と上下左右キー |
| `game` LUCK LAB | `85b78d28e30f5bffa6efcc78f013ddeb7149cf8b` | 66保護原本を維持し、開発版告知のない`store-entry.html`をWindowsエントリに設定。パッケージから元`index.html`を除外。ゲーム主要画面・セーブ再開・4種類のゲーム要素検査 |

## 現在のGitHub Actions状態
以下の最新Runは、各1ジョブとも **runner_id=0、steps=0の実行前失敗**。これは**ソーステストFAILではない**。自己判断でPublic化・GitHub Billing/課金変更をしない。

- Used Item Shop: https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40157988495
- Factory Inspection: https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40157995349
- 引継ぎ室: https://github.com/shihuiarenjinba-png/game-new/actions/runs/40158001121
- EKIDEN: https://github.com/shihuiarenjinba-png/game-stadium/actions/runs/40158007507
- LUCK LAB: https://github.com/shihuiarenjinba-png/game/actions/runs/40158014538

## コード担当・Windows PCからの無料ローカル検証経路
各リポジトリを**非公開のまま**同じ所有アカウントの作業ブランチにチェックアウトし、Node.js 22以上が使える信頼できるWindows PCからPowerShellで実行する。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/run-unified-qa-windows.ps1
```

- `npm install` → `npm test` → LUCK LABのみSHA-256原本台帳検査 → Playwright ChromiumでUI実操作 → PNG厳密サイズ照合。
- `unified-ui-evidence/QA_RESULT.json` が `PASS`、PNGが2枚以上であるときだけ最終結果 `unified-ui-evidence/LOCAL_QA_HANDOFF.json` を作成する。
- `LOCAL_QA_HANDOFF.json` には実行環境で取得可能ならHEAD SHA、画面画像のSHA256、テスト結果、Store工程の未実施状態が記録される。
- Node/npm/Chromiumのインストールが必要。自動テストを成功させた**という結果は現時点で存在しない**。失敗した場合は修正対象の現物ログと画像を提出する。
- WindowsネイティブMSIXのインストール検証、署名、WACKは**別途必須**。上のPowerShellがPASSでもWindows Store販売準備PASSとはしない。
- GitHub-hosted Runnerが復旧した場合は各作業ブランチの `.github/workflows/unified-ui-gate.yml` も同一SHAで実行し、ソースとスクリーンショットを照合する。

## LUCK LAB — 保護原本の扱い
- `scripts/v85-source-sha256.json`が示す66ファイルを改変しない。
- 修正コミットは元の保護ブランチHEAD `c67fa84e4b9b5f28a0bb751054bc023607a05d4c` と比較して保護ファイル変更ゼロをGitHubで確認。
- 販売用 `store-entry.html` は元の`index.html`から「開発版のため販売は未開始です。」の1文のみ除去した静的ページ。事業者/実在者への誤認・仮想チップ等の説明は維持。
- `desktop/main.cjs`, `desktop/smoke.cjs`, `scripts/prepare-msix-config.cjs` が新入口を参照し、`index.html`はMSIXペイロードから除外。
- GitHubとの静的差分確認とJS構文検査は実施済み。ただしQA Runner未割当のため、動作テスト/SHA全件の再計算実行は未完了。**正式なStore Identityが不明なのでMSIX販売候補は未生成**。

## ほか3製品（別表管理）
- Small Business Simulator: SOURCE 46/46 + Chromium UI + unsigned MSIX internally PASS (Runs 40150366236 / 40155329506).
- finance-simulation: SOURCE 29/29 + Chromium UI + unsigned MSIX internally PASS (Runs 40150154643 / 40150597697).
- NightOfficeAuditor 低価格: SOURCE 42/42 + Windows Electron画面4枚 + unsigned MSIX PASS（同一Run 40155379054）。

## 引き渡し／公開の停止条件
5製品の検証が未実行、LUCK LABの原本SHA不一致、MSIX署名・実機インストール/WACK未実施、正式なPartner Center Identity/PFN/Store Version未確認のいずれかなら**全8製品完成・Store提出可能とは宣言しない**。

購入者UIに開発工程、QA履歴、GitHub ActionsやMSIXの内部表示を追加しない。
