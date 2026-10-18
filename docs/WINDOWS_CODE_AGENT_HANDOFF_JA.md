# Windows コード担当への引き継ぎ — UsedItemShopSimulator

GitHubの正本：`https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/tree/feature/onboarding-debt-workshop-spec-20261018`。
本タブでGitHubソースを改良する。Windows PCのコード担当は**このブランチを新しい独立作業フォルダにチェックアウト**し、Windows実機検証・正規MSIX生成・提出用成果物と試験ログを担当する。既存main/Releaseは変更しない。

## 1. 最初に実施
- `git clone --branch feature/onboarding-debt-workshop-spec-20261018 https://github.com/shihuiarenjinba-png/UsedItemShopSimulator.git`
- `node --version` を確認（Node.js 20以上）。`npm test` を実行し、全テストの出力と終了コードを保存。
- `index.html` の操作画面を実機で確認。通常買取、低値提示時の成功/失敗、失敗後の見送り/事前承認済みの希望額・上乗せ購入、各々の現金と原価の変化を検査。
- 店頭価格の変更で予想販売数量が変わるか、売れ残りの摩耗・価格維持・修理効果、21日以降の中古車出現を長期試遊する。数値変更だけでセーブされないことを確認。
- 倉庫仕入→修理台（完了待ち）→倉庫→売場の3ステップUIを実操作。来客が0人の日、客が複数来る日、各人物が最大1点購入すること、商品が勝手に売場に出ないことを確認。
- 設備1→2の¥65,000投資、修理台の同時処理枠と9%修理費、家賃/将来保管費/機材費を含む採算目安、入力した販売価格の警告を検査。
- 売場上限8点を超える旧JSON（最大18点）は超過分を倉庫へ移すこと。破損セーブを無断上書きしないこと。旧JSON→営業→保存→再起動→読み込みを検証。
- 1366×768、1920×1080、100%/125%/150% DPI、キーボード、フォーカス、英数字・日本語ファイル名、音・画面動作、Windows Defenderを確認。
- ユーザーのセーブが入った既存環境で危険な更新テストをしない。独立テスト用Windowsプロファイルを使う。

## 追加検証：開業モードの固定とリセット

- 新規起動では営業画面を操作できず、「誰のお金で始めるか」の画面で選択・開業してから進行できること。
- イージー、ノーマル、ハード各モードで保存→アプリ再起動→同じモード、残元金、利息、返済履歴が戻ること。
- ハード30・60営業日後の利息計上、返済時の利息優先充当、過払い拒否、家賃資金の説明を確認。
- 「最初からやり直す」で前のセーブがバックアップされ、モード選択が再表示されること。**新しいゲームを開始しなくても、開業画面から前のプレイを復元できること。**
- 旧セーブには強制的な借入を導入しないこと。資金・返済の「？」ヘルプや、買取・倉庫・営業ガイドが表示されること。
- 詳細：`docs/FINANCE_MODE_IMPLEMENTATION_20261018_JA.md`。

## 2. MSIXをGitHubの専用ブランチに実装
- HTML/JSのソースと保存形式を維持しながら、セキュアなElectron等のデスクトップホストを追加（`nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, 不要な外部通信禁止）。
- 正式なMicrosoft Partner Centerの当該作品専用Identity Name、Publisher、Version、ロゴを照合。ほかのアプリのIdentityは流用しない。
- Store提出方式に一致した本物のMSIX/MSIXUPLOADを生成。EXE、ZIP、単なるAppXリネームは代用不可。
- Windows App Certification Kitを実行し、XMLの実測結果、Package Identity、インストール・起動・保存復元・更新・アンインストールを記録。MSIXの署名済み配布とStore署名は区別する。
- 変更はこの作品専用ブランチ（または当該ブランチから切った別作業ブランチ）に限る。main、別作品、実ユーザーのセーブを上書きしない。

## 3. このタブへ返す証跡
- 正確なコミットSHA、`npm test` の全結果、Actions run ID
- ビルドしたMSIXのファイル名、SHA256、Manifest Identity/Publisher/Version
- Windowsテスト画像・実操作結果、WACK XML、更新・削除後の保存/残留結果
- 未合格の項目と原因、修正差分（直していない項目をPASSにしない）

- ゲームバランスと係数の出典・未検証部分は `docs/VISITOR_WAREHOUSE_PRICING_MODEL_20261018_JA.md` を参照。63件の独立JavaScriptテスト成功は正式Node CI合格ではない。

※現在はソース候補段階。正式Identity未確認・GUI/正式MSIX/WACK未実施のため商用販売はHOLD。
