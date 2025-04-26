import { DefaultTheme } from 'react-native-paper'
import { colorConfigLight } from './colorConfig'
import { fontConfig } from './fontConfig'

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colorConfigLight,
  },
  fonts: {
    ...DefaultTheme.fonts,
    ...fontConfig,
  },
}

export default lightTheme