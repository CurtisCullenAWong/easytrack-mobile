import React from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    Dimensions,
    FlatList,
} from 'react-native';
import {
    Text,
    Button,
    useTheme,
    Surface,
    Card,
    Title,
    Paragraph,
} from 'react-native-paper';
import Header from '../../customComponents/Header';

const { width } = Dimensions.get('window');

const AirlineHome = ({ navigation }) => {
    const { colors } = useTheme();

    const images = [
        require('../../../assets/airport1.png'),
        require('../../../assets/airport2.png'),
        require('../../../assets/airport3.png'),
    ];

    const renderItem = ({ item }) => (
        <Card style={styles.carouselItem} mode="elevated">
            <Card.Cover source={item} style={styles.carouselImage} />
        </Card>
    );

    return (
        <ScrollView style={{ backgroundColor: colors.background, flex: 1 }}>
            <Header navigation={navigation} />

            <View style={styles.innerContainer}>
                <Title style={styles.welcomeText}>Welcome Aboard!</Title>
                <Text variant="bodyMedium" style={styles.userName}>
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
                    />
                ) : (
                    <Text style={styles.errorText}>No images available.</Text>
                )}

                <Paragraph style={styles.description}>
                    Manage luggage bookings, track delivery statuses, and ensure smooth handling of passenger belongings.
                </Paragraph>

                <View style={styles.buttonContainer}>
                    <Button
                        icon="send"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('BookDelivery')}
                    >
                        Book Delivery
                    </Button>
                    <Button
                        icon="clock-outline"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('PendingDeliveries')}
                    >
                        Pending Deliveries
                    </Button>
                    <Button
                        icon="account"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('DeliveryPartners')}
                    >
                        Delivery Partners
                    </Button>
                </View>

                <Surface style={styles.footerSurface} elevation={2}>
                    <Text variant="bodyMedium" style={styles.footerText}>
                        “Keep every delivery smooth and every passenger satisfied. You're the bridge between service and success.”
                    </Text>
                </Surface>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    innerContainer: {
        padding: 16,
    },
    welcomeText: {
        fontSize: 24,
        textAlign: 'center',
        marginTop: 10,
    },
    userName: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
    },
    carouselItem: {
        width: width * 0.85,
        marginRight: 16,
        borderRadius: 10,
        overflow: 'hidden',
    },
    carouselImage: {
        height: 230,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginVertical: 20,
    },
    buttonContainer: {
        marginTop: 10,
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
    footerSurface: {
        padding: 16,
        marginVertical: 20,
        marginHorizontal: 10,
        borderRadius: 8,
    },
    footerText: {
        textAlign: 'center',
        color: '#333',
    },
    errorText: {
        textAlign: 'center',
        color: 'red',
        fontSize: 16,
        marginVertical: 10,
    },
});

export default AirlineHome;
