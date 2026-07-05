import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CREATURE_DATA, CHARS, PIXEL_SIZE } from '../creatureData';
import { type Stage } from '../creatures';

type Props = {
  creatureKey: string;
  stage: Stage;
  pixel?: number; // 1マスのサイズ(px)
  animate?: boolean;
};

type Run = { color: string | null; width: number };

// 1行(文字列) → パレット参照で色に変換 → 同色をまとめてラン化
function rowToRuns(row: string, palette: string[]): Run[] {
  const runs: Run[] = [];
  for (const ch of row) {
    const color = ch === '.' ? null : (palette[CHARS.indexOf(ch)] ?? null);
    const last = runs[runs.length - 1];
    if (last && last.color === color) last.width += 1;
    else runs.push({ color, width: 1 });
  }
  return runs;
}

/**
 * 画像から生成したドット絵(creatureData.ts)を View のマス目で描画する。
 * 3コマ(_01/_02/_03)を順に切り替えてパタパタ・アニメする。
 */
export function PixelCreature({ creatureKey, stage, pixel = 6, animate = true }: Props) {
  const data = CREATURE_DATA[creatureKey]?.[stage];
  const frameCount = data?.frames.length ?? 1;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animate || frameCount <= 1) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % frameCount), 320);
    return () => clearInterval(id);
  }, [animate, frameCount]);

  const rows = useMemo(() => {
    if (!data) return [];
    const idx = Math.min(frame, data.frames.length - 1);
    return data.frames[idx].map((row) => rowToRuns(row, data.palette));
  }, [data, frame]);

  if (!data) return <View style={{ width: PIXEL_SIZE * pixel, height: PIXEL_SIZE * pixel }} />;

  return (
    <View style={[styles.wrap, { width: PIXEL_SIZE * pixel, height: PIXEL_SIZE * pixel }]}>
      {rows.map((runs, r) => (
        <View key={r} style={[styles.row, { height: pixel }]}>
          {runs.map((run, i) => (
            <View
              key={i}
              style={{ width: run.width * pixel, height: pixel, backgroundColor: run.color ?? 'transparent' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-start' },
  row: { flexDirection: 'row' },
});
