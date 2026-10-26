# グループA ゲーム5製品｜エラー調査・実行確認ログ（2026-10-26）
作業方針: **原則有料商品**。P0致命的なバグ、保存破損、計算矛盾、操作不能の解消を最優先とする。資料は開発者用であり購入者UIには表示しない。

## 1. 今回実際に修正した内容
### Used Item Shop Simulator
- `tests/haggle-ui-flow.test.cjs` の模擬DOMに `agedDiscountBtn`/`agedDiscountPct`/`agedDiscountNotice` がなく、画面初期化時に `addEventListener` が停止する問題を修正。**テスト環境側の不備**であり、Windows製品側のクラッシュと断定しない。
- `src/app.js` のセーブJSON読込で、バックアップ対象のゲーム本体だけではなく対応する当日の `TIME_KEY` を `BACKUP_TIME_KEY` に保存するよう修正。途中の営業時間を元のセーブと組で復元できる。バックアップ書込失敗時は既存バックアップをできる範囲で戻し、現行セーブの変更を中止する。
- 時計を動かしてから別セーブを読み込み、バックアップから元の時計とゲーム本体を復元する回帰テスト1件を追加。
- `scripts/unified-ui-qa.cjs` の営業結果復元テストは、営業タブを再選択して結果が実際に表示できることを確認する順序に修正。
- この記録作成直前HEAD: `940c9481a9b2dd9208b900ef11dd9f69b8ab7022`。

### Factory Inspection Simulator
- `tests/app-flow.test.cjs` の模擬 `document` に任意の店内演出照会用 `querySelector()` がなく、画面初期化で例外になる問題を修正。これはテスト側の不足。
- この記録作成直前HEAD: `80001fdeda3b29861a38b7e6d5c5f26a23495d57`。

### Handover Room / EKIDEN MANAGER / LUCK LAB
- 前工程のゲーム操作・保存回帰テストを維持し、このターンでは追加のソース修正を行っていない。
- Handover Roomで前工程に追加した破損セーブ保護は実ブラウザ未検証のままHOLD。
- LUCK LAB保護原本66ファイルには書き込みなし。

## 2. コード実行検査（V8模擬ランタイム）
実GitHubブランチのJavaScriptソースと既存のテスト関数を取得し、独立したV8環境で `node:test` / `assert` 等に薄い互換スタブを差し込んでテスト関数そのものを実行した。Node.js標準テストランナーをネイティブ実行したものではない。実Windows・Electron・Playwright Chromium・MSIX QAではない。

| 対象 | 対象テストと結果 | 備考 |
| --- | --- | --- |
| Used Item Shop Simulator | `tests/haggle-ui-flow.test.cjs` 14 / 14 PASS | 実ソース＋模擬DOM。買取、修理、セーブ読込、原本保護、営業時計のバックアップ復元 |
| Factory Inspection Simulator | `tests/engine.test.cjs` と `tests/90-day-handoff-regression.test.cjs` 16 / 16 PASS | 実エンジン。決定論、不良・出荷・利益台帳、90日間、セーブ妥当性 |
| Factory Inspection Simulator | `tests/app-flow.test.cjs` 7 / 7 PASS | 実ソース＋模擬DOM。注文の実行、画面操作、データ保護 |
| EKIDEN MANAGER | `tests/engine.test.cjs` / `tests/eight-season-acceptance.test.cjs` / `tests/paid-joint-practice.test.cjs` 35 / 35 PASS | 8シーズン、練習、レース、架空の部費と合同練習 |
| LUCK LAB | `test_v82_rules.js` PASS（40,024個の内部チェック）、`test_v80_credit_recovery.js` PASS（34アサーション）、`test_v85_story.js` PASS（15,000個の乱数シナリオ＋境界値） | 借入/返済・ルール・物語。実UIではない |
| Handover Room | 今回の独立V8テスト未実施 | 前工程のソースとPlaywrightテスト追加のみ。**動作PASSは未認定** |

**合計値は異種検証を混算しないこと**。ゲームUIの実操作、安全なパッケージ化、セキュリティ、素材権利、Microsoft Store認定は今回のV8実行によって証明されない。

## 3. Actions停止状態（2026-10-26観測）
| 製品 | 最新確認Run | 結果 |
| --- | --- | --- |
| Used Item Shop Simulator | [40249189637](https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40249189637) | failure / steps=0 |
| Factory Inspection Simulator | [40249285548](https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40249285548) | failure / steps=0 |
| Handover Room | [40247177729](https://github.com/shihuiarenjinba-png/game-new/actions/runs/40247177729) | failure / steps=0 |
| EKIDEN MANAGER | [40246762217](https://github.com/shihuiarenjinba-png/game-stadium/actions/runs/40246762217) | failure / steps=0 |
| LUCK LAB | [40246820680](https://github.com/shihuiarenjinba-png/game/actions/runs/40246820680) | failure / steps=0 |

一部ジョブログ取得は BlobNotFound (404) で詳細不明。**コード実行より前に止まっている**ため、ゲームプログラムのテストFAILとは断定不可。課金原因・権限原因・Runner障害などの根因は未確定。GitHub請求/公開設定は操作していない。

## 4. 次工程と停止ゲート
1. コード担当がPrivate認証可能なWindows PCで `scripts/run-all-five-private-qa.ps1` を指定作業ブランチから**空の新規Workspace**に対して実行する（ZIPダウンロード不要）。
2. `npm test` / Playwright Chromium / 1024×768・1280×720 / 主要ゲーム操作 / セーブ復元、JSON/PNGとSHA-256を保存して報告する。失敗時はその製品のみ原因・再現方法を特定して作業ブランチへ小さく修正。
3. Handover Roomの破損セーブ保護・データ読込、EKIDENの画面遷移、LUCK LABの7ゲーム本編について、実画面とWindows動作を確認する。
4. 9製品すべて、P0・必要機能P1・遊びやすさP2を独立判定してから、最新版ソースに対応したMSIXを生成・検証する。Store Identity/PFN/Publisher/VersionはPartner Center正式情報だけで確定する。
5. Windowsインストール・更新・セーブ復元・署名/WACK・Store提出と審査は未実施のまま。**販売判定は全製品ともHOLD**。

既存Private設定は維持、`main`/`release`への直接変更、Storeのアップロード/公開、GitHub課金設定変更、ID推測は行わない。
