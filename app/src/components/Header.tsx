import {
  StyleSheet, View, TouchableHighlight
} from 'react-native'
import { useContext } from 'react'
import { Icon } from './Icon'
import { ThemeContext } from '../../src/context'
import { useChat } from '../ChatProvider'
import FontAwesome from '@expo/vector-icons/FontAwesome5'

export function Header() {
  const { theme } = useContext(ThemeContext)
  const { openMenu } = useChat()
  const styles = getStyles(theme)

  return (
    <View style={styles.container}>
      <Icon size={34} fill={theme.textColor} />
      <TouchableHighlight
        style={styles.buttonContainer}
        testID="header-menu"
        underlayColor={'transparent'}
        activeOpacity={0.6}
        onPress={openMenu}
      >
        <FontAwesome
          name="bars"
          size={20}
          color={theme.textColor}
        />
      </TouchableHighlight>
    </View>
  )
}

function getStyles(theme:any) {
  return StyleSheet.create({
    buttonContainer: {
      position: 'absolute', right: 15,
      padding: 15
    },
    container: {
      paddingVertical: 15,
      backgroundColor: theme.backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor
    }
  })
}