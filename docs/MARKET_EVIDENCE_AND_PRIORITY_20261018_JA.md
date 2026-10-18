# 市場根拠から見た買い切りオフライン作品の商用品質優先順位
調査基準日: 2026-10-18。主要比較市場: PC Steam。Microsoft Storeのジャンル別実販売本数は取得できていない。

## データの読み方
- 「販売本数・売上」の数字は原則**第三者による推定値**。実売上の証明ではない。
- Steamレビュー数・好評率は公開された消費者反応のシグナル。ただしレビュー数そのものは販売本数ではない。
- 類似大ヒット作品には制作費・3D品質・マーケティング・配信者効果の差がある。当社の小規模なオフラインGUI作品への売上移転を保証しない。
- 成功例だけでなく**低調な同ジャンル例**も調べ、差別化の必要性を明示する。

## 同じジャンルの具体的な実例
| 比較タイトル | 公開根拠 | 指標の意味 |
| --- | --- | --- |
| TCG Card Shop Simulator | https://app.sensortower.com/vgi/game/tcg-card-shop-simulator | 約300万本の**推定販売本数**。2024年のゲーム。店内の仕入・在庫・値付け・成長。実売上の証明ではない。 |
| Supermarket Simulator (Nokta Games) | https://steamdb.info/app/2670630/info/ | 2026-10-12時点でSteamレビュー約8.4万件・好評率約91%。棚補充・仕入・スタッフ・店舗拡張を含む。ただし高品質3D系であり制作規模が違う。 |
| Dealer's Life 2 | https://indielist.games/games/dealer-s-life-2-1343670 | 約4,000レビュー・85%好評、レビュー起点の**推計84,000〜196,000本**。査定・売り手との交渉がゲームの核。 |
| The Case of the Golden Idol | https://steamdb.info/app/1677770/charts/ | Steamレビュー約1.1万件・好評率約95%（2026-08時点）。論理的な証拠探索・事件のつながり。 |
| Big Ambitions | https://steamdb.info/app/1331550/ | 2026-10初頭時点でレビュー約1.4万件。事業を育てて拡張する長期目標。 |
| Luck be a Landlord | https://steamdb.info/app/1404850/ | 約1.1万レビュー・約91%好評。単純なスロット風UIではなく**ローグライクな相乗効果・資金制約**を楽しむゲーム。 |
| The Invisible Hand | https://store.steampowered.com/app/628200/The_Invisible_Hand/ | 約500購入レビュー。金融ゲームに市場はあるが、店舗経営ジャンルの大作と同程度の需要があるとは言えない。 |
| Trading Card Shop Simulator（別作品） | https://app.sensortower.com/vgi/game/trading-card-shop-simulator | 推計752本、45.7%好評。類似タイトル・ジャンルだけで成功しない反例。 |

## 商用品質の開発優先仮説
1. **UsedItemShopSimulator — 高:** `Dealer's Life 2` との共通核は売り手との駆け引き。**今回、シード固定で一日1回の買取提示・成立/不成立・仕入原価反映を実装。** UIは既存3ステップを維持。次は商品固有の真贋鑑定、品種拡張、売却相手のタイプ、店の拡張、長期ミッション。現金台帳と旧セーブは必ず回帰テスト。
2. **NightOfficeAuditor — 高:** `Golden Idol` の示す需要は単なる書類入力ではなく**プレイヤーが証拠をつなげて結論を導く体験**。案件間の伏線、矛盾の発見、解けた瞬間の演出を優先。単なる背景テキストの水増しは不要。
3. **SmallBusinessSimulator — 中〜高:** `Supermarket Simulator` `Big Ambitions` の長期目標は参考。ただし本作を3Dの同等商品として売り込まない。店舗拡大で商品構成・人員・資金配分が段階的に変わる仕組みを先に完成。
4. **FactoryInspectionSimulator — 中:** `Contraband Police`（https://store.steampowered.com/app/756800/Contraband_Police/）のような検査・判断ゲーム需要はあるが、検問3Dと工場経営では違う。数値を選ぶだけでなく、実際の欠陥・証拠をプレイヤーが発見する演出が必要。市場の直接的証拠は弱め。
5. **finance-simulation — 暫定中〜低:** `The Invisible Hand` は有料ゲームとして成立しているが大規模ヒットを証明するデータではない。金融グラフだけを増やさず、具体的な勝利/失敗ミッションと経営判断を先行。
6. **LUCK LAB — 原本HOLD:** `Luck be a Landlord` の例は運・数字とゲーム内相乗効果への需要を示すが、そのままスロット機械・カジノ体験の市場性やストア審査適合性を示さない。原本SHAの確定と年齢・模擬賭博表示の確認が先決。

## 現時点の販売提案の限界
上記は**開発優先仮説**であり、販売期待本数・価格・利益予測ではない。Microsoft Storeでの作品別実売本数、表示回数、購入率がない以上、Steamの大ヒット数値を本作の売上に流用しない。

商用完成判定にはMicrosoft Storeの商品写真、初回15分以内の判断の分かりやすさ、長期プレイでの新要素、クラッシュ/セーブ互換、Windows MSIX/WACK、実際の販売結果が必要。実績が取れたら優先度と価格を更新する。