import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

// OTA diagnostics screen — reads the device's own expo-updates record
// to reveal WHY an iOS OTA update failed/was quarantined.
export default function OtaDebugScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<string>('Not checked yet');
  const [quarantined, setQuarantined] = useState<string>('—');
  const [logs, setLogs] = useState<string>('Tap "Read device logs" below');

  const runtimeInfo = (() => {
    try {
      return {
        isEmbeddedLaunch: String(Updates.isEmbeddedLaunch),
        updateId: Updates.updateId ? String(Updates.updateId) : 'none (embedded)',
        channel: Updates.channel || '—',
        runtimeVersion: Updates.runtimeVersion || '—',
        createdAt: Updates.createdAt ? new Date(Updates.createdAt).toISOString() : '—',
        emergencyLaunch: String(Updates.isEmergencyLaunch),
      };
    } catch (e: any) {
      return { error: e?.message || 'failed to read Updates props' } as any;
    }
  })();

  const readLogs = useCallback(async () => {
    setLoading(true);
    try {
      // maxAge 0 = all available entries (purged by OS after ~1 day)
      const entries = await Updates.readLogEntriesAsync(0);
      if (!entries || entries.length === 0) {
        setLogs('No log entries found. (Logs are purged after ~1 day.)\nPublish an OTA, let iOS try to apply it, then come back here.');
      } else {
        const text = entries
          .slice(-40)
          .map((e: any) => {
            const t = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '';
            const code = e.code ? ` [${e.code}]` : '';
            const err = e.stacktrace ? `\n    ${e.stacktrace.join('\n    ')}` : '';
            return `• ${t}${code} ${e.message}${err}`;
          })
          .join('\n\n');
        setLogs(text);
      }
    } catch (e: any) {
      setLogs(`readLogEntriesAsync error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkNow = useCallback(async () => {
    setLoading(true);
    setCheckResult('Checking...');
    setQuarantined('—');
    try {
      const res: any = await Updates.checkForUpdateAsync();
      const reason = res?.reason ? ` | reason: ${res.reason}` : '';
      setCheckResult(
        `isAvailable: ${res?.isAvailable}${reason}\n` +
          (res?.manifest?.id ? `manifest id: ${String(res.manifest.id).slice(0, 12)}` : '')
      );
      if (res?.reason === 'updatePreviouslyFailed') {
        setQuarantined('⚠️ YES — a previous OTA crashed on launch and was quarantined on this device. Read the logs below for the exact JS error.');
      } else {
        setQuarantined('No quarantine reported for the newest update.');
      }
    } catch (e: any) {
      setCheckResult(`checkForUpdateAsync error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>OTA Diagnostics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Running bundle</Text>
        <View style={styles.card}>
          {Object.entries(runtimeInfo).map(([k, v]) => (
            <Text key={k} style={styles.kv}>
              <Text style={styles.key}>{k}: </Text>
              <Text style={styles.val}>{String(v)}</Text>
            </Text>
          ))}
        </View>
        <Text style={styles.hint}>
          If isEmbeddedLaunch is "true" after an OTA was published, this device is NOT running the OTA — it reverted to the embedded (App Store) bundle.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={checkNow} disabled={loading}>
          <Ionicons name="cloud-download-outline" size={18} color="#000" />
          <Text style={styles.btnText}>Check for update</Text>
        </TouchableOpacity>

        <Text style={styles.section}>Check result</Text>
        <View style={styles.card}>
          <Text style={styles.mono}>{checkResult}</Text>
        </View>

        <Text style={styles.section}>Quarantine status</Text>
        <View style={styles.card}>
          <Text style={styles.mono}>{quarantined}</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={readLogs} disabled={loading}>
          <Ionicons name="document-text-outline" size={18} color="#000" />
          <Text style={styles.btnText}>Read device logs</Text>
        </TouchableOpacity>

        <Text style={styles.section}>expo-updates device log</Text>
        <View style={[styles.card, { minHeight: 120 }]}>
          {loading ? (
            <ActivityIndicator color="#FFD700" />
          ) : (
            <Text style={styles.mono}>{logs}</Text>
          )}
        </View>
        <Text style={styles.hint}>
          Look for "markFailedLaunchForUpdate" or an "RCTFatalException" entry — that line contains the exact JavaScript error that crashed the OTA on launch.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 48 },
  section: { color: '#FFD700', fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2a2a2a' },
  kv: { marginBottom: 4 },
  key: { color: '#888', fontSize: 12 },
  val: { color: '#fff', fontSize: 12, fontWeight: '600' },
  mono: { color: '#0f0', fontSize: 11, fontFamily: 'Courier' },
  hint: { color: '#888', fontSize: 11, marginTop: 8, lineHeight: 16 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
  },
  btnText: { color: '#000', fontSize: 14, fontWeight: '700' },
});
