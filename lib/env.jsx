import Constants from 'expo-constants'
import * as Updates from 'expo-updates'

export function resolveExtra() {
  if (Constants?.expoConfig?.extra) return Constants.expoConfig.extra
  if (Updates?.manifest && 'extra' in Updates.manifest) {
    return Updates.manifest.extra ?? {}
  }
  return {}
}