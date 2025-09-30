import { useState, useEffect } from 'react'
import { Provider as PaperProvider } from 'react-native-paper'
import * as Font from 'expo-font'
import AsyncStorage from '@react-native-async-storage/async-storage'
import StackNavigator from './components/navigator/StackNavigator'
import lightTheme from './components/themes/lightTheme'
import darkTheme from './components/themes/darkTheme'
import { ThemeContext } from './components/themes/themeContext'
import { ActivityIndicator, View } from 'react-native'
import './components/hooks/backgroundLocationTask'
import { NotificationProvider } from './context/NotificationContext'
import UpdatePrompt from './components/customComponents/UpdatePrompt'

const THEME_KEY = 'appTheme'

export default function App() {
  const [theme, setTheme] = useState(lightTheme)
  const [ready, setReady] = useState(false)

  const toggleTheme = async () => {
    try {
      const newTheme = theme === lightTheme ? darkTheme : lightTheme
      setTheme(newTheme)
      await AsyncStorage.setItem(
        THEME_KEY,
        newTheme === darkTheme ? 'dark' : 'light'
      )
    } catch (error) {
      console.error('Error saving theme:', error)
    }
  }

  const loadFontsAndTheme = async () => {
    try {
      await Font.loadAsync({
        'Onest-Regular': require('./assets/fonts/Onest-Regular.ttf'),
        'Onest-Bold': require('./assets/fonts/Onest-Bold.ttf'),
      })
      const storedTheme = await AsyncStorage.getItem(THEME_KEY)
      if (storedTheme === 'dark') setTheme(darkTheme)
    } catch (err) {
      console.warn('Fonts and theme loading failed:', err)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await loadFontsAndTheme()
      setReady(true)
    }
    initialize()
  }, [])

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <PaperProvider theme={theme}>
        <NotificationProvider>
          <StackNavigator />
          <UpdatePrompt />
        </NotificationProvider>
      </PaperProvider>
    </ThemeContext.Provider>
  )
}