import React from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { Avatar, Card, Text, Divider } from 'react-native-paper';
import Header from '../customComponents/Header';

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
];

const MessageCenterScreen = ({ navigation }) => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ paddingVertical: 10 }}>
      <Header title="Message Center" navigation={navigation}/>
      {messages.map((item, index) => (
        <View key={item.id}>
          <TouchableOpacity onPress={() => navigation.navigate('ChatRoom', { userId: item.id })}>
            <Card style={{ marginVertical: 4, marginHorizontal: 10 }}>
              <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Image size={48} source={{ uri: item.avatar }} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text variant="titleMedium">{item.name}</Text>
                  <Text numberOfLines={1} style={{ color: 'gray' }}>
                    {item.lastMessage}
                  </Text>
                </View>
                <Text style={{ color: 'gray', fontSize: 12 }}>{item.time}</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
          {index !== messages.length - 1 && <Divider style={{ marginHorizontal: 10 }} />}
        </View>
      ))}
    </ScrollView>
  );
};

export default MessageCenterScreen;
