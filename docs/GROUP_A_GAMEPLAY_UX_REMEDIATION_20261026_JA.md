# グループA（9製品）有料販売を目指す機能・遊びやすさ改善台帳
更新: 2026-10-26 / 状態: **開発中、最終販売引渡しHOLD**

## 1. 原則
- 9作品とも有料版を目標とする。明らかに内容が軽量な作品だけ、完成度検証後に無料化を検討。
- 完成の判定はエラー・セーブ保護（P0）だけでは足りない。初見の遊び方、判断の楽しさ、序盤〜終盤の進行、やり直し、UIの分かりやすさ、Windowsでの実操作（P1/P2）を必須にする。
- マイナーチェンジで旧セーブの無断変換・消去、製品Identityの推測、保護ソースの書換えをしない。
- 以下の各成功は、その段階の成功だけ。署名、実機インストール、WACK、Partner Center提出を通過したという意味ではない。

## 2. 今回GitHubに実装した改善と回帰
| 製品 | 実施したユーザー体験・エラー改善 | HEAD / 検証 |
| --- | --- | --- |
| Small Business Simulator | 営業結果の赤字/売れ残り/品切れ/期限切れ別「次の一手」。営業日を保存できなければ売上・在庫・日付を確定しない。 | `855c7275597ce389846b4d742fd45784cfe1e1ef`、追加3テストをV8模擬環境でPASS。[MSIX内部候補＋ソース検証 Run 40257124500](https://github.com/shihuiarenjinba-png/SmallBusinessSimulator/actions/runs/40257124500) 成功、artifact `small-business-simulator-msix-internal-candidate-30` |
| Finance Simulation | 資産ゼロ/借入中/現金不足/120日完走の次の行動案内。買えない/売れない数量を見積り段階で表示しボタン制限。借入・返済の上限案内。セーブの読み込み/初期化で元のバックアップを保持する書込み・復元。 | `e9bdbd2002d2f83802fa56543cf7e32badf4fcea`、追加3テストV8 PASS。[MSIX内部候補＋ソース検証 Run 40257364397](https://github.com/shihuiarenjinba-png/finance-simulation/actions/runs/40257364397) 成功、artifact `finance-simulation-msix-internal-candidate-22` |
| Night Office Auditor（12案件） | セーブ読み込み・やり直し前の前回セーブを保管し、詳細画面から前回の進行に戻る操作を追加。証拠調査・判断の確定は保存成功後に限定。古い実装順序を検査していたテストを正しい順序に更新。 | `03c03d713c7d41242d26ae6de88796b320aa138f`。模擬UI12/12 PASS。[Windows UI/未署名MSIX＋ソース検証 Run 40257821361](https://github.com/shihuiarenjinba-png/NightOfficeAuditor/actions/runs/40257821361) 成功、artifact `night-office-unified-msix-QA_UNSIGNED-03c03d713c7d41242d26ae6de88796b320aa138f` |
| EKIDEN MANAGER | 練習/合同練習/レース/年次決算で保存失敗時はゲーム状態を巻き戻す。読込/初期化もディスク保存後に状態反映。購入者UIの「OFFLINE ALPHA」を消す。 | `152886657db25c86a4de68e98e52e3952e585078`、新規4テストV8模擬操作PASS。Actions [Run 40256936355](https://github.com/shihuiarenjinba-png/game-stadium/actions/runs/40256936355) はジョブ開始前に失敗（ステップ0）。Windowsは未実施 |
| Factory Inspection Simulator | 見逃し不良・納期超過・赤字/黒字ごとの「次の改善」。 | `669b348384d3dae19dd98b61f27480b53b2e4971`、追加の結果助言5テストV8 PASS。Actions [Run 40257977613](https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40257977613) はステップ0。Windows未実施 |

## 3. 継続対象（過去の修正を維持、今回の追加ゲーム機能完成は未確認）
| 製品 | 最新確認HEAD | 改善すべき内容・QA重点 |
| --- | --- | --- |
| Used Item Shop Simulator | `cfb5dcdcafad5f27d8438ba0962c3495b219a943` | 15分営業×複数日で来客・交渉・修理・販売・月末返済、進捗の見える演出、画面内の誘導、Windowsブラウザ本編。購入者の期待に沿うキャラクター表現 |
| Handover Room | `3f84d110539718659ac91019b834601e5da27722` | 全選択分岐、物語のボリューム、誤選択からの復旧、終幕と次の事件への継続、保存失敗防止。Windows実操作 |
| LUCK LAB | `34f57d6ad5cc714ac1069d4b3d8129c98227e9f2` | 保護原本66ファイルのSHAを守り、7ゲームすべての演算と操作・架空クレジットの整合性をブラウザ/Windowsで確認。Store年齢区分と内容ポリシーを確認 |
| 深夜監査室24案件有料版 | `ca71b4f8217858f036207f535a4ff92b7b8459b9` | 24件の推理と伏線の奥行き、3案件の詳細推理サブモードとの機能差、初見試遊と複数周回、Windowsでの正式Store MSIX・固有Identity。24案件Chromium通しプレイとWindowsプレビューは成功済みだが商用最終QA未完 |

## 4. 実行すべき次の改善工程
1. **P0**: 残る5製品のWindows QAは、コード担当のWindows PCにて、`UsedItemShopSimulator/scripts/run-all-five-private-qa.ps1` を新規Workspaceで実行（Privateアクセス、Node.js 22以上、Chromium使用）。現在5製品のActionsの失敗ステップ数は0で、コードのPASS/FAILとは別。記録は `GROUP_A_FIVE_QA_SUMMARY.json`・各 `LOCAL_QA_HANDOFF.json`・PNG・ソースSHA。
2. **P1**: 製品ごとに「最初の5分・30分・終盤/完走・2周目」をプレイ。操作ルール・目標・結果・面白さ・分岐・失敗からの復帰を第三者にも見てもらい、仕様に書いてある機能だけを販売ページに記載。
3. **P2**: 1024×768/1280×720、DPI100/125/150/200%、キーボード、エラーや保存成功表示、画面外のボタン、JP/EN動的文言。顧客UIにQA/開発/内部パス等を出さない。
4. **パッケージ**: P0/P1/P2合格後のHEADからMSIX/MSIXUPLOADを生成し、SHA/Manifest/正式Identity照合。署名、WACK、実機インストール・アップデート・セーブ復元を完了後、コード担当がPartner Center提出。

## 5. 引渡しの判定
- 上記のソーステスト・未署名MSIX・Windowsプレビューは前進したが、**9製品の正式な販売用最終引渡しはまだ0件**。
- 最新HEADの品質・ゲーム完成度と正式Storeエビデンスが揃うまで全件HOLD。
