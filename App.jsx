import React, { useState, useEffect } from 'react'
import { Provider as PaperProvider } from 'react-native-paper'
import * as Font from 'expo-font'
import AsyncStorage from '@react-native-async-storage/async-storage'
import StackNavigator from './components/navigator/StackNavigator'
import lightTheme from './components/themes/lightTheme'
import darkTheme from './components/themes/darkTheme'
import { ThemeContext } from './components/themes/themeContext'
import { ActivityIndicator, View } from 'react-native'

const THEME_KEY = 'appTheme'

const App = () => {
  const [theme, setTheme] = useState(lightTheme)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [themeLoaded, setThemeLoaded] = useState(false)

  const loadFonts = async () => {
    try {
      await Font.loadAsync({
        'Onest-Regular': require('./assets/fonts/Onest-Regular.ttf'),
        'Onest-Bold': require('./assets/fonts/Onest-Bold.ttf'),
      })
      setFontsLoaded(true)
    } catch (error) {
      console.error('Error loading fonts:', error)
    }
  }

  // Load theme from AsyncStorage
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
    } finally {
      setThemeLoaded(true)
    }
  }

  useEffect(() => {
    loadFonts()
    loadTheme()
  }, [])

  // Save theme to AsyncStorage when toggled
  const toggleTheme = async () => {
    const newTheme = theme === lightTheme ? darkTheme : lightTheme
    setTheme(newTheme)
    await AsyncStorage.setItem(THEME_KEY, newTheme === darkTheme ? 'dark' : 'light')
  }

  if (!fontsLoaded || !themeLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <ThemeContext.Provider value={{ toggleTheme, theme }}>
      <PaperProvider theme={theme}>
        <StackNavigator />
      </PaperProvider>
    </ThemeContext.Provider>
  )
}

export default App