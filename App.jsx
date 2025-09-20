import { useState, useEffect, useCallback } from 'react'
import { Provider as PaperProvider } from 'react-native-paper'
import * as Font from 'expo-font'
import AsyncStorage from '@react-native-async-storage/async-storage'
import StackNavigator from './components/navigator/StackNavigator'
import lightTheme from './components/themes/lightTheme'
import darkTheme from './components/themes/darkTheme'
import { ThemeContext } from './components/themes/themeContext'
import { ActivityIndicator, View } from 'react-native'
import './components/hooks/backgroundLocationTask'
import { Suspense, lazy } from 'react'

// Lazy components
const NotificationProvider = lazy(() =>
  import('./context/NotificationContext').then(mod => ({ default: mod.NotificationProvider }))
)
const UpdatePrompt = lazy(() =>
  import('./components/customComponents/UpdatePrompt')
)

const THEME_KEY = 'appTheme'

const App = () => {
  const [theme, setTheme] = useState(lightTheme) // default immediately
  const [ready, setReady] = useState(false)

  // Load fonts async but don’t block UI
  const loadFonts = async () => {
    try {
      await Font.loadAsync({
        'Onest-Regular': require('./assets/fonts/Onest-Regular.ttf'),
        'Onest-Bold': require('./assets/fonts/Onest-Bold.ttf'),
      })
    } catch (err) {
      console.warn('Font load failed:', err)
    }
  }

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_KEY)
      if (storedTheme === 'dark') setTheme(darkTheme)
    } catch (err) {
      console.warn('Theme load failed:', err)
    }
  }

  const initialize = useCallback(async () => {
    await Promise.all([loadFonts(), loadTheme()])
    setReady(true)
  }, [])

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <PaperProvider theme={theme}>
        <Suspense fallback={<StackNavigator />}>
          <NotificationProvider>
            <StackNavigator />
            <UpdatePrompt />
          </NotificationProvider>
        </Suspense>
      </PaperProvider>
    </ThemeContext.Provider>
  )
}

export default App