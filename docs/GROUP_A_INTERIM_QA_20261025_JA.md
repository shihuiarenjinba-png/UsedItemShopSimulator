# Group A — 8製品統一検証台帳（2026-10-25）

**判定**: 3製品は SOURCE/UI/未署名MSIXの証拠取得済み。5製品は `runner_id=0`, `steps=0` でテスト開始前BLOCKED。**全体引渡しとStore提出はHOLD。**

## 共通の合格基準
- S: npm test等の全回帰PASS＋正確なソースSHA。
- U: 1024×768と1280×720での本物の画面キャプチャ、画面切替、基本操作、セーブ、JS例外なし、購入者向けの内部工程テキストなし。
- P: 同じソースを根拠に未署名x64 MSIX＋MSIXUPLOADの生成、内部Manifest検査、SHA256記録。これは公開可否を意味しない。
- R: Partner Centerの正式Identity/PFN/Store Version確認、署名、WACK、MSIX実機インストール/更新/アンインストール、提出承認。全8製品でR=HOLD。

## 3製品 — 実際のPASS証拠
1. **Small Business Simulator** `shihuiarenjinba-png/SmallBusinessSimulator`
   - `work/ui-release-review-20261025`。QA source HEAD `f59e5cf3bbc682cf2582d656a896843509e9f446`。46/46 tests、Chromium日次営業・入力エラー・セーブ再開・1024幅PASS、run [40150366236](https://github.com/shihuiarenjinba-png/SmallBusinessSimulator/actions/runs/40150366236)。
   - unsigned x64 MSIX/MSIXUPLOAD PASS run [40155329506](https://github.com/shihuiarenjinba-png/SmallBusinessSimulator/actions/runs/40155329506)、artifact 12584352833。
   - MSIX SHA256 `06C643640BAEF5206AC53E45625C5B6B8C8642980427DB031AD9EE831FF0E0A7`; upload `B9D8BB769663D6E0C1763CA1E5543CA0284C0C20116A1024E759E052640FCF1A`。
2. **Finance Simulation** `shihuiarenjinba-png/finance-simulation`
   - `work/ui-release-review-20261025`、MSIX source HEAD `682c050d05d53238caf7d4de66163fabb3e48a59`。29/29 tests、5タブ・キーボード・売買・借入・セーブ再開・1024幅PASS、run [40150154643](https://github.com/shihuiarenjinba-png/finance-simulation/actions/runs/40150154643)。
   - unsigned x64 MSIX/MSIXUPLOAD PASS run [40150597697](https://github.com/shihuiarenjinba-png/finance-simulation/actions/runs/40150597697)、artifact 12582149373。
   - MSIX SHA256 `597685DAF8A15F69BE2D50968B7BFE9128DA1684CB582314FABFEF52A58B08AA`; upload `7C22EFE47C12FB46EBB66AA32CEF70203A2435F1D310B193C7176F717E7CA1A9`。
3. **Night Office Auditor — 低価格版** `shihuiarenjinba-png/NightOfficeAuditor`
   - `work/unified-qa-20261025`、HEAD `6399083d05d35b639d17addaa778772702c9545d`。**単一のWindows Actions run [40155379054](https://github.com/shihuiarenjinba-png/NightOfficeAuditor/actions/runs/40155379054)** で42/42 tests、Electron案件/監査報告 1024×768・1280×720のPNG 4枚、unsigned x64 MSIX/MSIXUPLOAD 全てPASS。
   - UI artifact 12583828873、MSIX artifact 12584422767。
   - MSIX SHA256 `F14EA40ACFF601B8979EB3A752923EDA1FA7D0559D9AF171414C54ED0B6C2322`; upload `D5BA6FF2398DC08F354494FC45111619A0BE4C5CDD6C401AE6ADDD6120AC3D7D`。

## 5製品 — Runner割当不成立・合格に数えない
全件、ソースの既知の作業ブランチから共通 `scripts/unified-ui-qa.cjs` と `.github/workflows/unified-ui-gate.yml` を追加。テストは「npm test→UI 1024/1280→タブ・外部通信・JS例外→画面画像・結果JSON」で統一。

| 製品と確認対象SHA | latest Actions | 実行状態 | 追加した事項 |
|---|---|---|---|
| Used Item Shop Simulator `00ae110ea2ce396e952ce16f0038e59a4e95c5dc` | [40155801910](https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40155801910) | Runner 0 / steps 0 | 売り手待ちでタブ選択が巻き戻らない修正＋共通QA |
| Factory Inspection Simulator `8130720f1259f89a9bcd868ea12fe708ef353af9` | [40155805266](https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40155805266) | Runner 0 / steps 0 | タブARIA・方向キー＋共通QA |
| Handover Room `674e203a3c92b2aa8b52b355ba3d78bfa3a628dd` | [40155810354](https://github.com/shihuiarenjinba-png/game-new/actions/runs/40155810354) | Runner 0 / steps 0 | 共通QA |
| EKIDEN MANAGER `5817171da8da635384f66af010229026ed8d2e8d` | [40155814529](https://github.com/shihuiarenjinba-png/game-stadium/actions/runs/40155814529) | Runner 0 / steps 0 | 共通QA。Store Package SID未確定 |
| LUCK LAB `0cd79fbff4f7daea778af7396f6d448ab46eace4` | [40155818918](https://github.com/shihuiarenjinba-png/game/actions/runs/40155818918) | Runner 0 / steps 0 | 共通QA＋既存SHA保護検証。index.htmlの「開発版のため販売は未開始です」は残存、SHA台帳を無断変更しない |

## 次に必要な工程
1. Private 5件でRunnerを正常割当できる条件を確認（GitHubの利用制限／請求設定等）。**公開化や課金設定は所有者の明示許可なしに変更しない。**
2. ワークブランチの統一QAを実行し、全ソースPASS、実UI画像、セーブ・操作、JS例外、開発表示の有無を個別検証。
3. Candidate MSIXが正式Identity根拠と整合するときのみ、同じソースSHAから unsigned x64 MSIXとMSIXUPLOADをビルド・検証。
4. LUCK LABはSHA保護の整合性を損なわず開発表示の解消方針を決める。**現時点ではUI販売判定HOLD。**
5. Partner Centerの正式情報と、各製品の実機インストール、署名、WACK、認定提出は全件未実施。ゲーム画面に開発工程を表示しない。
6. 完成条件がそろうまでは**全8製品完成・Store公開準備完了・全体最終引継ぎ済みとは報告しない**。

※ 有料版 `Night-Office-Auditor-2` は低価格版とは別リポジトリ・別Identity・別QA。低価格版のStore値を転用しない。
