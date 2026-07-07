# 筋トレログ

React Native (Expo) 製の筋トレ記録アプリ。記録データは**端末内のSQLiteのみ**に保存し、オフライン・機内モードでも動作する(Webアプリにはできない、ネイティブアプリの永続化デモが目的)。

継続を促す仕掛けとして、記録するほど育つドット絵アバター(全10種のコレクション制)を搭載。

## 構成

```
projects/aws-research-06-expo-workout-log/
├── app/            アプリ本体(Expo プロジェクト)
├── avatars/         アバター画像の元データ・変換ツール(アプリ実行には不要)
├── PLAN.md          リリースまでの作業計画
├── MANUAL_STEPS.md  手動作業(Apple/Expo認証など)の手順書
└── FEATURE_PLAN.md  追加機能の計画書
```

## 技術スタック

| 項目 | 選定 |
|---|---|
| フレームワーク | React Native + Expo SDK 57 |
| 言語 | TypeScript |
| 永続化 | expo-sqlite (端末内SQLite) |
| 画面遷移 | @react-navigation (Bottom Tabs) |
| ビルド/配信 | EAS Build + TestFlight |

外部サーバー・バックエンドは無し。全データは端末内のみに閉じている。

## 画面構成

4タブ構成。

| タブ | 役割 |
|---|---|
| ホーム | 育成中のアバター表示、成長度、統計(累計セット/連続記録/トレ日数) |
| 記録 | 種目選択→重量・回数を記録。前回コピー、メモ、インターバルタイマー |
| 履歴 | 過去の記録を日付ごとに一覧。複数選択してまとめて削除できる |
| コレクション | 育てたアバターの図鑑(育成中/コンプ/未開放) |

## データモデル (SQLite)

`app/src/db.ts` で `PRAGMA user_version` によるマイグレーションを管理。

```sql
-- 記録した1セット
CREATE TABLE sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise TEXT NOT NULL,
  weight REAL NOT NULL,       -- kg。自重は0
  reps INTEGER NOT NULL,
  performed_at TEXT NOT NULL, -- ISO8601
  memo TEXT
);

-- 種目マスタ(部位カテゴリごとにユーザーが追加/削除できる)
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,     -- 胸/背中/脚/肩/腕/体幹
  sort_order INTEGER NOT NULL,
  is_builtin INTEGER NOT NULL DEFAULT 0
);

-- アプリ内設定(アバターの進化演出フラグなど)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

継続日数・連続記録(streak)は `sets` テーブルから都度集計する(冗長カラムを持たない)。

## アバター育成の仕組み

- `app/src/creatures.ts` : 10種の生き物のメタ情報(名前・図鑑説明・育成順)
- `app/src/avatar.ts` : 進行ロジック。累計セット数(または日数)を1つの指標にして、
  「卵→幼体→成体」の3段階×10体=30段階を順番に進む。成体になったら次の生き物の卵へ。
  進行ペースは `GROWTH_MODE` / `SETS_PER_STAGE` の2定数だけで調整できる。
- `app/src/creatureData.ts` : 各生き物・各段階のドット絵(32×32、アニメ3コマ)を
  パレット+文字列でエンコードしたデータ。`avatars/` 以下の画像から自動生成している(後述)。
- `app/src/components/PixelCreature.tsx` : `creatureData.ts` を読み、
  3コマを一定間隔で切り替えて描画するだけの軽量コンポーネント(ネイティブ依存なし)。

## アバター画像の生成パイプライン(`avatars/`)

アプリ本体には画像ファイルは含まれず、`creatureData.ts` に変換済みデータが埋め込まれている。
`avatars/` はその元データと変換ツール一式(再生成したい場合のみ使う)。

1. `avatars/source/` に生き物ごとのイラストを置く(卵/幼体/成体 × アニメ3コマ = 1体9枚)
2. `avatars/tools/pixelize.py` で 32×32 のドット絵に変換
   (背景除去→彩度強調→縮小→減色→孤立ピクセル除去→輪郭線→目のハイライト)
3. `avatars/tools/export_data.py` で変換結果を `app/src/creatureData.ts` に集約

```bash
python3 avatars/tools/pixelize.py       # avatars/pixel/ に変換結果を出力
python3 avatars/tools/export_data.py    # app/src/creatureData.ts を再生成
```

## セットアップ・開発

```bash
cd app
npm install
npx expo start --dev-client   # 開発ビルドが入った実機/シミュレータで接続
```

Expo Go は使えない(SDK57がまだ非対応のため)。実機での動作確認には EAS の開発ビルドが必要。
詳しい手順は [MANUAL_STEPS.md](MANUAL_STEPS.md) を参照。

## リリース

```bash
cd app
eas build --platform ios --profile production
eas submit --platform ios --latest   # または Transporter で手動アップロード
```

TestFlightの内部テストでチームに配布する運用。詳細は [MANUAL_STEPS.md](MANUAL_STEPS.md)。
