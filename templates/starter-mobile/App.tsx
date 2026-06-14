import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, StyleSheet, Text, View } from 'react-native'

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="auto" />
      <View style={styles.container}>
        <Text style={styles.title}>{{ name }}</Text>
        <Text style={styles.subtitle}>Built with Nestor · React Native + Expo</Text>
        <Text style={styles.hint}>Runs on iOS & Android from one TypeScript codebase.</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0b0f' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#5e5ce6', fontSize: 34, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { color: '#f2f2f7', fontSize: 16, marginTop: 12, fontWeight: '600' },
  hint: { color: '#8e8e93', fontSize: 14, marginTop: 8, textAlign: 'center' },
})
