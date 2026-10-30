import React, { useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ConnectionProvider, useConnection } from "./src/context/ConnectionContext";
import { Header } from "./src/components/Header";
import { StandbyScreen } from "./src/components/StandbyScreen";
import { AlertScreen } from "./src/components/AlertScreen";
import { ClaimedScreen } from "./src/components/ClaimedScreen";
import { LockedScreen } from "./src/components/LockedScreen";
import { NetworkSettingsModal } from "./src/components/NetworkSettingsModal";
import { DoctorRosterModal } from "./src/components/DoctorRosterModal";

function MainDoctorApp() {
  const { alert, claim, selectedDoctor } = useConnection();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [rosterVisible, setRosterVisible] = useState(false);

  // Screen selection
  let content: React.ReactNode;

  if (alert && claim) {
    if (claim.doctor_id === selectedDoctor.id) {
      content = <ClaimedScreen alert={alert} claim={claim} />;
    } else {
      content = <LockedScreen alert={alert} claim={claim} />;
    }
  } else if (alert) {
    content = <AlertScreen alert={alert} />;
  } else {
    content = <StandbyScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Header
          onOpenSettings={() => setSettingsVisible(true)}
          onOpenRoster={() => setRosterVisible(true)}
        />
        <View style={styles.contentWrap}>{content}</View>

        {/* Modals */}
        <NetworkSettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />
        <DoctorRosterModal
          visible={rosterVisible}
          onClose={() => setRosterVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ConnectionProvider>
      <MainDoctorApp />
    </ConnectionProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  contentWrap: {
    flex: 1,
  },
});
