import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CheckCircle2,
  HardDrive,
  Radio,
  RefreshCw,
  Smartphone,
  Wifi,
  X,
  XCircle,
} from "lucide-react-native";
import { useConnection } from "../context/ConnectionContext";
import { testConnection } from "../services/api";

interface NetworkSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NetworkSettingsModal: React.FC<NetworkSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const { backendUrl, setBackendUrl, refreshConnection, connectionState } =
    useConnection();
  const [inputUrl, setInputUrl] = useState(backendUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    ok: boolean;
    latencyMs: number;
    message?: string;
  } | null>(null);

  const handleTest = async (urlToTest?: string) => {
    const target = urlToTest || inputUrl;
    setTesting(true);
    setTestResult(null);
    const res = await testConnection(target);
    setTesting(false);
    setTestResult({
      tested: true,
      ok: res.ok,
      latencyMs: res.latencyMs,
      message: res.message,
    });
  };

  const handleApplyPreset = (url: string) => {
    setInputUrl(url);
    handleTest(url);
  };

  const handleSave = async () => {
    await setBackendUrl(inputUrl);
    refreshConnection();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Radio size={20} color="#38bdf8" />
              <Text style={styles.headerTitle}>Network & Server Config</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Hackathon Pro-Tip Banner */}
            <View style={styles.hackathonTipCard}>
              <View style={styles.tipHeader}>
                <HardDrive size={16} color="#38bdf8" />
                <Text style={styles.tipTitle}>Zero-Wi-Fi Mode (Hackathon Safe)</Text>
              </View>
              <Text style={styles.tipBody}>
                To avoid congested hackathon Wi-Fi, connect phone via USB and run:
              </Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>./scripts/connect_phone_usb.sh</Text>
              </View>
              <Text style={styles.tipFooter}>
                Then select <Text style={styles.boldText}>USB / Localhost</Text> below.
              </Text>
            </View>

            {/* Quick Presets */}
            <Text style={styles.sectionTitle}>QUICK PRESETS</Text>
            <View style={styles.presetsGrid}>
              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  inputUrl.includes("localhost:8000") && styles.presetBtnActive,
                ]}
                onPress={() => handleApplyPreset("http://localhost:8000")}
              >
                <Smartphone size={16} color="#38bdf8" />
                <Text style={styles.presetBtnTitle}>USB / Localhost</Text>
                <Text style={styles.presetBtnSub}>adb reverse (Offline)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  inputUrl.includes("192.168.") && styles.presetBtnActive,
                ]}
                onPress={() => handleApplyPreset("http://192.168.0.101:8000")}
              >
                <Wifi size={16} color="#10b981" />
                <Text style={styles.presetBtnTitle}>Local Wi-Fi</Text>
                <Text style={styles.presetBtnSub}>192.168.0.101:8000</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  inputUrl.includes("10.0.2.2") && styles.presetBtnActive,
                ]}
                onPress={() => handleApplyPreset("http://10.0.2.2:8000")}
              >
                <HardDrive size={16} color="#c084fc" />
                <Text style={styles.presetBtnTitle}>Android Emulator</Text>
                <Text style={styles.presetBtnSub}>10.0.2.2:8000</Text>
              </TouchableOpacity>
            </View>

            {/* URL Input */}
            <Text style={styles.sectionTitle}>CENTRAL HUB BASE URL</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="http://192.168.x.x:8000"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.testBtn}
                onPress={() => handleTest()}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#38bdf8" />
                ) : (
                  <RefreshCw size={14} color="#38bdf8" />
                )}
                <Text style={styles.testBtnText}>Test Ping</Text>
              </TouchableOpacity>
            </View>

            {/* Test Result Feedback */}
            {testResult && (
              <View
                style={[
                  styles.resultBox,
                  testResult.ok ? styles.resultBoxOk : styles.resultBoxFail,
                ]}
              >
                {testResult.ok ? (
                  <CheckCircle2 size={16} color="#10b981" />
                ) : (
                  <XCircle size={16} color="#ef4444" />
                )}
                <Text
                  style={[
                    styles.resultText,
                    testResult.ok ? styles.resultTextOk : styles.resultTextFail,
                  ]}
                >
                  {testResult.ok
                    ? `Central Hub Reachable · ${testResult.latencyMs}ms`
                    : `Unreachable: ${testResult.message}`}
                </Text>
              </View>
            )}

            {/* Status indicator */}
            <View style={styles.currentStatusRow}>
              <Text style={styles.currentStatusLabel}>Current Socket Status:</Text>
              <Text
                style={[
                  styles.currentStatusValue,
                  {
                    color:
                      connectionState === "online"
                        ? "#10b981"
                        : connectionState === "connecting"
                          ? "#f59e0b"
                          : "#ef4444",
                  },
                ]}
              >
                {connectionState.toUpperCase()}
              </Text>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>Save & Connect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  hackathonTipCard: {
    backgroundColor: "rgba(14, 165, 233, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#38bdf8",
  },
  tipBody: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 16,
  },
  codeBox: {
    backgroundColor: "#020617",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#e2e8f0",
  },
  tipFooter: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 6,
  },
  boldText: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  presetsGrid: {
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  presetBtnActive: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
  },
  presetBtnTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f8fafc",
  },
  presetBtnSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginLeft: "auto",
  },
  inputContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 13,
    fontFamily: "monospace",
  },
  testBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  testBtnText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "600",
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 6,
    marginBottom: 14,
    borderWidth: 1,
  },
  resultBoxOk: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  resultBoxFail: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  resultText: {
    fontSize: 12,
    fontWeight: "500",
  },
  resultTextOk: {
    color: "#34d399",
  },
  resultTextFail: {
    color: "#f87171",
  },
  currentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    marginBottom: 16,
  },
  currentStatusLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  currentStatusValue: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  saveBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
