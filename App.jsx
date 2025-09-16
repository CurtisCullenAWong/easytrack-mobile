import { useState, useEffect } from 'react'
import { Provider as PaperProvider } from 'react-native-paper'
import * as Font from 'expo-font'
import AsyncStorage from '@react-native-async-storage/async-storage'
import StackNavigator from './components/navigator/StackNavigator'
import lightTheme from './components/themes/lightTheme'
import darkTheme from './components/themes/darkTheme'
import { ThemeContext } from './components/themes/themeContext'
import { ActivityIndicator, View, Text } from 'react-native'
import UpdatePrompt from './components/customComponents/UpdatePrompt'
import './components/hooks/backgroundLocationTask'
const THEME_KEY = 'appTheme'

const App = () => {
  const [theme, setTheme] = useState(lightTheme)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [themeLoaded, setThemeLoaded] = useState(false)
  const [error, setError] = useState(null)

  const loadFonts = async () => {
    try {
      await Font.loadAsync({
        'Onest-Regular': require('./assets/fonts/Onest-Regular.ttf'),
        'Onest-Bold': require('./assets/fonts/Onest-Bold.ttf'),
      })
      setFontsLoaded(true)
    } catch (error) {
      console.error('Error loading fonts:', error)
      setFontsLoaded(true)
    }
  }

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_KEY)
      setTheme(storedTheme === 'dark' ? darkTheme : lightTheme)
    } catch (error) {
      console.error('Error loading theme:', error)
      setTheme(lightTheme)
    } finally {
      setThemeLoaded(true)
    }
  }

  const toggleTheme = async () => {
    try {
      const newTheme = theme === lightTheme ? darkTheme : lightTheme
      setTheme(newTheme)
      await AsyncStorage.setItem(THEME_KEY, newTheme === darkTheme ? 'dark' : 'light')
    } catch (error) {
      console.error('Error saving theme:', error)
    }
  }
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([loadFonts(), loadTheme()])
      } catch (error) {
        console.error('Error initializing app:', error)
        setError('Failed to initialize app. Please restart the app.')
      }
    }
    initializeApp()
  }, [])

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>Error: {error}</Text>
        <Text>Please restart the app or contact support if the issue persists.</Text>
      </View>
    )
  }

  if (!fontsLoaded || !themeLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ marginBottom: 10, color: theme.colors.onSurface, ...theme.fonts.bodyLarge }}>Loading fonts and theme...</Text>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
        <PaperProvider theme={theme}>
          <StackNavigator />
          <UpdatePrompt />
        </PaperProvider>
    </ThemeContext.Provider>
  )
}

export default App