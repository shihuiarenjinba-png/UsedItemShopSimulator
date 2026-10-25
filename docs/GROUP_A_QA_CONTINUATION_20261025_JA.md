# Group A — 8製品QA 続行結果（2026-10-25）

この資料は **GitHubの実作業記録** であり、購入者向けUIには表示しない。Store認定・公開は実施していない。

## 検証範囲とPASS条件
- SOURCE：指定HEADと対応する全自動テスト結果がPASS。
- UI：1024×768 / 1280×720、実際の画面、タブ切替・必要操作・保存復元・JSエラーゼロ・内部開発文言なし。
- PACKAGE：指定HEADを入力に未署名 x64 MSIXおよびMSIXUPLOADを生成しManifest/SHAと対応させる。
- STORE：Publisher/Store ID/PFN/Version公式照合、署名、WACK、Windows実機インストール・保存・更新、認定提出。**全製品HOLD**。

## 公開3製品 — SOURCE/UI/PACKAGE 内部検査PASS
| 製品 | HEAD | 証跡 | 注意点 |
|---|---|---|---|
| Small Business Simulator | `f59e5cf3bbc682cf2582d656a896843509e9f446` | source46/46・browser [40150366236](https://github.com/shihuiarenjinba-png/SmallBusinessSimulator/actions/runs/40150366236)・unsigned MSIX [40155329506](https://github.com/shihuiarenjinba-png/SmallBusinessSimulator/actions/runs/40155329506) | Store署名等は未実施 |
| Finance Simulation | `682c050d05d53238caf7d4de66163fabb3e48a59` | source29/29・browser [40150154643](https://github.com/shihuiarenjinba-png/finance-simulation/actions/runs/40150154643)・unsigned MSIX [40150597697](https://github.com/shihuiarenjinba-png/finance-simulation/actions/runs/40150597697) | Browser QAとMSIX sourceの間の追加変更はworkflowだけ。Store署名等未実施 |
| Night Office Auditor (低価格版) | `6399083d05d35b639d17addaa778772702c9545d` | source42/42・Windows Electron 4PNG・unsigned MSIX 同一run [40155379054](https://github.com/shihuiarenjinba-png/NightOfficeAuditor/actions/runs/40155379054) | Store署名等未実施 |

## Private5製品 — QAスクリプト・画面チェック準備済み、実行HOLD
| 製品 | 最新作業HEAD | 最新Run | 実行 |
|---|---|---|---|
| Used Item Shop Simulator | `3bb0598517855b9edb0dd189f133410794344b8e` | [40156814535](https://github.com/shihuiarenjinba-png/UsedItemShopSimulator/actions/runs/40156814535) | Runner ID=0 / steps=0 |
| Factory Inspection Simulator | `66815da7515eb48060b347b924d9e5bb09200f3f` | [40156821260](https://github.com/shihuiarenjinba-png/FactoryInspectionSimulator/actions/runs/40156821260) | Runner ID=0 / steps=0 |
| Handover Room `game-new` | `a675dbc28743ef42ebaa119c8a31031f8214e7d5` | [40156827858](https://github.com/shihuiarenjinba-png/game-new/actions/runs/40156827858) | Runner ID=0 / steps=0 |
| EKIDEN MANAGER `game-stadium` | `b66a50b8ab9f44ebd978ef33ccbf8e29ba8362d0` | [40156834735](https://github.com/shihuiarenjinba-png/game-stadium/actions/runs/40156834735) | Runner ID=0 / steps=0 |
| LUCK LAB `game` | `743882d125c531ef4739c40e0a819ad225c8ee7d` | [40156960559](https://github.com/shihuiarenjinba-png/game/actions/runs/40156960559) | Runner ID=0 / steps=0 |

上記は **未実行** であってソース不具合の証拠ではない。Runnerを待ち、テスト実行後にのみPASS/FAILを確定する。

## 追加実装：LUCK LAB販売用開始画面
- 元の `index.html` は**66ファイルのv85 SHA原本台帳で保護**され、変更禁止。
- 新しい `store-entry.html` を作成。元原本から「開発版のため販売は未開始です。」の1文だけ削除。
- `desktop/main.cjs` のWindowsアプリ起動先は `store-entry.html`。
- `scripts/prepare-msix-config.cjs` のパッケージファイル選択に `store-entry.html` を含め、旧 `index.html` は**製品MSIXペイロードから除外**。原本はGitHubに残る。
- `desktop/smoke.cjs` と `tests/store-entry.test.cjs` を追加/更新。64ビットMSIXのIdentityは確定していないのでビルド開始していない。
- GitHub compare（保護作業の直前HEAD `c67fa84...` → 現HEAD）で **SHA保護66件の変更は0件**。
- 新規QA JS5本とLUCK追加テストJSの**静的構文検査はPASS**。**実行時テストはRunnerが割り当てられないためHOLD**。

## 私有5製品のQA基準強化
同じ `scripts/unified-ui-qa.cjs` が存在し、各 `scripts/unified-ui-qa-config.json` に製品特有の条件を設定。
- Used Item Shop：7タブと表示パネル。
- Factory Inspection：4タブと表示パネル。
- Handover Room：2タブと表示パネル。
- EKIDEN MANAGER：5タブと表示パネル。
- LUCK LAB：7つの盤面、別売用開始画面、開発中表示ゼロ。
- 各製品で1024/1280画面、通信アクセス、JS例外、タブ操作を検査。結果JSON/PNGが出た場合だけ合格記録。

## 次の依存事項
1. **非公開ActionsのRunner割当問題**。今回も全5件に同じ再現結果があり、コードの成否を示さない。無断でPublic化・支払方法変更・課金設定変更を行わない。
2. Runnerが利用可能になったら、同じ作業HEADで `unified-ui-gate.yml` を完走させる。
3. 候補MSIXは正式なPartner Center Identity・承認状態を確認した上で、コードHEAD一致・パッケージSHAを記録して作成する。
4. ストア公開前の署名・WACK・Windowsインストール/更新/保存QAと認定提出は別の作業（すべて現時点HOLD）。
5. その他の状態を誤って「全8製品検証完了」「LUCK LAB発売準備完了」と表現しない。

**main/release・Repo公開範囲・GitHub課金・Partner Centerは変更なし。**
