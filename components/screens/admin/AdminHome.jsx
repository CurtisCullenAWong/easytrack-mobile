import React from 'react'
import { ScrollView, View, Dimensions, FlatList } from 'react-native'
import { Text, Button, Surface, Card, Title, Paragraph, useTheme } from 'react-native-paper'
import Header from '../../customComponents/Header'

const { width } = Dimensions.get('window')

const AdminHome = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const images = [
    require('../../../assets/airport1.png'),
    require('../../../assets/airport2.png'),
    require('../../../assets/airport3.png'),
  ]

  const renderItem = ({ item }) => (
    <Card style={{ width: width * 0.85, marginRight: 16, borderRadius: 10, backgroundColor: colors.surface, elevation: colors.elevation.level1 }}>
      <Card.Cover source={item} style={{ height: 230 }} />
    </Card>
  )

  const buttons = [
    { label: 'User Management', icon: 'account-group', screen: 'UserManagement' },
    { label: 'Contracts', icon: 'file-document', screen: 'AdminContracts' },
    { label: 'History', icon: 'history', screen: 'AdminHistory' },
    { label: 'Statistics', icon: 'chart-bar', screen: 'AdminStatistics' },
  ]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header navigation={navigation} />
      <View style={{ padding: 16 }}>
        <Title style={{ textAlign: 'center', marginTop: 10, color: colors.onBackground, ...fonts.titleLarge }}>Welcome Admin!</Title>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.onBackground, ...fonts.titleMedium }}>Hi, System Administrator</Text>

        {images.length ? (
          <FlatList
            data={images}
            renderItem={renderItem}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 10 }}
          />
        ) : (
          <Text style={{ textAlign: 'center', marginVertical: 10, color: colors.error, ...fonts.bodyLarge }}>
            No images available.
          </Text>
        )}

        <Paragraph style={{ textAlign: 'center', marginVertical: 20, color: colors.onBackground, ...fonts.bodyLarge }}>
          Monitor system activities, manage user roles, and maintain platform efficiency. Access analytics, logs, and control permissions in real-time.
        </Paragraph>

        <View style={{ marginBottom: 10, alignItems: 'center' }}>
          {buttons.map(({ label, icon, screen }) => (
            <Button
              key={label}
              icon={icon}
              mode="contained"
              style={{ marginVertical: 6, width: '90%', backgroundColor: colors.primary }}
              contentStyle={{ height: 48 }}
              onPress={() => navigation.navigate(screen)}
              labelStyle={{ ...fonts.labelLarge, color: colors.onPrimary }}
            >
              {label}
            </Button>
          ))}
        </View>

        <Surface style={{ padding: 16, marginVertical: 20, marginHorizontal: 10, borderRadius: 8, backgroundColor: colors.surface }} elevation={1}>
          <Text style={{ textAlign: 'center', color: colors.onSurface, ...fonts.bodyMedium }}>
            “Stay in control of your platform. Empower users, track system activity, and ensure smooth operations.”
          </Text>
        </Surface>
      </View>
    </ScrollView>
  )
}

export default AdminHome
