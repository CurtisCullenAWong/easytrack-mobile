import React, { useState, useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import StackNavigator from './components/navigator/StackNavigator';
import lightTheme from './components/themes/lightTheme';
import darkTheme from './components/themes/darkTheme';
import { ThemeContext } from './components/themes/themeContext';

// Prevent auto hiding the splash screen
SplashScreen.preventAutoHideAsync();

const App = () => {
  const [theme, setTheme] = useState(lightTheme);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const loadFonts = async () => {
    await Font.loadAsync({
      'Onest-Regular': require('./assets/fonts/Onest-Regular.ttf'), // <-- your font file
    });
    setFontsLoaded(true);
  };

  useEffect(() => {
    loadFonts();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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
