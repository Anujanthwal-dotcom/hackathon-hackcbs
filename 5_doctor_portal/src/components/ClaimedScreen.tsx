import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Activity,
  CheckCircle2,
  Clock,
  Heart,
  ShieldCheck,
  User,
} from "lucide-react-native";
import type { AlertPacket, ClaimRecord } from "../types/contracts";

interface ClaimedScreenProps {
  alert: AlertPacket;
  claim: ClaimRecord;
}

export const ClaimedScreen: React.FC<ClaimedScreenProps> = ({
  alert,
  claim,
}) => {
  const hr = alert.news2_components.find((c) => c.parameter === "heart_rate")?.value;
  const sbp = alert.news2_components.find((c) => c.parameter === "systolic_bp")?.value;
  const spo2 = alert.news2_components.find((c) => c.parameter === "spo2")?.value;

  const claimedTime = claim.claimed_at
    ? new Date(claim.claimed_at).toLocaleTimeString()
    : "Just now";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Success Hero */}
      <View style={styles.heroBox}>
        <View style={styles.iconCircle}>
          <ShieldCheck size={36} color="#10b981" />
        </View>
        <View style={styles.claimedBadge}>
          <Text style={styles.claimedBadgeText}>ATOMIC LOCK WON</Text>
        </View>
        <Text style={styles.heroTitle}>You are Primary Responder</Text>
        <Text style={styles.heroSubtitle}>
          Case locked exclusively to {claim.doctor_name}. All competing
          physician devices have stood down.
        </Text>
      </View>

      {/* Patient Handoff Card */}
      <View style={styles.handoffCard}>
        <View style={styles.handoffHeader}>
          <Text style={styles.handoffTitle}>HANDOFF SNAPSHOT</Text>
          <View style={styles.timeBadge}>
            <Clock size={12} color="#10b981" />
            <Text style={styles.timeText}>{claimedTime}</Text>
          </View>
        </View>

        <Text style={styles.patientName}>
          {alert.bed_id} · {alert.patient_name}
        </Text>
        <Text style={styles.patientContext}>{alert.patient_context}</Text>

        {/* Telemetry quick vitals */}
        <View style={styles.vitalsRow}>
          {hr !== undefined && (
            <View style={styles.vitalBox}>
              <Heart size={14} color="#ef4444" />
              <Text style={styles.vitalVal}>HR {Math.round(hr)}</Text>
            </View>
          )}
          {sbp !== undefined && (
            <View style={styles.vitalBox}>
              <Activity size={14} color="#38bdf8" />
              <Text style={styles.vitalVal}>SBP {Math.round(sbp)}</Text>
            </View>
          )}
          {spo2 !== undefined && (
            <View style={styles.vitalBox}>
              <Activity size={14} color="#10b981" />
              <Text style={styles.vitalVal}>SpO2 {Math.round(spo2)}%</Text>
            </View>
          )}
        </View>
      </View>

      {/* Verified SBAR Accordion Summary */}
      <View style={styles.sbarCard}>
        <Text style={styles.sbarCardTitle}>VERIFIED CLINICAL SBAR</Text>

        <View style={styles.sbarItem}>
          <Text style={[styles.sbarLabel, { color: "#f87171" }]}>S · SITUATION</Text>
          <Text style={styles.sbarText}>{alert.sbar.situation}</Text>
        </View>

        <View style={styles.sbarItem}>
          <Text style={[styles.sbarLabel, { color: "#38bdf8" }]}>B · BACKGROUND</Text>
          <Text style={styles.sbarText}>{alert.sbar.background}</Text>
        </View>

        <View style={styles.sbarItem}>
          <Text style={[styles.sbarLabel, { color: "#fbbf24" }]}>A · ASSESSMENT</Text>
          <Text style={styles.sbarText}>{alert.sbar.assessment}</Text>
        </View>

        <View style={styles.sbarItem}>
          <Text style={[styles.sbarLabel, { color: "#34d399" }]}>R · RECOMMENDATION</Text>
          <Text style={styles.sbarText}>{alert.sbar.recommendation}</Text>
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
    padding: 16,
  },
  heroBox: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  claimedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    marginBottom: 8,
  },
  claimedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34d399",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  handoffCard: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  handoffHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  handoffTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10b981",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "monospace",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  patientContext: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
    lineHeight: 16,
  },
  vitalsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  vitalBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  vitalVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e2e8f0",
    fontFamily: "monospace",
  },
  sbarCard: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  sbarCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    fontFamily: "monospace",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sbarItem: {
    marginBottom: 12,
  },
  sbarLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sbarText: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 16,
  },
});
