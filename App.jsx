import React, { useState } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import StackNavigator from './components/navigator/StackNavigator';
import lightTheme from './components/themes/lightTheme';
import darkTheme from './components/themes/darkTheme';
import { ThemeContext } from './components/themes/themeContext';

const App = () => {
  const [theme, setTheme] = useState(lightTheme);

  const toggleTheme = () => {
    setTheme(theme === lightTheme ? darkTheme : lightTheme);
  };

  return (
    <ThemeContext.Provider value={{ toggleTheme, theme }}>
      <PaperProvider theme={theme}>
        <StackNavigator />
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export default App;
