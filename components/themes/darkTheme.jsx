import { DefaultTheme } from 'react-native-paper';
import { colorConfigDark } from './colorConfig';
import fontConfig from './fontConfig';

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colorConfigDark,
  },
  fonts: {
    ...DefaultTheme.fonts,
    ...fontConfig,
  },
};

export default lightTheme;