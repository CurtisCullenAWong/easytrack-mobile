import React from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    Image,
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
    IconButton,
} from 'react-native-paper';
import Header from '../../customComponents/Header';

const { width } = Dimensions.get('window');

const DeliveryHome = ({ navigation }) => {
    const { colors } = useTheme();

    const images = [
        require('../../../assets/airport1.png'),
        require('../../../assets/airport2.png'),
        require('../../../assets/airport3.png'),
    ];

    const performanceImages = [
        require('../../../assets/delivery1.png'),
        require('../../../assets/delivery2.png'),
        require('../../../assets/delivery3.png'),
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
                <Title style={styles.welcomeText}>Welcome Back!</Title>
                <Text variant="bodyMedium" style={styles.userName}>
                    Hi, Delivery Partner
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
                    Efficient and reliable delivery services to meet customer needs.
                    Manage your contracts, track deliveries, and analyze performance.
                </Paragraph>

                <View style={styles.buttonContainer}>
                    <Button
                        icon="file-document-outline"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('Contracting')}
                    >
                        Contracting
                    </Button>
                    <Button
                        icon="history"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('DeliveryHistory')}
                    >
                        Delivery History
                    </Button>
                    <Button
                        icon="chart-line"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('PerformanceAnalytics')}
                    >
                        Performance Analytics
                    </Button>
                </View>


                {performanceImages.length > 0 ? (
                    <FlatList
                        data={performanceImages}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => index.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        pagingEnabled
                    />
                ) : (
                    <Text style={styles.errorText}>No images available.</Text>
                )}

                <Surface style={styles.footerSurface} elevation={2}>
                    <Text variant="bodyMedium" style={styles.footerText}>
                        “Analyze your delivery performance, track contracts, and improve
                        your efficiency with real-time data analytics.”
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

export default DeliveryHome;
