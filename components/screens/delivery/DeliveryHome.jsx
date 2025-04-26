import React from 'react'
import { ScrollView, Dimensions, FlatList, View } from 'react-native'
import { Text, Button, useTheme, Surface, Card, Title, Paragraph } from 'react-native-paper'
import Header from '../../customComponents/Header'

const { width } = Dimensions.get('window')

const DeliveryHome = ({ navigation }) => {
    const { colors } = useTheme()
    const images = [require('../../../assets/airport1.png'), require('../../../assets/airport2.png'), require('../../../assets/airport3.png')]
    const performanceImages = [require('../../../assets/delivery1.png'), require('../../../assets/delivery2.png'), require('../../../assets/delivery3.png')]

    const renderItem = ({ item }) => (
        <Card style={{ width: width * 0.85, marginRight: 16, borderRadius: 10, overflow: 'hidden' }} mode="elevated">
            <Card.Cover source={item} style={{ height: 230 }} />
        </Card>
    )

    return (
        <ScrollView style={{ backgroundColor: colors.background, flex: 1 }}>
            <Header navigation={navigation} />
            <View style={{ padding: 16 }}>
                <Title style={{ fontSize: 24, textAlign: 'center', marginTop: 10, color: colors.onBackground }}>Welcome Back!</Title>
                <Text variant="bodyMedium" style={{ fontSize: 16, textAlign: 'center', marginBottom: 20, color: colors.onSurfaceVariant }}>
                    Hi, Delivery Partner
                </Text>

                <FlatList data={images} renderItem={renderItem} keyExtractor={(item, index) => index.toString()} horizontal showsHorizontalScrollIndicator={false} pagingEnabled />
                <Paragraph style={{ fontSize: 16, textAlign: 'center', marginVertical: 20, color: colors.onBackground }}>
                    Efficient and reliable delivery services to meet customer needs. Manage your contracts, track deliveries, and analyze performance.
                </Paragraph>

                <View style={{ marginBottom: 10, alignItems: 'center' }}>
                    {['Contracting', 'Delivery History', 'Performance Statistics'].map((route, idx) => (
                        <Button
                            key={idx}
                            icon={route === 'Contracting' ? 'file-document-outline' : route === 'Delivery History' ? 'history' : 'chart-line'}
                            mode="contained"
                            style={{ marginVertical: 6, width: '90%' }}
                            contentStyle={{ height: 48, justifyContent: 'center' }}
                            onPress={() => navigation.navigate(route)}
                        >
                            {route}
                        </Button>
                    ))}
                </View>

                <FlatList data={performanceImages} renderItem={renderItem} keyExtractor={(item, index) => index.toString()} horizontal showsHorizontalScrollIndicator={false} pagingEnabled />

                <Surface style={{ padding: 16, marginVertical: 20, marginHorizontal: 10, borderRadius: 8, backgroundColor: colors.surface }} elevation={2}>
                    <Text variant="bodyMedium" style={{ textAlign: 'center', color: colors.onSurface }}>
                        “Analyze your delivery performance, track contracts, and improve your efficiency with real-time data analytics.”
                    </Text>
                </Surface>
            </View>
        </ScrollView>
    )
}

export default DeliveryHome
