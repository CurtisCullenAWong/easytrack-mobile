import { DefaultTheme } from 'react-native-paper'
import { colorConfigDark } from './colorConfig'
import { fontConfig } from './fontConfig'

const darkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colorConfigDark,
  },
  fonts: {
    ...DefaultTheme.fonts,
    ...fontConfig,
  },
}

export default darkTheme