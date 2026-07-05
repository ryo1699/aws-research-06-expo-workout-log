# aws-research-06: Expo 筋トレ記録アプリ — TestFlight リリース計画

## 課題要件

- Flutter または React Native でアプリ作成(→ **React Native + Expo** を採用)
- 題材: **筋トレ記録アプリ**(機能はシンプルでよい)
- データの永続化: **端末内(アプリ内)での永続化**が必須要件(Web アプリでは不可能な点がこのアプリの特徴)
  - クラウド(DynamoDB / Firebase)はオプション → 今回は**ローカルのみ**で実装
- ゴール: **TestFlight でリリースし、テスターに権限付与(招待)する**
- Apple Developer Program を使用

---

## 役割分担の全体像

> 👤 の作業の**具体的なクリック手順・入力内容**は [MANUAL_STEPS.md](./MANUAL_STEPS.md) に詳細をまとめてある。実際に手を動かすときはそちらを見ること。

作業は3種類に分かれる。

| 記号 | 誰がやるか | 内容 |
|---|---|---|
| 👤 **自分** | ブラウザ・iPhone・App Store Connect の**UI 操作** | アカウント登録、支払い、テスター招待、実機での動作確認。Claude Code からは操作できない部分 |
| 🤖 **Claude Code** | **コード・CLI・設定ファイル** | アプリ実装、プロジェクト設定、ビルド・提出コマンドの実行 |
| 👥 **共同** | Claude Code がコマンドを実行し、**認証入力だけ自分** | `eas login` や Apple ID ログインなど、パスワード・2段階認証コードの入力が必要な場面 |

### 👤 自分がやる作業の一覧(UI 操作・これだけ押さえれば OK)

1. **Apple Developer Program 加入**(developer.apple.com / 個人 $99/年 / クレカ決済 / 承認待ち最大48h)
2. **Expo アカウント作成**(expo.dev / 無料 / メールアドレスだけ)
3. **iPhone にアプリ2つをインストール**(App Store から Expo Go と TestFlight)
4. **開発中の実機確認**(Expo Go で QR コードを読む → アプリを触って動作確認・再起動テスト)
5. **認証情報の入力**(`eas login` の Expo パスワード、`eas build` 初回の Apple ID + 2段階認証コード)
6. **App Store Connect でテスター招待(=権限付与)**(「ユーザとアクセス」でメンバー追加 → TestFlight の内部テストグループに登録)
7. **TestFlight からの最終インストール確認**(招待メール → TestFlight アプリでインストール → 動作確認)

### 🤖 Claude Code に任せる作業の一覧(コード・CLI)

1. Expo プロジェクトの雛形作成(`create-expo-app`)・依存パッケージ導入
2. **筋トレアプリの全コード実装**(画面・コンポーネント・SQLite の CRUD)
3. `app.json` の設定(Bundle ID、アプリ名、アイコン、暗号化申告)
4. `eas.json` の生成・設定(`eas build:configure`)
5. `eas build` / `eas submit` コマンドの実行(認証入力の場面だけ 👤)
6. README・ドキュメント整備

---

## アプリ仕様(シンプル構成)

「その日やったトレーニングを記録して、あとから振り返る」だけの筋トレログ。

### 機能

1. **記録**: 種目(ベンチプレス、スクワット等)を選び、重量(kg)× 回数(reps)を入力して保存。同じ種目を複数セット記録できる
2. **今日の記録一覧**: 今日記録したセットをリスト表示、誤入力は削除可能
3. **履歴**: 過去の記録を日付ごとにさかのぼって閲覧
4. **永続化のデモ(課題の肝)**: アプリを完全終了・再起動、機内モードでも記録が全部残る

### やらないこと(スコープ外)

- ユーザー登録・ログイン、クラウド同期、グラフ・統計、リマインダー通知、Apple Health 連携

### 画面構成(タブ 2 つ)

```
┌─ 記録タブ ─────────────┐  ┌─ 履歴タブ ─────────────┐
│ 種目選択(横スクロールチップ) │  │ 2026-07-10             │
│ 重量 [60] kg  回数 [10]    │  │  ・ベンチプレス 60kg×10  │
│ [ セットを記録 ]           │  │  ・ベンチプレス 60kg×8   │
│ ── 今日の記録 ──          │  │ 2026-07-08             │
│ ・ベンチプレス 60kg×10 [削除]│  │  ・スクワット 80kg×10    │
└───────────────────────┘  └───────────────────────┘
```

### DB スキーマ(expo-sqlite)

```sql
CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise TEXT NOT NULL,        -- 種目名
  weight REAL NOT NULL,          -- 重量 (kg)
  reps INTEGER NOT NULL,         -- 回数
  performed_at TEXT NOT NULL     -- ISO 8601 日時
);
```

種目は固定リスト(ベンチプレス / スクワット / デッドリフト / 懸垂 / ショルダープレス など5〜7個)をアプリ内定義にして、種目マスタのテーブルは持たない(シンプル優先)。

## 技術選定の理由

| 項目 | 選定 | 理由 |
|---|---|---|
| フレームワーク | React Native + Expo (SDK 最新) | Node v22 が導入済みで即着手可能。Xcode 本体・Flutter SDK が未導入の環境でも開発できる |
| ビルド | EAS Build (クラウド) | **ローカルに Xcode 不要**で iOS の .ipa を生成。署名証明書・Provisioning Profile も EAS が自動管理 |
| TestFlight 提出 | EAS Submit | CLI から App Store Connect へ直接アップロード |
| 永続化 | expo-sqlite | 端末内 SQLite。再起動・オフラインでもデータが残ることをデモできる |
| 言語 | TypeScript | create-expo-app のデフォルト |
| 実機確認 | Expo Go(開発中)→ TestFlight ビルド(最終) | シミュレータは Xcode が必要なため実機 iPhone を使用 |

---

## フェーズ計画(各ステップに担当を明記)

### Phase 0: アカウント準備 — 👤 全部自分(ブラウザ・iPhone の UI 操作)

| # | 作業 | 担当 | 詳細 |
|---|---|---|---|
| 0-1 | Apple Developer Program 加入 | 👤 | developer.apple.com → 「登録」→ Apple ID でサインイン → 個人として登録 → $99 決済。**承認まで最大48hなので最初に着手** |
| 0-2 | (研究室アカウントの場合)ロール付与依頼 | 👤 | 管理者に App Store Connect「ユーザとアクセス」で自分を **App Manager** として招待してもらう |
| 0-3 | Expo アカウント作成 | 👤 | expo.dev → Sign Up(無料) |
| 0-4 | iPhone に Expo Go / TestFlight を入れる | 👤 | App Store で検索してインストールするだけ |

### Phase 1: プロジェクト雛形作成 — 🤖 全部 Claude Code

| # | 作業 | 担当 | 詳細 |
|---|---|---|---|
| 1-1 | 雛形生成 | 🤖 | `npx create-expo-app@latest app --template blank-typescript` |
| 1-2 | expo-sqlite / React Navigation 導入 | 🤖 | `npx expo install ...` |
| 1-3 | `app.json` 設定 | 🤖 | Bundle ID(例: `jp.ac.doshisha.<lab>.workoutlog`)、アプリ名「筋トレログ」、`ITSAppUsesNonExemptEncryption: false` |

※ Bundle ID と アプリ表示名だけ、希望があれば 👤 が指定(なければ Claude Code が命名)。

### Phase 2: アプリ実装 — 🤖 全部 Claude Code

| # | 作業 | 担当 | 詳細 |
|---|---|---|---|
| 2-1 | DB 層(`src/db.ts`) | 🤖 | expo-sqlite 初期化・CRUD |
| 2-2 | 記録画面・履歴画面・コンポーネント | 🤖 | 下記の構成どおり実装 |
| 2-3 | アイコン・スプラッシュ画像 | 🤖 | シンプルな画像を生成して設定 |

構成案:

```
app/
├── App.tsx                  # エントリ(タブナビゲーション)
├── src/
│   ├── db.ts                # expo-sqlite 初期化・CRUD(sets テーブル)
│   ├── exercises.ts         # 種目の固定リスト
│   ├── types.ts             # WorkoutSet 型定義
│   ├── screens/
│   │   ├── RecordScreen.tsx   # 記録タブ(入力 + 今日の記録)
│   │   └── HistoryScreen.tsx  # 履歴タブ(日付ごとにグループ表示)
│   └── components/
│       ├── ExercisePicker.tsx # 種目選択チップ
│       └── SetRow.tsx         # 1セット分の表示行
```

### Phase 3: 開発中の動作確認 — 👥 共同(サーバ起動は 🤖、実機操作は 👤)

| # | 作業 | 担当 | 詳細 |
|---|---|---|---|
| 3-1 | 開発サーバ起動 | 🤖 | `npx expo start` を実行して QR コードを表示 |
| 3-2 | 実機で開く | 👤 | iPhone の Expo Go で QR コードを読む(Mac と同一 Wi-Fi) |
| 3-3 | 動作確認 | 👤 | セット記録・削除・履歴表示を触って確認。**アプリを完全終了 → 再起動してデータが残るか確認** |
| 3-4 | 不具合修正 | 🤖 | 👤 が見つけた問題を報告 → Claude Code が修正 → 3-2 に戻る |

### Phase 4: TestFlight リリース — 👥 共同(コマンドは 🤖、認証入力だけ 👤)

| # | 作業 | 担当 | 詳細 |
|---|---|---|---|
| 4-1 | eas-cli 導入・設定 | 🤖 | `npm install -g eas-cli` → `eas build:configure` |
| 4-2 | Expo ログイン | 👥 | 🤖 が `eas login` 実行 → 👤 が Expo のメール・パスワードを入力 |
| 4-3 | iOS ビルド | 👥 | 🤖 が `eas build --platform ios --profile production` 実行 → 初回のみ 👤 が **Apple ID + 2段階認証コード**を入力(証明書・Provisioning は EAS が自動生成。承諾の確認プロンプトに Yes と答えるだけ) |
| 4-4 | App Store Connect へ提出 | 👥 | 🤖 が `eas submit --platform ios --latest` 実行(アプリレコードも自動作成) |

### Phase 5: TestFlight で権限付与(テスター招待)— 👤 全部自分(App Store Connect の UI 操作)

| # | 作業 | 担当 | 詳細 |
|---|---|---|---|
| 5-1 | ビルド処理完了を待つ | 👤 | appstoreconnect.apple.com → マイアプリ → TestFlight タブ。アップロード後 10〜30 分で「テスト可能」になる |
| 5-2 | テスターをユーザとして追加 | 👤 | 「ユーザとアクセス」→「+」→ 研究室メンバーのメールを入力して招待(**ここが「権限付与」の実体**) |
| 5-3 | 内部テストグループ作成 | 👤 | TestFlight タブ →「内部テスト」→ グループ作成(審査不要・最大100人)→ 5-2 のユーザを追加 → ビルドを割り当て |
| 5-4 | テスター側の受け取り | 👤 | 招待メールのリンク → TestFlight アプリでインストール → 動作確認 |
| 5-5 | (外部の人に配る場合) | 👤 | 「外部テスト」グループを作成 → Beta App Review 提出(1〜2日かかる)。内部テストだけなら不要 |

---

## 想定スケジュール

| 作業 | 目安 | 主担当 |
|---|---|---|
| Phase 0(Apple Developer 承認待ち含む) | 〜2 日(待ち時間) | 👤 |
| Phase 1–2(実装) | 半日 | 🤖 |
| Phase 3(実機確認・修正ループ) | 半日 | 👥 |
| Phase 4(EAS ビルド・提出) | 1〜2 時間(ビルド待ち含む) | 👥 |
| Phase 5(TestFlight 反映・招待) | 1 時間 + 処理待ち | 👤 |

※ Phase 0 の承認待ちと Phase 1–2 の実装は並行できる(実装は Apple Developer なしで進められ、Phase 3 の Expo Go 確認まで可能)。

## 注意点

- **Expo Go では SQLite も動くが、ネイティブモジュールを追加した場合は Development Build が必要**。今回の構成(expo-sqlite + React Navigation のみ)は Expo Go で完結する
- EAS Build 無料枠はビルド待ち行列が長いことがある(混雑時 30 分以上)
- Apple Developer の**個人アカウント**なら自分が Account Holder。**研究室のチームアカウント**なら App Manager 以上のロールが必要(証明書作成・提出のため)
- TestFlight ビルドは 90 日で失効する
