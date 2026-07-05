import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { colors } from '../theme';

const PRESETS = [60, 90, 120, 180]; // 秒

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * セット間インターバルタイマー(A-5)。
 * 端末内のカウントダウンのみ(通知なし)。0 になったらバイブで知らせる。
 * バックグラウンド時の通知は expo-notifications 導入後に別途対応。
 */
export function RestTimer() {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            Vibration.vibrate([0, 400, 200, 400]);
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining > 0]);

  const start = (sec: number) => {
    setRemaining(sec);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setRemaining(0);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>インターバルタイマー</Text>
        {remaining > 0 && (
          <Text style={[styles.remaining, running && styles.remainingActive]}>{fmt(remaining)}</Text>
        )}
      </View>
      <View style={styles.presets}>
        {PRESETS.map((sec) => (
          <TouchableOpacity key={sec} style={styles.presetBtn} onPress={() => start(sec)}>
            <Text style={styles.presetText}>{sec}秒</Text>
          </TouchableOpacity>
        ))}
        {remaining > 0 && (
          <TouchableOpacity style={styles.stopBtn} onPress={stop}>
            <Text style={styles.stopText}>停止</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  remaining: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  remainingActive: {
    color: colors.accent,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  presetText: {
    fontSize: 14,
    color: colors.text,
  },
  stopBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.danger,
  },
  stopText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
