import React from 'react'
import { ScrollView, View, TouchableOpacity, StyleSheet } from 'react-native'
import { Avatar, Card, Text, Divider, useTheme } from 'react-native-paper'
import Header from '../customComponents/Header'

const messages = [
  {
    id: '1',
    name: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    lastMessage: 'Hey, are we still on for tomorrow?',
    time: '10:24 AM',
  },
  {
    id: '2',
    name: 'Jane Smith',
    avatar: 'https://i.pravatar.cc/150?img=2',
    lastMessage: 'Got your documents. Thanks!',
    time: '9:15 AM',
  },
  {
    id: '3',
    name: 'Airline Staff',
    avatar: 'https://i.pravatar.cc/150?img=3',
    lastMessage: 'Your luggage will arrive this afternoon.',
    time: 'Yesterday',
  },
]

const MessageCenterScreen = ({ navigation }) => {
  const { colors, fonts } = useTheme()

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Header title="Message Center" navigation={navigation} />
      {messages.map((item, index) => (
        <View key={item.id}>
          <TouchableOpacity onPress={() => navigation.navigate('ChatRoom', { userId: item.id })}>
            <Card style={[styles.card, { backgroundColor: colors.surface, elevation: colors.elevation.level2 }]}>
              <Card.Content style={styles.cardContent}>
                <Avatar.Image size={48} source={{ uri: item.avatar }} />
                <View style={styles.cardTextContainer}>
                  <Text style={{ color: colors.onSurface, ...fonts.titleMedium }}>
                    {item.name}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.onSurface, ...fonts.default }}>
                    {item.lastMessage}
                  </Text>
                </View>
                <Text style={{ color: colors.onSurface, ...fonts.labelMedium }}>
                  {item.time}
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
          {index !== messages.length - 1 && <Divider style={[styles.divider, { backgroundColor: colors.divider }]} />}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 10,
  },
  card: {
    marginVertical: 4,
    marginHorizontal: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  divider: {
    marginHorizontal: 10,
  },
})

export default MessageCenterScreen