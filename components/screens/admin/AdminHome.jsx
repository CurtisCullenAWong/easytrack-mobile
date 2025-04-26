import React from 'react'
import {
    ScrollView,
    StyleSheet,
    View,
    Dimensions,
    FlatList,
} from 'react-native'
import {
    Text,
    Button,
    useTheme,
    Surface,
    Card,
    Title,
    Paragraph,
} from 'react-native-paper'
import Header from '../../customComponents/Header'

const { width } = Dimensions.get('window')

const AdminHome = ({ navigation }) => {
    const { colors } = useTheme()

    const images = [
        require('../../../assets/airport1.png'),
        require('../../../assets/airport2.png'),
        require('../../../assets/airport3.png'),
    ]

    const renderItem = ({ item }) => (
        <Card style={styles.carouselItem} mode="elevated">
            <Card.Cover source={item} style={styles.carouselImage} />
        </Card>
    )

    return (
        <ScrollView style={{ backgroundColor: colors.background, flex: 1 }}>
            <Header navigation={navigation} />

            <View style={styles.innerContainer}>
                <Title style={styles.welcomeText}>Welcome Admin!</Title>
                <Text variant="bodyMedium" style={styles.userName}>
                    Hi, System Administrator
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
                    Monitor system activities, manage user roles, and maintain overall platform efficiency. 
                    Access analytics, system logs, and control permissions in real-time.
                </Paragraph>

                <View style={styles.buttonContainer}>
                    <Button
                        icon="account-group"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('UserManagement')}
                    >
                        User Management
                    </Button>
                    <Button
                        icon="file-document"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('AdminContracts')}
                    >
                        Contracts
                    </Button>
                    <Button
                        icon="history"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('AdminHistory')}
                    >
                        History
                    </Button>
                    <Button
                        icon="chart-bar"
                        mode="contained"
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        onPress={() => navigation.navigate('AdminStatistics')}
                    >
                        Statistics
                    </Button>
                </View>


                <Surface style={styles.footerSurface} elevation={2}>
                    <Text variant="bodyMedium" style={styles.footerText}>
                        “Stay in control of your platform. Empower users, track system activity, and ensure smooth operations.”
                    </Text>
                </Surface>
            </View>
        </ScrollView>
    )
}

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
})

export default AdminHome