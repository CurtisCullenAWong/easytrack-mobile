import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import StackNavigator from './components/navigator/StackNavigator';
import theme from './components/themes/theme';

const App = () => (
  <PaperProvider theme={theme}>
    <StackNavigator/>
  </PaperProvider>
);

export default App;
