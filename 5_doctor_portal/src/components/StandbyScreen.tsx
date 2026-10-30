import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  LockKeyhole,
  MoonStar,
  Radio,
  Siren,
  Stethoscope,
} from "lucide-react-native";
import { useConnection } from "../context/ConnectionContext";

export const StandbyScreen: React.FC = () => {
  const { demo, connectionState } = useConnection();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Standby Hero Icon */}
      <View style={styles.heroBox}>
        <View style={styles.iconCircle}>
          <MoonStar size={34} color="#64748b" />
          {demo.active && <View style={styles.pulseDot} />}
        </View>

        <Text style={styles.title}>No active escalations</Text>
        <Text style={styles.subtitle}>
          Listening to the central hub. You will be paged when the nursing
          station verifies a critical deterioration.
        </Text>
      </View>

      {/* Demo Active Banner */}
      {demo.active && (
        <View style={styles.demoBanner}>
          <View style={styles.demoHeader}>
            <Radio size={14} color="#38bdf8" />
            <Text style={styles.demoBadge}>DEMO ACTIVE · PATIENT ESCALATION</Text>
          </View>
          <Text style={styles.demoText}>
            Bedside telemetry deterioration simulated. Edge agent is computing
            NEWS2 and generating verified clinical SBAR.
          </Text>
        </View>
      )}

      {/* Protocol Explanation Steps */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>FIRST-TO-CLAIM PROTOCOL</Text>

        <View style={styles.stepRow}>
          <View style={styles.stepIconWrap}>
            <Stethoscope size={16} color="#38bdf8" />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepHeadline}>Nurse Verifies Alert</Text>
            <Text style={styles.stepDesc}>
              Nursing station reviews edge telemetry and Gemini-generated SBAR
              brief.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.stepRow}>
          <View style={styles.stepIconWrap}>
            <Siren size={16} color="#f59e0b" />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepHeadline}>Concurrent Dispatch</Text>
            <Text style={styles.stepDesc}>
              All on-call physician phones receive immediate audio & visual
              escalation.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.stepRow}>
          <View style={styles.stepIconWrap}>
            <LockKeyhole size={16} color="#10b981" />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepHeadline}>Atomic Claim Lock</Text>
            <Text style={styles.stepDesc}>
              First doctor to accept wins the case lock. Competing responders
              stand down.
            </Text>
          </View>
        </View>
      </View>

      {/* Security note */}
      <View style={styles.securityNote}>
        <LockKeyhole size={13} color="#475569" />
        <Text style={styles.securityText}>
          Secure physician channel · Ward 4B dispatch
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
  },
  heroBox: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pulseDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#0ea5e9",
    borderWidth: 2,
    borderColor: "#0f172a",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
    marginTop: 6,
  },
  demoBanner: {
    width: "100%",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  demoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  demoBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#38bdf8",
    letterSpacing: 0.8,
    fontFamily: "monospace",
  },
  demoText: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 16,
  },
  stepsCard: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
  },
  stepsTitle: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepHeadline: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f8fafc",
  },
  stepDesc: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 16,
    marginTop: 2,
  },
  stepDivider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginVertical: 12,
    marginLeft: 44,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 28,
  },
  securityText: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "monospace",
  },
});
