# グループA 残5製品｜Windows QA 第2段階・実行引継ぎ
作成: 2026-10-26 / 商品方針: **有料販売が原則**、明確に軽量なものだけ完成後に無料化を検討する。

## 1. この段階でGitHub上に反映したこと
| 製品 | 作業ブランチ | QA強化／修正の実施内容 | 検証コード確定HEAD（本書作成前） |
| --- | --- | --- | --- |
| Used Item Shop Simulator | `work/ui-handoff-review-20261025` | セーブ復元後の営業結果消去を修正。不正な時計を含むJSONは現行プレイ/バックアップを変更する前に拒否。正常インポート時は営業結果を再表示。Nodeテスト2件を追加（破損時計・正常インポート）。Playwrightは営業終了→リセット→バックアップ復元まで検証する | `32b608afd173fb2b48cd4dabb706a940eb427e34` |
| Factory Inspection Simulator | `work/ui-handoff-review-20261025` | Playwrightで実注文処理、検査方針、利益表示、台帳追加、再起動後のセーブ一致を確認する | `d1e441cc67ca7e1ca10d90d64d56af1126281c0a` |
| Handover Room | `work/unified-qa-20261025` | Playwrightで3択の物語選択、進行ゲージの増加、自動保存、再読込の状態継続を確認する | `ccae96fdf5c19bce3a2dc7112faebd6e46a3fdde` |
| EKIDEN MANAGER | `work/unified-qa-20261025` | Playwrightで週間練習を1回実行、週次進行、年度不変、台帳保持、再読込の完全一致を確認する | `883f9fde4285c75b866c8c91caad1b25d83466ef` |
| LUCK LAB | `work/unified-qa-20261025` | Playwrightで本編入場、1回のスロット遊技、架空チップ増減と損益の一致、履歴保存、再読み込みを検証。保護原本66ファイルは変更していない | `34f57d6ad5cc714ac1069d4b3d8129c98227e9f2` |

**重要**: 構文解析上のエラーがないことは確認したが、上記PlaywrightのWindows実行結果は未取得。Nodeテスト2件も未実行。いずれも「PASS」としない。

## 2. GitHub Actionsの最新観測（2026-10-26 JST）
| 製品 | 直近確認Run | 状態 |
| --- | --- | --- |
| Used Item Shop Simulator | [40246494365](https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40246494365) | failure / 実行ステップ0 |
| Factory Inspection Simulator | [40246612156](https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40246612156) | failure / 実行ステップ0 |
| Handover Room | [40246708967](https://github.com/shihuiarenjinba-png/game-new/actions/runs/40246708967) | failure / 実行ステップ0 |
| EKIDEN MANAGER | [40246762217](https://github.com/shihuiarenjinba-png/game-stadium/actions/runs/40246762217) | failure / 実行ステップ0 |
| LUCK LAB | [40246820680](https://github.com/shihuiarenjinba-png/game/actions/runs/40246820680) | failure / 実行ステップ0 |

Runner/job開始前の失敗であり、ゲームのテスト失敗と断定できない。GitHub課金、可視性、main/release、Store設定を無断で変更しない。ユーザーへのZIPダウンロード依頼は不要。

## 3. Windowsコード担当に依頼する実行
前提: 対象Privateリポジトリへの閲覧権、Git for Windows、PowerShell、Node.js 22以上、Chromiumをダウンロードできる信頼済みWindows PC。

作業ブランチ `UsedItemShopSimulator:work/ui-handoff-review-20261025` から、次を**既存成果物のない新しいWorkspace**に対して実行する:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/run-all-five-private-qa.ps1 -Workspace (Join-Path $env:USERPROFILE ('GroupA-Private-QA-'+(Get-Date -Format 'yyyyMMdd-HHmmss')))
```

このスクリプトは5製品を各指定ブランチからcloneし、`npm test`、必要なSHA台帳監査、Playwright Chromium、1024×768/1280×720の表示/操作、QA_RESULT.json/LOCAL_QA_HANDOFF.json/PNGを記録する。既存フォルダを破壊せず、任意の一件が失敗したら「全件PASS」は返さない。

### コード担当から受領する証跡
- 5製品別のチェックアウトHEADと `npm test` の総件数/合否。
- 製品ごとの `QA_RESULT.json`、`LOCAL_QA_HANDOFF.json`、画面PNGとSHA-256。
- 横断 `GROUP_A_FIVE_QA_SUMMARY.json`。
- Playwrightで失敗した場合は例外、再現操作、スクリーンショット、該当ソースSHA。
- Windowsゲーム本編の追加確認: 主要操作を序盤〜最終盤まで反復、保存/再開、重要な不正入力、DPIとUIはみ出し、ゲームバランス。
- LUCK LAB: v85保護対象66ファイルのSHA-256を引き続きチェック。

## 4. 残りのゲート
- **P0**: 実行・会計・保存破損・クラッシュ・操作不能を解消し、証拠付きの回帰PASS。
- **P1**: 課題と完了目標が成立する本編の通しプレイ、バランス、商品説明との機能一致。
- **P2**: 初見ユーザーの遊びやすさ。両画面サイズ、キーボード、必要なJP/EN、結果説明、目立つ開発語の除去。
- **MSIX**: 全P0/P1と重要P2の確認後に最新版ソースと1対1対応するMSIX候補生成。Manifest・PackageVersion・SHA-256。
- **Store**: Partner Center実値を照合後、適切な署名/検査/実機のインストール・更新・削除/商品画像・価格・権利確認・認定申請。

MSIXの生成成功だけで有料版完成とは判定しない。実行不能・未実施は BLOCKED/NOT TESTED と記す。

## 5. 作業範囲
GitHubへの書込みは指定作業ブランチのみ。正式Store ID、Publisher、PFNを推測しない。Privateを保護し、無断公開・勝手な課金設定変更・Partner Center申請をしない。

参考: `docs/GROUP_A_PAID_FIRST_RELEASE_QUALITY_GATES_20261025_JA.md`（有料優先と9製品のP0/P1/P2販売品質基準）。
