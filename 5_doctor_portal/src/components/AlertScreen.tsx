import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertTriangle,
  CheckCircle2,
  Hand,
  LockKeyhole,
} from "lucide-react-native";
import type { AlertPacket } from "../types/contracts";
import { useConnection } from "../context/ConnectionContext";

interface AlertScreenProps {
  alert: AlertPacket;
}

export const AlertScreen: React.FC<AlertScreenProps> = ({ alert }) => {
  const { claiming, claimError, claimCurrentCase } = useConnection();

  const handleClaim = async () => {
    await claimCurrentCase();
  };

  const sbarBlocks = [
    {
      key: "situation" as const,
      letter: "S",
      title: "Situation",
      bg: "rgba(239, 68, 68, 0.08)",
      border: "rgba(239, 68, 68, 0.25)",
      badgeBg: "rgba(239, 68, 68, 0.15)",
      badgeText: "#f87171",
      text: alert.sbar.situation,
    },
    {
      key: "background" as const,
      letter: "B",
      title: "Background",
      bg: "rgba(56, 189, 248, 0.06)",
      border: "rgba(56, 189, 248, 0.25)",
      badgeBg: "rgba(56, 189, 248, 0.15)",
      badgeText: "#38bdf8",
      text: alert.sbar.background,
    },
    {
      key: "assessment" as const,
      letter: "A",
      title: "Assessment",
      bg: "rgba(245, 158, 11, 0.08)",
      border: "rgba(245, 158, 11, 0.25)",
      badgeBg: "rgba(245, 158, 11, 0.15)",
      badgeText: "#fbbf24",
      text: alert.sbar.assessment,
    },
    {
      key: "recommendation" as const,
      letter: "R",
      title: "Recommendation",
      bg: "rgba(16, 185, 129, 0.08)",
      border: "rgba(16, 185, 129, 0.25)",
      badgeBg: "rgba(16, 185, 129, 0.15)",
      badgeText: "#34d399",
      text: alert.sbar.recommendation,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Alert Header Banner */}
      <View style={styles.alertHeader}>
        <View style={styles.alertTypeRow}>
          <View style={styles.pulseDot} />
          <Text style={styles.alertType}>CRITICAL ESCALATION</Text>
          <View style={styles.news2Badge}>
            <Text style={styles.news2Text}>NEWS2 {alert.news2_score}</Text>
          </View>
        </View>

        <Text style={styles.patientHeading}>
          {alert.bed_id} · {alert.patient_name}
        </Text>
        <Text style={styles.patientContext} numberOfLines={2}>
          {alert.patient_context}
        </Text>

        <View style={styles.verifiedRow}>
          <CheckCircle2 size={13} color="#34d399" />
          <Text style={styles.verifiedText}>
            Nurse verified · {alert.sbar_source} SBAR
          </Text>
        </View>
      </View>

      {/* SBAR Sections */}
      <ScrollView style={styles.sbarScroll} showsVerticalScrollIndicator={false}>
        {sbarBlocks.map((block) => (
          <View
            key={block.key}
            style={[
              styles.sbarCard,
              { backgroundColor: block.bg, borderColor: block.border },
            ]}
          >
            <View style={styles.sbarTitleRow}>
              <View
                style={[
                  styles.sbarLetterBadge,
                  { backgroundColor: block.badgeBg },
                ]}
              >
                <Text
                  style={[styles.sbarLetterText, { color: block.badgeText }]}
                >
                  {block.letter}
                </Text>
              </View>
              <Text style={[styles.sbarTitle, { color: block.badgeText }]}>
                {block.title}
              </Text>
            </View>
            <Text style={styles.sbarBody}>{block.text}</Text>
          </View>
        ))}

        {/* Contributing Vitals */}
        <Text style={styles.vitalsSectionTitle}>NEWS2 PARAMETERS</Text>
        <View style={styles.vitalsWrap}>
          {alert.news2_components
            .filter((c) => c.score > 0)
            .map((c) => (
              <View key={c.parameter} style={styles.vitalPill}>
                <Text style={styles.vitalLabel}>
                  {c.label} {Math.round(c.value)}
                </Text>
                <Text style={styles.vitalScore}>+{c.score}</Text>
              </View>
            ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.actionFooter}>
        {claimError && (
          <View style={styles.errorBanner}>
            <AlertTriangle size={15} color="#f87171" />
            <Text style={styles.errorText}>{claimError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
          onPress={handleClaim}
          disabled={claiming}
          activeOpacity={0.85}
        >
          {claiming ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Hand size={18} color="#ffffff" />
          )}
          <Text style={styles.claimButtonText}>
            {claiming ? "Claiming Case..." : "Accept Case"}
          </Text>
        </TouchableOpacity>

        <View style={styles.claimNote}>
          <LockKeyhole size={11} color="#64748b" />
          <Text style={styles.claimNoteText}>
            First physician to accept locks the case · others stand down
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  alertHeader: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(239, 68, 68, 0.3)",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  alertTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  alertType: {
    fontSize: 11,
    fontWeight: "800",
    color: "#f87171",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  news2Badge: {
    marginLeft: "auto",
    backgroundColor: "#ef4444",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  news2Text: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
    fontFamily: "monospace",
  },
  patientHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 6,
  },
  patientContext: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
    lineHeight: 16,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  verifiedText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  sbarScroll: {
    flex: 1,
    padding: 14,
  },
  sbarCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  sbarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sbarLetterBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  sbarLetterText: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  sbarTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sbarBody: {
    fontSize: 13,
    color: "#f1f5f9",
    lineHeight: 18,
  },
  vitalsSectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    fontFamily: "monospace",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 8,
  },
  vitalsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  vitalPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  vitalLabel: {
    fontSize: 11,
    color: "#fbbf24",
    fontFamily: "monospace",
  },
  vitalScore: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f59e0b",
    fontFamily: "monospace",
  },
  actionFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    backgroundColor: "#0f172a",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  errorText: {
    color: "#f87171",
    fontSize: 12,
    flex: 1,
  },
  claimButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  claimNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
  },
  claimNoteText: {
    fontSize: 11,
    color: "#64748b",
  },
});
