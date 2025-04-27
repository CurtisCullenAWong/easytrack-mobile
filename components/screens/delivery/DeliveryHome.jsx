import React from 'react'
import { ScrollView, Dimensions, FlatList, View, StyleSheet } from 'react-native'
import { Text, Button, Surface, Card, Title, Paragraph, useTheme } from 'react-native-paper'
import Header from '../../customComponents/Header'

const { width } = Dimensions.get('window')

const DeliveryHome = ({ navigation }) => {
    const { colors, fonts } = useTheme()

    const images = [
        require('../../../assets/airport1.png'),
        require('../../../assets/airport2.png'),
        require('../../../assets/airport3.png')
    ]
    
    const performanceImages = [
        require('../../../assets/delivery1.png'),
        require('../../../assets/delivery2.png'),
        require('../../../assets/delivery3.png')
    ]

    const renderItem = ({ item }) => (
        <Card style={[styles.card, { backgroundColor: colors.surface, elevation: colors.elevation.level1 }]}>
            <Card.Cover source={item} style={styles.cardCover} />
        </Card>
    )

    const buttons = [
        { label: 'Contracting', icon: 'file-document-outline', screen: 'Contracting' },
        { label: 'Delivery History', icon: 'history', screen: 'DeliveryHistory' },
        { label: 'Performance Statistics', icon: 'chart-line', screen: 'PerformanceStatistics' },
    ]

    return (
        <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
            <Header navigation={navigation} />

            <View style={styles.container}>
                <Title style={[styles.title, { color: colors.onBackground, ...fonts.titleLarge }]}>
                    Welcome Back!
                </Title>
                <Text variant="bodyMedium" style={[styles.subTitle, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>
                    Hi, Delivery Partner
                </Text>

                <FlatList
                    data={images}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    contentContainerStyle={styles.flatList}
                />

                <Paragraph style={[styles.paragraph, { color: colors.onBackground, ...fonts.bodyLarge }]}>
                    Efficient and reliable delivery services to meet customer needs. Manage your contracts, track deliveries, and analyze performance.
                </Paragraph>

                <View style={styles.buttonContainer}>
                    {buttons.map(({ label, icon, screen }) => (
                        <Button
                            key={label}
                            icon={icon}
                            mode="contained"
                            style={[styles.button, { backgroundColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            onPress={() => navigation.navigate(screen)}
                            labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
                        >
                            {label}
                        </Button>
                    ))}
                </View>

                <FlatList
                    data={performanceImages}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    contentContainerStyle={styles.flatList}
                />

                <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
                    <Text variant="bodyMedium" style={[styles.surfaceText, { color: colors.onSurface, ...fonts.bodyMedium }]}>
                        “Analyze your delivery performance, track contracts, and improve your efficiency with real-time data analytics.”
                    </Text>
                </Surface>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        textAlign: 'center',
        marginTop: 10,
    },
    subTitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    flatList: {
        paddingVertical: 10,
    },
    card: {
        width: width * 0.85,
        marginRight: 16,
        borderRadius: 10,
        overflow: 'hidden',
    },
    cardCover: {
        height: 230,
    },
    paragraph: {
        fontSize: 16,
        textAlign: 'center',
        marginVertical: 20,
    },
    buttonContainer: {
        marginBottom: 10,
        alignItems: 'center',
    },
    button: {
        marginVertical: 6,
        width: '90%',
    },
    buttonContent: {
        height: 48,
        justifyContent: 'center',
    },
    buttonLabel: {
        fontSize: 16,
    },
    surface: {
        padding: 16,
        marginVertical: 20,
        marginHorizontal: 10,
        borderRadius: 8,
    },
    surfaceText: {
        textAlign: 'center',
    },
})

export default DeliveryHome
