import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, Shield, X } from "lucide-react-native";
import type { Doctor } from "../config/doctors";
import { ACCENT_COLORS, DOCTORS } from "../config/doctors";
import { useConnection } from "../context/ConnectionContext";

interface DoctorRosterModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DoctorRosterModal: React.FC<DoctorRosterModalProps> = ({
  visible,
  onClose,
}) => {
  const { selectedDoctor, setSelectedDoctor } = useConnection();

  const handleSelect = async (doctor: Doctor) => {
    await setSelectedDoctor(doctor);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Shield size={18} color="#38bdf8" />
              <Text style={styles.title}>Physician On-Call Roster</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select your physician identity to participate in the first-to-claim
            escalation protocol.
          </Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {DOCTORS.map((doc) => {
              const accent = ACCENT_COLORS[doc.accent];
              const isSelected = doc.id === selectedDoctor.id;

              return (
                <TouchableOpacity
                  key={doc.id}
                  style={[
                    styles.doctorCard,
                    isSelected && {
                      borderColor: accent.badgeBorder,
                      backgroundColor: accent.badgeBg,
                    },
                  ]}
                  onPress={() => handleSelect(doc)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: "#0f172a",
                        borderColor: accent.badgeBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.avatarText, { color: accent.badgeText }]}
                    >
                      {doc.initials}
                    </Text>
                  </View>

                  <View style={styles.doctorDetails}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text
                      style={[styles.docRole, { color: accent.badgeText }]}
                    >
                      {doc.role}
                    </Text>
                    <Text style={styles.docDevice}>{doc.device}</Text>
                  </View>

                  {isSelected && (
                    <View
                      style={[
                        styles.checkCircle,
                        { backgroundColor: accent.accentColor },
                      ]}
                    >
                      <Check size={14} color="#0f172a" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
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
    maxHeight: "80%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#94a3b8",
    paddingHorizontal: 20,
    paddingVertical: 12,
    lineHeight: 16,
  },
  list: {
    paddingHorizontal: 20,
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  doctorDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
  },
  docRole: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  docDevice: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "monospace",
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
