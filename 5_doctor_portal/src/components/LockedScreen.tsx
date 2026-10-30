import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Clock, LockKeyhole, ShieldAlert, XCircle } from "lucide-react-native";
import type { AlertPacket, ClaimRecord } from "../types/contracts";

interface LockedScreenProps {
  alert: AlertPacket;
  claim: ClaimRecord;
}

export const LockedScreen: React.FC<LockedScreenProps> = ({
  alert,
  claim,
}) => {
  const claimedTime = claim.claimed_at
    ? new Date(claim.claimed_at).toLocaleTimeString()
    : "--:--:--";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Stand Down Hero */}
      <View style={styles.heroBox}>
        <View style={styles.iconCircle}>
          <XCircle size={38} color="#f59e0b" />
        </View>

        <View style={styles.lockedBadge}>
          <Text style={styles.lockedBadgeText}>CASE LOCKED ELSEWHERE</Text>
        </View>

        <Text style={styles.heroTitle}>
          Claimed by {claim.doctor_name}
        </Text>
        <Text style={styles.heroAction}>Stand Down</Text>

        <Text style={styles.heroSubtitle}>
          {alert.bed_id} · The first-to-claim lock is held by another on-call
          physician. No clinical action is required from you.
        </Text>
      </View>

      {/* Audit Lock Card */}
      <View style={styles.lockCard}>
        <View style={styles.cardHeader}>
          <Clock size={14} color="#f59e0b" />
          <Text style={styles.cardHeaderText}>Lock Recorded {claimedTime}</Text>
        </View>
        <Text style={styles.cardBody}>
          All on-call physician devices were paged simultaneously. The central
          hospital hub granted one atomic winner; every competing claim
          returned HTTP 409.
        </Text>
      </View>

      {/* Technical Guard */}
      <View style={styles.guardRow}>
        <LockKeyhole size={13} color="#64748b" />
        <Text style={styles.guardText}>
          Atomic dispatch guard · asyncio.Lock
        </Text>
      </View>
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
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    marginTop: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  lockedBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    marginBottom: 8,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fbbf24",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
  },
  heroAction: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f59e0b",
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 17,
  },
  lockCard: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  cardHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f8fafc",
  },
  cardBody: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 17,
  },
  guardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  guardText: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "monospace",
  },
});
