# グループA（8製品）— 2026-10-25 中間QA台帳

**これは最終引渡書ではありません。** main / release・Partner Centerへの直接変更なし。購入者UIには本資料・開発工程・GitHub Actions・MSIX化の内部状態を表示しない。

## 本日確認・実施
| 優先 | 製品 | GitHub状態 / 実施 | 判定 |
|---|---|---|---|
| 1 | Small Business Simulator (`SmallBusinessSimulator`) | Public。別作業ブランチ `work/ui-release-review-20261025` で46/46ソースPASS、Playwrightで日次営業・セーブ・入力エラーからの復帰・1024幅をPASS。画面4枚。Run [40150366236](https://github.com/shihuiarenjinba-png/SmallBusinessSimulator/actions/runs/40150366236)。元の内部MSIX候補はRun 40041259972でPASS（元候補HEADは別）。 | Browser QA PASS / 既存MSIX候補PASS |
| 2 | Finance Simulation (`finance-simulation`) | Public。 `work/ui-release-review-20261025` で5タブのキーボード/ARIAを修正。29/29ソース＋売買・借入・セーブ・1024幅のブラウザQAをPASS、Run [40150154643](https://github.com/shihuiarenjinba-png/finance-simulation/actions/runs/40150154643)。改良後のHEAD `682c050d05d53238caf7d4de66163fabb3e48a59` から unsigned x64 MSIX/MSIXUPLOADを生成、Run [40150597697](https://github.com/shihuiarenjinba-png/finance-simulation/actions/runs/40150597697)、artifact ID 12582149373。MSIX SHA256 `597685DAF8A15F69BE2D50968B7BFE9128DA1684CB582314FABFEF52A58B08AA`。MSIXUPLOAD SHA256 `7C22EFE47C12FB46EBB66AA32CEF70203A2435F1D310B193C7176F717E7CA1A9`。 | Browser QA PASS / unsigned internal candidate PASS |
| 3 | Used Item Shop Simulator (`UsedItemShopSimulator`) | Private。専用ブランチ `work/ui-handoff-review-20261025`。新規売り手を受け付けたときだけ買取タブへ移り、以後の再描画でユーザーが選択したタブを勝手に戻さない修正と回帰テスト追加。Run [40150415751](https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40150415751) は **runner_id=0, steps=0**。ソーステスト未実行、MSIX候補未更新。 | 実装あり / CI BLOCKED |
| 4 | Factory Inspection Simulator (`FactoryInspectionSimulator`) | Private。専用ブランチ `work/ui-handoff-review-20261025`。各タブと実パネルをARIAで対応させ、上下左右キーで切替可能に修正、回帰テスト追加。最新Run [40150529922](https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40150529922) は **runner_id=0, steps=0**。 | 実装あり / CI BLOCKED |
| 5 | Night Office Auditor（低価格版 `NightOfficeAuditor`） | Public。候補ブランチ `ops/msix-candidate-build-20261023` 最新HEAD `8d7fbb2656fce6a2c1033d675f897afd045c541c` でソースPASS・未署名MSIX候補PASS、Actions 40056531835 / 40056527964。今回はソース未変更。 | 既存ソース/MSIX候補PASS |
| 6 | Handover Room (`game-new`) | Private。 `ops/msix-candidate-build-20261023` HEAD `318e739cce3d93504542f2440c312ca73702225b`。過去のActionsは実行開始前失敗。今回ソース未変更。 | CI BLOCKED |
| 7 | EKIDEN MANAGER (`game-stadium`) | Private。 `ops/msix-candidate-build-20261023` HEAD `aee4677603a56340b1e7013fba14808614213165`。過去のActionsは実行開始前失敗。今回ソース未変更。 | CI BLOCKED |
| 8 | LUCK LAB (`game`) | Private。SHA保護66ファイルのEOL対策ブランチ `ops/luck-lab-v85-byte-preservation-20261024` HEAD `c67fa84e4b9b5f28a0bb751054bc023607a05d4c`。index.htmlに「開発版のため販売は未開始です」が**残る**がSHA保護中のため無断変更しない。整合台帳の対応と再ハッシュ検証が必要。 | INTEGRITY / UI COPY HOLD |

## 公開UIの技術工程混入チェック
8製品の現在のindex.htmlを検査し、7製品では `QA_UNSIGNED`, `Store Identity`, `MSIX`, `開発工程`, `開発版` 等の混入を検出しなかった。
LUCK LABのみ「開発版のため販売は未開始です」を検出（上記の通り保留）。この機械的なテキスト検査はブラウザ全画面の目視・ランタイム試験の代替にはならない。

## 状態の解釈
- **PASS**は明記した範囲のみ。Store認証、署名、WACK、購入者のWindows実機インストール完了ではない。
- PrivateのActions失敗は、直近の確認では `runner_id=0`、`steps=0` であり、ソースに問題がないことも、あることも意味しない。
- 公開設定・GitHub課金・Partner Centerの変更は行わない。
- Store ID、Publisher、PFN、Package SID、Versionは正式な画面・canonical sourceを照合し、推測値で補完しない。

## 全体引渡しの必須条件
1. Privateリポジトリ5件についてWindows/NodeのQA実行環境を確保し、SOURCE SHA一致のログ・テスト数・画面キャプチャ・MSIXのSHAを取得。
2. LUCK LABのSHA保護を損なわずUI内の開発中表示を販売版から除くための変更承認と台帳再検証。
3. 8製品の1024x768／1280x720、キーボード・タブ切替・セーブ・クラッシュ/異常入力を実操作で確認。
4. 各製品のOfficial Partner Center IdentityとStore versionが確定した場合に限り、最終署名・WACK・実機QA・Store提出へ進む。提出と公開は別途明示指示が必要。
5. 最終引渡書では、全8製品のHEAD、原始ソース、MSIX/ZIP、SHA256、QA結果、未完了のHOLDを個別に列挙する。
