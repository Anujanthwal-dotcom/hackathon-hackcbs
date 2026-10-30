import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Activity, RadioTower, Settings, User } from "lucide-react-native";
import { ACCENT_COLORS } from "../config/doctors";
import { useConnection } from "../context/ConnectionContext";

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenRoster: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenRoster,
}) => {
  const { selectedDoctor, connectionState } = useConnection();
  const accent = ACCENT_COLORS[selectedDoctor.accent];

  const isOnline = connectionState === "online";
  const isSync = connectionState === "connecting";

  const statusColor = isOnline ? "#10b981" : isSync ? "#f59e0b" : "#ef4444";
  const statusText = isOnline ? "LIVE" : isSync ? "SYNC" : "OFFLINE";

  return (
    <View style={styles.container}>
      {/* Brand row */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Activity size={18} color="#ffffff" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>Cura</Text>
              <Text style={[styles.brandTitle, styles.brandHighlight]}> Health</Text>
              <View style={styles.dispatchBadge}>
                <Text style={styles.dispatchText}>DISPATCH</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Physician Emergency Dispatch</Text>
          </View>
        </View>

        {/* Network status pill */}
        <TouchableOpacity
          style={styles.connectionPill}
          onPress={onOpenSettings}
          activeOpacity={0.7}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {statusText}
          </Text>
          <Settings size={14} color="#94a3b8" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* Selected Doctor Bar */}
      <TouchableOpacity
        style={[
          styles.doctorBar,
          { borderColor: accent.badgeBorder, backgroundColor: accent.badgeBg },
        ]}
        onPress={onOpenRoster}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.avatarCircle,
            { borderColor: accent.badgeBorder, backgroundColor: "#0f172a" },
          ]}
        >
          <Text style={[styles.avatarText, { color: accent.badgeText }]}>
            {selectedDoctor.initials}
          </Text>
        </View>

        <View style={styles.doctorInfo}>
          <View style={styles.doctorNameRow}>
            <Text style={styles.doctorName}>{selectedDoctor.name}</Text>
            <Text style={styles.switchHint}>Tap to switch ▾</Text>
          </View>
          <Text style={[styles.doctorRole, { color: accent.badgeText }]}>
            {selectedDoctor.role}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0b0f19",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  brandHighlight: {
    color: "#38bdf8",
  },
  dispatchBadge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  dispatchText: {
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  connectionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  doctorBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  doctorInfo: {
    flex: 1,
  },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  doctorName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
  },
  switchHint: {
    fontSize: 11,
    color: "#94a3b8",
  },
  doctorRole: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
});
