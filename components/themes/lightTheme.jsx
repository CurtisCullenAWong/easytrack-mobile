import { DefaultTheme, configureFonts } from 'react-native-paper';
import { colorConfigLight } from './colorConfig';
import fontConfig from './fontConfig';

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colorConfigLight,
  },
  fonts: {
    fonts: configureFonts({config: fontConfig, isV3: false}),
  },
};

export default lightTheme;