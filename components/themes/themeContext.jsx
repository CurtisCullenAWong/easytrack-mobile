import { createContext } from 'react';

export const ThemeContext = createContext({
  toggleTheme: () => {},
  theme: {},
});
