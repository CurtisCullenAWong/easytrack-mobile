import { createNativeStackNavigator } from '@react-navigation/native-stack'

import Messages from '../../screens/messaging/Messages'
import NewMessage from '../../screens/messaging/NewMessage'
import ViewMessage from '../../screens/messaging/ViewMessage'
import ViewProfile from '../../screens/messaging/ViewProfile'

const Stack = createNativeStackNavigator()

const MessagingNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MessagesHome" component={Messages} />
      <Stack.Screen name="NewMessage" component={NewMessage} />
      <Stack.Screen name="ViewMessage" component={ViewMessage} />
      <Stack.Screen name="ViewProfile" component={ViewProfile} />
    </Stack.Navigator>
  )
}

export default MessagingNavigator
