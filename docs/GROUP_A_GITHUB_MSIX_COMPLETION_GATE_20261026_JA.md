# グループA 9製品 — GitHubでMSIX生成後に最終引継ぎ
最終確認 2026-10-26 / 現段階は作業継続台帳であり「最終引継ぎ完了」ではない。

## 1. 役割を確定
- 本チャット: 指定workブランチで実装・P0エラー修正・P1機能充実・P2初見UI・ソーステスト・Windows Actions・現行HEADのMSIX（可能ならMSIXUPLOAD）生成・Manifest/Source SHA/Artifact SHA照合・最終引継ぎ書。
- MSIX作成後のコード担当: Windows実機インストール/更新/アンインストール・署名と必要な検査・正式Partner Center Identity照合・価格/画像/販売情報・提出と審査。
- 全9製品のGithub上のMSIX候補・証跡が揃うまで最終引渡しをしない。既存のmain/release直接変更、private repo公開、Store提出、Identity推測はしない。

## 2. MSIX状態・確定ソース（各Workブランチ）
| 製品 | GitHub HEAD/作業ブランチ | MSIX候補/実行証拠 |
| --- | --- | --- |
| Small Business Simulator | 855c7275597ce389846b4d742fd45784cfe1e1ef / work/ui-release-review-20261025 | QA_UNSIGNED候補生成済み。Run https://github.com/shihuiarenjinba-png/SmallBusinessSimulator/actions/runs/40257124500、artifact small-business-simulator-msix-internal-candidate-30 |
| Finance Simulation | e9bdbd2002d2f83802fa56543cf7e32badf4fcea / work/ui-release-review-20261025 | QA_UNSIGNED候補生成済み。Run https://github.com/shihuiarenjinba-png/finance-simulation/actions/runs/40257364397、artifact finance-simulation-msix-internal-candidate-22 |
| Night Office Auditor (12 cases) | 03c03d713c7d41242d26ae6de88796b320aa138f / work/unified-qa-20261025 | QA_UNSIGNED候補とWindows UI証跡生成済み。Run https://github.com/shihuiarenjinba-png/NightOfficeAuditor/actions/runs/40257821361、artifact night-office-unified-msix-QA_UNSIGNED-03c03d713c7d41242d26ae6de88796b320aa138f |
| Used Item Shop Simulator | 15b6c73f4957dc72fb77c48ecd22c6f4f9ce61dc / work/ui-handoff-review-20261025 | MSIX workflowを現行作業ブランチで起動したがジョブのステップ0で失敗。Run https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40258721035。失敗ジョブの再実行もステップ0。MSIXなし |
| Factory Inspection Simulator | ad2c7614e277f40c056a6d62b91a26ed4cf90b41 / work/ui-handoff-review-20261025 | MSIX workflow Run https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40258725468 がステップ0で失敗。MSIXなし |
| Handover Room | 88b6262e9509512755f30f8d693c9286bb6e3f7f / work/unified-qa-20261025 | MSIX workflow Run https://github.com/shihuiarenjinba-png/game-new/actions/runs/40258730905 がステップ0で失敗。MSIXなし |
| EKIDEN MANAGER | 5fcbc8b25d69fccd7a20f1c5a077025d20a274a5 / work/unified-qa-20261025 | MSIX workflow Run https://github.com/shihuiarenjinba-png/game-stadium/actions/runs/40258735017 がステップ0で失敗。MSIXなし |
| LUCK LAB | 6cf095c02347148733bae33ca836744022e984d3 / work/unified-qa-20261025 | 保護原本66ファイル無変更。MSIX workflow Run https://github.com/shihuiarenjinba-png/game/actions/runs/40259522627 がステップ0で失敗。MSIXなし。Repo varsのIdentityを推測しない |
| Night Office Auditor - paid 24 cases | 7c77bd70921af1177e0ef04c30afa3744f2596cc / work/paid-24case-integration-20261024 | Store製品用の別本体・MSIX Builder/Manifest/Hash検証・Windows workflowを追加。ただし独立Identityが未確認。MSIX未生成。Source/Game tests成功・HOLD JSONアップロード成功の後、MSIXゲートを明示的にfailureとして停止。Run https://github.com/shihuiarenjinba-png/Night-Office-Auditor-2/actions/runs/40260153047 |

現状は **9製品中3製品のGitHub未署名内部MSIX候補が確認できている**。これは販売審査PASS、正式署名・実機インストール完了を意味しない。

## 3. ブロッカーの解決
### 5製品のWindowsジョブ開始前停止
- 現Work branchからMSIX workflowが起動するように修正済み。いずれもソースのMSIXビルド工程に入る前のステップ0で失敗。
- 根本原因は未確定。リポジトリActions権限、GitHub hosted runner割当、利用枠・請求、Workflowsの実行制約をGitHub管理者の権限下で確認する。事実を確認せず課金・公開設定を変更しない。
- 実行可能になればMSIX生成までGitHub Actionsで完走させ、パッケージとSHA/Manifest/生成HEADを確認。

### Night Office Auditor 24案件の独立Identity
- 低価格版NightOfficeAuditorのPackage IdentityやStore IDを流用しない。新IDを推測してビルドしない。
- Partner Centerの別有料商品ページから取得した正式値をGitHub Actions Repository Variablesに登録する必要がある。必須名は NIGHT_PAID_STORE_ID、NIGHT_PAID_IDENTITY_NAME、NIGHT_PAID_PUBLISHER、NIGHT_PAID_PUBLISHER_DISPLAY_NAME、NIGHT_PAID_STORE_DISPLAY_NAME、NIGHT_PAID_STORE_VERSION、NIGHT_PAID_IDENTITY_OWNER_CONFIRMED（承認された場合のみYES）。
- workflow .github/workflows/paid-msix-candidate.yml を実行。値未確認ならHOLDのJSONをアーティファクトに残してMSIXゲートを失敗にする。値が確認されて初めてx64 MSIXを生成・Manifest/Source SHA/Package SHA検証。
- 24案件ソース・Chromium通しプレイ・Windowsプレビュー成功はMSIX候補生成の代用ではない。

### LUCK LABの個別条件
- Store identity name、Publisher、Publisher Display Nameは既存workflowがGitHub Repository Variablesを要求。実値がない場合はHOLD。
- 特別な保護対象原本66ファイルは変更しない。全7ゲームと購入者向け起動をWindowsで検証する。

## 4. 最終引き継ぎ条件
- 各製品に Repository / work branch / source HEAD /テスト全数/ゲーム本編・初見UI証拠/Windowsジョブ・スクリーンショットを確定。
- 実ファイル .msix（可能なら .msixupload）とArtifact URL・SHA256・Manifest Name/Publisher/Version・ソースHEADの一致を監査。
- MSIX生成後にコード担当の残作業として署名、正式Partner Center照合、実機インストール/更新/削除、WACK/審査前検査、価格/商品画像/説明、Storeアップロード・審査提出を明示。
- P0不具合または未完成の主要ゲーム機能を残したパッケージを「販売可能」と呼ばない。BLOCKED/NOT TESTED/HOLDを明示。
- 改善でsource HEADが更新された場合は古いMSIXを現行版と扱わず、GitHub上で再生成する。

**結論: 現在はGitHub工程継続。完全引継ぎは未実施。**

## 5. 2026-10-26 Runner切り分け（新たな確定事実）
- この9製品をGitHub APIのrepository visibilityで照合：**MSIX成功済み3製品とWindowsプレビュー/ゲームQA成功の24案件版はpublic**。MSIXジョブ開始前に止まるUsed Item Shop / Factory Inspection / Handover Room / EKIDEN / LUCK LABの5製品は**private**。
- [診断Run 40260844037](https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40260844037): privateのUsed Item Shopにソース checkoutなしの最小ジョブ2つ（ubuntu-latest, windows-latest）を新設・実行。両方とも**失敗、0ステップ**。Windows SDK、npm、商品コード、MSIXビルダーではなく、ジョブが始まる前に停止していることを再現した。
- [MSIX Run 40258721035](https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40258721035)は失敗ジョブ再実行（attempt 2）も0ステップで停止。
- GitHub公式「GitHub Actions billing」: public標準ランナーは無料、private hosted runnerはアカウント別の分数・ストレージ無料枠/課金制約を受ける。利用枠消費・未登録支払いなどでブロックし得るが、**本アカウントの実際の請求状態はこのGitHubコネクタで未取得**であり、課金が根本原因と断定しない。
  - https://docs.github.com/en/billing/concepts/product-billing/github-actions
  - https://docs.github.com/en/actions/concepts/billing-and-usage
- 次の管理者確認（リポジトリを公開化しないまま）: GitHub Settings → Billing & licensing → Usage / BudgetsでActions利用枠・予算停止・支払方法の状態を閲覧し、対象Private repositoryのSettings → Actions → GeneralとRunner設定を閲覧する。**この資料は支払い方法登録・課金上限増額を指示または承認するものではない**。
- 次の手段の優先順位: (1) 非公開のままActions実行制限を管理者が解決、(2) 許可された信頼できるWindows self-hosted runnerが利用可能ならその安全運用を別途承認、(3) ローカルWindowsでのMSIX作成は「GitHubで生成」という現在の分担要件を満たさないため、変更承認なしに代替引継ぎ扱いしない。
- 根因が解消したら既存MSIX workflows（現在のWork HEADから起動するよう設定済み）で再ビルドし、ジョブSteps PASS・Artifact実体・Package SHAを確認する。それまでは5製品のMSIXを**未生成**として維持。
