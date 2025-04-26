import { DefaultTheme } from 'react-native-paper'

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FAF9FF',
    primary: '#373E31',
    secondary: '#67854B',
    tertiary: '#616161',
    iconColor: '#373E31',
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      ...DefaultTheme.fonts.regular,
      fontFamily: 'Onest-Regular',
      fontWeight: 'normal',
    },
    medium: {
      ...DefaultTheme.fonts.medium,
      fontFamily: 'Onest-Medium',
      fontWeight: 'normal',
    },
    light: {
      ...DefaultTheme.fonts.light,
      fontFamily: 'Onest-Light',
      fontWeight: 'normal',
    },
    thin: {
      ...DefaultTheme.fonts.thin,
      fontFamily: 'Onest-Thin',
      fontWeight: 'normal',
    },
  },
}

export default theme
