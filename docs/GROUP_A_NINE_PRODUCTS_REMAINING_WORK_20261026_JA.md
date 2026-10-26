# グループA 8製品＋深夜監査室有料版｜実装・エラー再監査と残作業（2026-10-26）

## 0. 販売方針と本書の状態
**原則9製品とも有料販売を目標**とする。完成後に内容が明らかに軽量だと判明した商品だけ、ユーザーが無料化を別途決定する。未完成を無料化で解決しない。

本書は**販売完了/最終コード担当引継ぎの合格証ではない**。P0 (保存破損・進行不能・計算矛盾)、P1 (有料ゲームの全主要機能・通しプレイ)、P2 (初見UI・アクセシビリティ) を証拠つきで確認後、最終Windows/MSIX検証と正式Store照合を行う。

GitHubの修正はすべて個別のworkブランチ。main/release、既存Store ID、Publisher、PFN、公開状態、請求設定の変更は行っていない。

## 1. 9製品の状態（2026-10-26確認）

| 製品 / repo | 作業ブランチ / 確認したコードHEAD（本書作成前） | 新しい確認事実と現在の停止ゲート |
| --- | --- | --- |
| Small Business Simulator / SmallBusinessSimulator | `work/ui-release-review-20261025` / `651b89b2701ccd9442d4b37e061a896ea41fe1f3` | ソース回帰と未署名内部MSIX生成が現HEADでPASS [Run 40253364845](https://github.com/shihuiarenjinba-png/SmallBusinessSimulator/actions/runs/40253364845)、artifactsあり。保存失敗時のimport/reset保護を修正・追加2テストPASS。**P1店舗拡張、長期バランス、第三者試遊、Store実機QAは未完。正式販売HOLD** |
| Finance Simulation / finance-simulation | `work/ui-release-review-20261025` / `682c050d05d53238caf7d4de66163fabb3e48a59` | 未署名内部MSIX候補 [Run 40150597697](https://github.com/shihuiarenjinba-png/finance-simulation/actions/runs/40150597697) PASS。流動ポートフォリオ120営業日。実機セーブ/日本語UIと入力/長期バランス・Store最終QA未完。販売HOLD |
| Night Office Auditor 12案件 / NightOfficeAuditor | `work/unified-qa-20261025` / `5053b132fa9016bad8c3f790062d1625f48b74cc` | ソース・Windows Electron実画面 (1280×720/1024×768)・未署名MSIX [Run 40252834959](https://github.com/shihuiarenjinba-png/NightOfficeAuditor/actions/runs/40252834959) PASS。import/reset保存失敗保護を修正。内容の深さ/第三者試遊/実機インストール等が未完。低価格での**有料候補**、無料と確定しない |
| Used Item Shop Simulator / UsedItemShopSimulator | `work/ui-handoff-review-20261025` / `13b096b58a5835bfacb8611e523a2d9aa791ef7c` | 取引・時計・ゲーム本体・バックアップの原子性を強化。V8仮想DOM 15/15 PASS。READMEの古い閉店時取引説明を最新リアルタイム来客仕様へ更新。Actions [Run 40254136634](https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40254136634) は実行ステップ0件。Windows QAと有料ゲーム内容/演出の完成、Store MSIX未完 |
| Factory Inspection Simulator / FactoryInspectionSimulator | `work/ui-handoff-review-20261025` / `fcb5eb972a66f559d35744255c1346b93e97726b` | 保存成功前に出荷・import・resetを確定しない修正。V8エンジン16/16、仮想DOM 9/9 PASS。Actions [Run 40253496096](https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40253496096) は実行ステップ0件。P1達成要素/長期運営/実機・MSIX未完 |
| Handover Room / game-new | `work/unified-qa-20261025` / `3f84d110539718659ac91019b834601e5da27722` | 破損セーブの原文保護、通常選択・推理の戻り・別事件・リセットの保存前コミットを改善。「試作版」の購入者向け結末文言を除去。静的ソース回帰2件PASS。Actions [Run 40253671393](https://github.com/shihuiarenjinba-png/game-new/actions/runs/40253671393) は実行ステップ0件。物語の全分岐/エンディングの実機QA未完 |
| EKIDEN MANAGER / game-stadium | `work/unified-qa-20261025` / `883f9fde4285c75b866c8c91caad1b25d83466ef` | V8エンジン35/35 PASS、8シーズン。Actions [Run 40246762217](https://github.com/shihuiarenjinba-png/game-stadium/actions/runs/40246762217) は実行ステップ0件。購入者UIの動的JP/EN未翻訳、順位予想の販売規約確認、Windows QA/MSIX未完 |
| LUCK LAB / game | `work/unified-qa-20261025` / `34f57d6ad5cc714ac1069d4b3d8129c98227e9f2` | 既存ゲームルールのV8検査PASS（v82 40,024内部チェック / 信用回復34 / v85 15,000シナリオ）。保護原本66ファイルは変更なし。Actions [Run 40246820680](https://github.com/shihuiarenjinba-png/game/actions/runs/40246820680) は実行ステップ0件。7ゲーム全操作、年齢/内容区分、Store包装・実機未完。元HTMLの初期文言「試作版」は起動後JSで差替えられるが、実機/パッケージで視認されないか確認要 |
| 深夜監査室有料24案件 / Night-Office-Auditor-2 | `work/paid-24case-integration-20261024` / `ca71b4f8217858f036207f535a4ff92b7b8459b9` | [Run 40253232593](https://github.com/shihuiarenjinba-png/Night-Office-Auditor-2/actions/runs/40253232593) ソース＋Chromiumで24案件通しプレイ/保存・復元PASS。[Run 40253232587](https://github.com/shihuiarenjinba-png/Night-Office-Auditor-2/actions/runs/40253232587) Windows x64プレビュー起動とUI記録PASS。出荷前の証拠調査/判定の保存順を修正、3データセット（本体・メモ・聞取り）の読込・新規開始で失敗時ロールバック追加。実処理を使ったV8失敗注入3/3 PASS。**Store MSIXは未作成、低価格版と別の正式Identity確認も未完** |

## 2. 実際に行った検証の種類を区別する
- GitHub Actions **成功**: 上表のSmall Business Simulator (MSIX), Finance Simulation (MSIX), Night Office Auditor 12件 (Windows UI/MSIX), Night Office Auditor有料24件 (本編ブラウザ/Windowsプレビュー)。いずれも対応する記載HEADでの成功。
- V8スタンドアロン: GitHubから実ソース/テストを取得し、`node:test` やDOM/保存領域だけを模擬して実行。**ネイティブNode.js・Playwright Windows/実機・WACKと同一ではない**。
  - Used Item Shop Simulator 15/15、Factory Inspection Simulator エンジン16/16と模擬UI 9/9、EKIDEN MANAGERエンジン35/35、Handover Room静的回帰2/2。
  - Small Business Simulator エンジン14/14、保存読込の失敗注入2/2。Finance Simulation V8 12/13（残り1件はテスト補助のファイル読込不足で未判定、**FAILとは判定しない**）。Night Office Auditor 12件 エンジン13/13＋模擬UI10/10。Night Office Auditor有料24件 エンジン5/5、失敗注入3/3。
  - LUCK LAB は前記の個別ルール・債務・物語検査がPASS。実UIの7ゲーム通し操作ではない。
- Actions **失敗**: 未達5製品（Used Item / Factory / Handover / EKIDEN / LUCK）は確認した最新Runでジョブ実行ステップ0件。コード失敗の証拠とは解釈しない。Runner / billing / GitHubアクセスの原因は根拠が足りず未確定。課金設定や公開/Private設定を変更しない。
- パッケージ候補はソースHEADとSHA台帳が一致するものだけ採用する。**QA_UNSIGNEDは販売用署名済みの意味ではない**。

## 3. 完成までの優先順位（今後の作業）
### P0：検証と保存の安全
1. 5件のRunner停止は、Windowsコード担当に現行ブランチの `scripts/run-all-five-private-qa.ps1` を新規Workspaceで実行してもらい、`GROUP_A_FIVE_QA_SUMMARY.json`・各 `LOCAL_QA_HANDOFF.json`・PNG・SHA・`npm test` 実ログを受領。Private認証は事前確認。
2. 9作品それぞれ、保存失敗・破損セーブ・旧セーブ・再起動・操作不能・不正入力・空在庫や資金不足の境界を本編で再現して修正。
3. 12案件版と有料24案件版の正規セーブ形式を混同しない。LUCK LABの66保護ファイルは無断変更しない。

### P1：有料作品としての完成
- Small Business：店舗成長/スタッフ育成・品質投資・イベントの深み、年単位のバランス。
- Finance：架空資産の買付/売却/借入/返済、120営業日、危機時/終盤の進行、推移の説明。
- Night 12：手掛かりの根拠/推理・伏線・12案件の周回評価。
- Used Item：買取・修理・陳列・客の選択・月末返済を180営業日で検証し、操作と人物演出を改善。
- Factory：受注→出荷→信用と資金→達成条件の90日通し、成長要素/ゲーム性。
- Handover：選択/根拠/戻り・複数分岐/別事件・終了から再開まで。
- EKIDEN：練習/編成/レース/年度経営の8シーズン、翻訳とゲームバランス。
- LUCK：全7ゲーム、架空チップ・負債・回復と保存の整合性、表示/年齢区分。
- Night 24：24案件の第三者プレイ、証拠の納得感、3案件の深い推理方式と本編24案件との機能差を説明・評価。完成した本編がないとStore提出不可。

### P2：購入者UI
- 1280×720と1024×768、DPI100/125/150/200%、初回起動、キーボード/マウス、結果と次アクション、障害時の復旧説明を確認。
- 開発/QA/HOLD/内部パスを商品UIへ出さない。日本語・英語の切替を提供する製品では動的文言まで確認。
- プレイヤーが操作できる画面のスクリーンショットと5分/30分/全編の試遊メモを残す。初見第三者テスターによる迷いの確認が必要。
- 他製品の商標画像や既存UIを複製せず、素材と権利確認。

### MSIX / Store
- P0/P1と操作妨害P2の未達が解消した製品から、最新ソースに一致するMSIX/MSIXUPLOAD、ManifestとSHA-256を検証。
- Partner CenterのStore ID/Package Identity/Publisher/PFN/Versionを実値で照合、署名/更新/アンインストール/実機WACK・必要な年齢区分・規約・価格・説明・画像を揃える。
- 正規Identityを推測しない。実機インストール/署名/Store審査を自動PASS扱いしない。

## 4. 次工程の責任分担・引渡し判定
本チャット側は、指定workブランチ内のGitHubコード/テスト/CI/リリース資料を編集し、証拠を検証する。コード担当は許可済みWindows PCの実機操作、正式Partner Center IDの照合、署名と提出作業を担当する。

**現時点の結論: 9製品とも開発継続のための引継ぎは可能。ただし最終的な完成品としての販売引渡しは全件HOLD。** これを変更するには、各製品のP0/P1/P2/Windows/MSIX/Store Identityの証跡を揃えた個別合格判定が必要。
