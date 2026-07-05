import { type Category } from './types';

/** 部位カテゴリの表示順 */
export const CATEGORIES: Category[] = ['胸', '背中', '脚', '肩', '腕', '体幹'];

/** アプリ初期投入する種目(is_builtin=1 で投入される) */
export const SEED_EXERCISES: { name: string; category: Category }[] = [
  { name: 'ベンチプレス', category: '胸' },
  { name: 'ダンベルフライ', category: '胸' },
  { name: 'ラットプルダウン', category: '背中' },
  { name: '懸垂', category: '背中' },
  { name: 'デッドリフト', category: '背中' },
  { name: 'スクワット', category: '脚' },
  { name: 'レッグプレス', category: '脚' },
  { name: 'ショルダープレス', category: '肩' },
  { name: 'サイドレイズ', category: '肩' },
  { name: 'アームカール', category: '腕' },
  { name: '腹筋', category: '体幹' },
];
