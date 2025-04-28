import React, { useState, useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import * as Font from 'expo-font';
import StackNavigator from './components/navigator/StackNavigator';
import lightTheme from './components/themes/lightTheme';
import darkTheme from './components/themes/darkTheme';
import { ThemeContext } from './components/themes/themeContext';

const App = () => {
  const [theme, setTheme] = useState(lightTheme);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const loadFonts = async () => {
    await Font.loadAsync({
      'Onest-Regular': require('./assets/fonts/Onest-Regular.ttf'), // <-- your font file
      'Onest-Bold': require('./assets/fonts/Onest-Bold.ttf'), // <-- your font file
    });
    setFontsLoaded(true);
  };

  useEffect(() => {
    loadFonts();
  }, []);


  const toggleTheme = () => {
    setTheme(theme === lightTheme ? darkTheme : lightTheme);
  };

  if (!fontsLoaded) {
    return null; // still loading
  }

  return (
    <ThemeContext.Provider value={{ toggleTheme, theme }}>
      <PaperProvider theme={theme}>
        <StackNavigator />
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export default App;
