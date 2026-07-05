/**
 * アバター(想像上の生き物)のメタ情報。
 * ドット絵の実データは creatureData.ts(画像から自動生成)にあり、キーで参照する。
 */

export type Creature = {
  key: string; // creatureData.ts のキーと一致
  name: string;
  intro: string; // 図鑑説明
};

// 育てる順番(前の生き物が成体になったら次の卵へ)
export const CREATURES: Creature[] = [
  { key: 'slime', name: 'スライム', intro: 'すべての冒険者が最初に出会う、ぷるぷるの精霊。' },
  { key: 'kitsune', name: '九尾の狐', intro: '尾をもつ神使。継続する者に幸運を運ぶ。' },
  { key: 'pegasus', name: 'ペガサス', intro: '天翔ける白馬。空へ羽ばたく努力の象徴。' },
  { key: 'unicorn', name: 'ユニコーン', intro: '純粋な心にのみ懐く一角獣。角は黄金に輝く。' },
  { key: 'griffin', name: 'グリフォン', intro: '獅子と鷲を併せ持つ勇猛な守護獣。' },
  { key: 'golem', name: 'ゴーレム', intro: '岩から生まれし守り手。鍛えるほど硬くなる。' },
  { key: 'kraken', name: 'クラーケン', intro: '深海の主。無数の触手で海を統べる。' },
  { key: 'phoenix', name: 'フェニックス', intro: '炎から蘇る不死鳥。折れぬ意志のかたち。' },
  { key: 'kirin', name: '麒麟', intro: '瑞獣の王。真の継続者の前にのみ姿を現す。' },
  { key: 'dragon', name: 'ドラゴン', intro: '伝説の頂点。すべてを育てし者に従う竜王。' },
];

export type Stage = 'egg' | 'baby' | 'adult';
export const STAGE_KEYS: Stage[] = ['egg', 'baby', 'adult'];
