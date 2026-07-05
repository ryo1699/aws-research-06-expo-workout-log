# アバター画像の作成フロー

「画像を用意 → 16×16 / 32×32 のドット絵に変換 → レビュー」用の作業場所。
**実装はまだ行わない。** ここでドット絵を確定させてから、コード反映は別途指示で行う。

## フォルダ

- `source/` … 元イラスト(PNG/JPG)を置く。ファイル名 = 生き物のキー（例 `slime.png`, `dragon.png`）
- `pixel/`  … 変換後の成果物(自動生成)
  - `<name>_16.png` / `<name>_32.png` … 実サイズのドット絵
  - `<name>_16x10.png` / `<name>_32x10.png` … 拡大プレビュー
  - `<name>_32.json` … 実装用の色グリッド
  - `contact_sheet.png` … 全体一覧
- `tools/pixelize.py` … 変換スクリプト

## 変換の実行

```
python3 avatars/tools/pixelize.py            # 16色に減色
python3 avatars/tools/pixelize.py --colors 24
```

## ⚠️ AI画像生成について

現在の作業環境には AI 画像生成ツールが接続されていないため、Claude 側で
「イラストをAI生成する」ことはできない。元イラストは以下のいずれかで用意する:

- **ユーザーが画像生成AI(ChatGPT/Midjourney/Bing 等)で作って `source/` に置く** → Claude が変換
- もしくは Claude が手描きドット絵を用意する（AI生成なし・品質は限定的）

## 生成AIに渡すおすすめプロンプト(共通スタイル)

> a cute chibi pixel-art style mascot of a **<CREATURE>**, front view, big head,
> simple flat colors, thick dark outline, centered, plain solid white background,
> full body, game sprite, no text

`<CREATURE>` を各生き物に置き換える(育成順):

| ファイル名 | 生き物 | CREATURE(英) |
|---|---|---|
| slime.png | スライム | green slime |
| kitsune.png | 九尾の狐 | nine-tailed fox spirit (kitsune) |
| pegasus.png | ペガサス | white winged horse pegasus |
| unicorn.png | ユニコーン | unicorn with golden horn |
| griffin.png | グリフォン | griffin (eagle-lion) |
| golem.png | ゴーレム | rock golem |
| kraken.png | クラーケン | purple kraken octopus |
| phoenix.png | フェニックス | fiery phoenix bird |
| kirin.png | 麒麟 | qilin / kirin |
| dragon.png | ドラゴン | green dragon |

背景は白 or 透過。1体1ファイル。正方形に近いほどきれいに変換できる。
