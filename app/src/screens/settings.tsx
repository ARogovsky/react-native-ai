import { View, Text, StyleSheet, TouchableHighlight, ScrollView } from 'react-native'
import { useContext } from 'react'
import { ThemeContext } from '../context'
import { useClerk } from '@clerk/expo'
import * as themes from '../theme'
import { t } from '../lib/i18n'

const _themes = Object.values(themes).map((v: any) => ({ name: v.name, label: v.label }))

export function Settings() {
  const { theme, setTheme, themeName } = useContext(ThemeContext)
  const { signOut } = useClerk()
  const styles = getStyles(theme)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.titleContainer}>
        <Text style={styles.mainText}>Theme</Text>
      </View>
      {_themes.map((value, index) => (
        <TouchableHighlight key={index} underlayColor="transparent" onPress={() => setTheme(value.label)}>
          <View style={{ ...styles.choiceButton, ...activeView(themeName, value.label, theme) }}>
            <Text style={{ ...styles.choiceText, ...activeText(themeName, value.label, theme) }}>
              {value.name}
            </Text>
          </View>
        </TouchableHighlight>
      ))}

      <TouchableHighlight underlayColor="transparent" onPress={() => signOut()}>
        <View style={[styles.choiceButton, styles.signOut]}>
          <Text style={[styles.choiceText, { color: theme.tintTextColor }]}>{t.signOut}</Text>
        </View>
      </TouchableHighlight>
    </ScrollView>
  )
}

function activeText(base: string, label: string, theme: any) {
  return label === base ? { color: theme.tintTextColor } : {}
}
function activeView(base: string, label: string, theme: any) {
  return label === base ? { backgroundColor: theme.tintColor } : {}
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: { padding: 14, flex: 1, backgroundColor: theme.backgroundColor, paddingTop: 10 },
    contentContainer: { paddingBottom: 40 },
    titleContainer: { paddingVertical: 10, paddingHorizontal: 15, marginTop: 10 },
    choiceButton: { padding: 15, borderRadius: 8, flexDirection: 'row' },
    choiceText: { fontFamily: theme.semiBoldFont, color: theme.textColor },
    signOut: { backgroundColor: theme.tintColor, justifyContent: 'center', marginTop: 24 },
    mainText: { fontFamily: theme.boldFont, fontSize: 18, color: theme.textColor },
  })
