import { useState, useEffect } from 'react'
import { Provider as PaperProvider } from 'react-native-paper'
import * as Font from 'expo-font'
import * as Updates from 'expo-updates'
import AsyncStorage from '@react-native-async-storage/async-storage'
import StackNavigator from './components/navigator/StackNavigator'
import lightTheme from './components/themes/lightTheme'
import darkTheme from './components/themes/darkTheme'
import { ThemeContext } from './components/themes/themeContext'
import { ActivityIndicator, View, Text } from 'react-native'
import useAuth from './components/hooks/useAuth'

const THEME_KEY = 'appTheme'

const App = () => {
  const [theme, setTheme] = useState(lightTheme)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [themeLoaded, setThemeLoaded] = useState(false)
  const [error, setError] = useState(null)
  const { checkSession, checkForUpdates } = useAuth()

  async function onFetchUpdateAsync() {
    try {
    const update = await Updates.checkForUpdateAsync()
    
    if (update.isAvailable) {
    await Updates.fetchUpdateAsync()
    await Updates.reloadAsync()
    }
    } catch (error) {
    // You can also add an alert() to see the error message in case of an error when fetching updates.
    alert('Error fetching latest Expo update: ${error}')
    }
  }
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

  const toggleTheme = async () => {
    try {
      const newTheme = theme === lightTheme ? darkTheme : lightTheme
      setTheme(newTheme)
      await AsyncStorage.setItem(THEME_KEY, newTheme === darkTheme ? 'dark' : 'light')
    } catch (error) {
      console.error('Error saving theme:', error)
    }
  }

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_KEY)
      if (storedTheme === 'dark') {
        setTheme(darkTheme)
      } else {
        setTheme(lightTheme)
      }
    } catch (error) {
      console.error('Error loading theme:', error)
      setTheme(lightTheme)
    } finally {
      setThemeLoaded(true)
    }
  }

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Promise.all([
          onFetchUpdateAsync(),
          loadFonts(),
          loadTheme(),
        ])
        
        if (fontsLoaded && themeLoaded) {
          await checkSession()
          await checkForUpdates()
        }
      } catch (error) {
        console.error('Error initializing app:', error)
        setError('Failed to initialize app. Please restart the app.')
      }
    }

    initializeApp()
  }, [fontsLoaded, themeLoaded])

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <PaperProvider theme={theme}>
        <StackNavigator />
      </PaperProvider>
    </ThemeContext.Provider>
  )
}

export default App