# Windows コード担当への引き継ぎ — UsedItemShopSimulator

GitHubの正本：`https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/tree/feature/commercial-resale-ux-20261018`。
本タブでGitHubソースを改良する。Windows PCのコード担当は**このブランチを新しい独立作業フォルダにチェックアウト**し、Windows実機検証・正規MSIX生成・提出用成果物と試験ログを担当する。既存main/Releaseは変更しない。

## 1. 最初に実施
- `git clone --branch feature/commercial-resale-ux-20261018 https://github.com/shihuiarenjinba-png/UsedItemShopSimulator.git`
- `node --version` を確認（Node.js 20以上）。`npm test` を実行し、全テストの出力と終了コードを保存。
- `index.html` の操作画面を実機で確認。初期画面→数値変更→1回実行→進行→保存→再起動→読込を確認。壊れたセーブを投入し、元JSONが無断上書きされないことを検査。
- 1366×768、1920×1080、100%/125%/150% DPI、キーボード、フォーカス、英数字・日本語ファイル名、音・画面動作、Windows Defenderを確認。
- ユーザーのセーブが入った既存環境で危険な更新テストをしない。独立テスト用Windowsプロファイルを使う。

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

※現在はソース候補段階。正式Identity未確認・GUI/正式MSIX/WACK未実施のため商用販売はHOLD。
