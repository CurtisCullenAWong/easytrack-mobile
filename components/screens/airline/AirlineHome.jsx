import React from 'react'
import { ScrollView, View, Dimensions, FlatList } from 'react-native'
import { Text, Button, useTheme, Surface, Card, Title, Paragraph } from 'react-native-paper'
import Header from '../../customComponents/Header'

const { width } = Dimensions.get('window')

const AirlineHome = ({ navigation }) => {
  const { colors, fonts } = useTheme()

  const images = [
    require('../../../assets/airport1.png'),
    require('../../../assets/airport2.png'),
    require('../../../assets/airport3.png'),
  ]

  const renderItem = ({ item }) => (
    <Card
      style={{
        width: width * 0.85,
        marginRight: 16,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: colors.surface,
      }}
      mode="elevated"
    >
      <Card.Cover source={item} style={{ height: 230 }} />
    </Card>
  )

  return (
    <ScrollView style={{ backgroundColor: colors.background, flex: 1 }}>
      <Header navigation={navigation} />

      <View style={{ padding: 16 }}>
        <Title style={{ textAlign: 'center', marginTop: 10, color: colors.onBackground, ...fonts.titleLarge }}>
          Welcome Aboard!
        </Title>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.onBackground, ...fonts.titleMedium }}>
          Hi, Airline Staff
        </Text>

        {images.length > 0 ? (
          <FlatList
            data={images}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            contentContainerStyle={{ paddingVertical: 10 }}
          />
        ) : (
          <Text style={{ textAlign: 'center', marginVertical: 10, color: colors.error, ...fonts.bodyLarge }}>
            No images available.
          </Text>
        )}

        <Paragraph style={{ textAlign: 'center', marginVertical: 20, color: colors.onBackground, ...fonts.bodyLarge }}>
          Manage luggage bookings, track delivery statuses, and ensure smooth handling of passenger belongings.
        </Paragraph>

        <View style={{ marginBottom: 10, alignItems: 'center' }}>
          <Button
            icon="send"
            mode="contained"
            style={{ marginVertical: 6, width: '90%', backgroundColor: colors.primary }}
            contentStyle={{ height: 48, justifyContent: 'center' }}
            onPress={() => navigation.navigate('BookDelivery')}
            labelStyle={{ ...fonts.labelLarge, color: colors.onPrimary }}
          >
            Book Delivery
          </Button>
          <Button
            icon="clock-outline"
            mode="contained"
            style={{ marginVertical: 6, width: '90%', backgroundColor: colors.primary }}
            contentStyle={{ height: 48, justifyContent: 'center' }}
            onPress={() => navigation.navigate('PendingDeliveries')}
            labelStyle={{ ...fonts.labelLarge, color: colors.onPrimary }}
          >
            Pending Deliveries
          </Button>
          <Button
            icon="account"
            mode="contained"
            style={{ marginVertical: 6, width: '90%', backgroundColor: colors.primary }}
            contentStyle={{ height: 48, justifyContent: 'center' }}
            onPress={() => navigation.navigate('DeliveryPartners')}
            labelStyle={{ ...fonts.labelLarge, color: colors.onPrimary }}
          >
            Delivery Partners
          </Button>
        </View>

        <Surface
          style={{
            padding: 16,
            marginVertical: 20,
            marginHorizontal: 10,
            borderRadius: 8,
            backgroundColor: colors.surface,
          }}
          elevation={1}
        >
          <Text style={{ textAlign: 'center', color: colors.onSurface, ...fonts.bodyMedium }}>
            “Keep every delivery smooth and every passenger satisfied. You're the bridge between service and success.”
          </Text>
        </Surface>
      </View>
    </ScrollView>
  )
}

export default AirlineHome
