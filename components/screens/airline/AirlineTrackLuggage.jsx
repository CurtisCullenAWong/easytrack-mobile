import React from 'react';
import {
    View,
    ScrollView,
    Dimensions,
    Image,
    StyleSheet,
} from 'react-native';
import { Text, TextInput, Button, Surface, useTheme } from 'react-native-paper';
import Header from '../../customComponents/Header';

const { width, height } = Dimensions.get('window');

const AirlineTrackLuggage = ({ navigation }) => {
    const [trackingNumber, setTrackingNumber] = React.useState('');
    const { colors, fonts } = useTheme();

    return (
        <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
            <Header navigation={navigation} title={'Track Luggage'}/>

            <View style={styles.container}>
                <Text
                    style={[
                        styles.title,
                        { ...fonts.headlineMedium, color: colors.primary },
                    ]}
                >
                    Track your shipment
                </Text>
                <Text
                    style={[
                        styles.subtitle,
                        { ...fonts.default, color: colors.tertiary },
                    ]}
                >
                    Please enter your tracking number
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        mode="outlined"
                        placeholder="Enter track number"
                        value={trackingNumber}
                        onChangeText={setTrackingNumber}
                        style={styles.textInput}
                        theme={{ colors: { primary: colors.primary } }}
                    />

                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate('LuggageStatus')}
                        style={styles.button}
                        buttonColor={colors.primary}
                        icon="magnify"
                        labelStyle={{ ...fonts.labelLarge }}
                    >
                        Track
                    </Button>
                </View>

                <Surface style={[styles.surface, { backgroundColor: colors.surface }]} elevation={2}>
                    <Text
                        style={[
                            styles.surfaceText,
                            { ...fonts.default, color: colors.tertiary },
                        ]}
                    >
                        “Quickly check the status and location of your luggage in real-time. Your journey, our priority.”
                    </Text>
                </Surface>
            </View>

            <Image
                source={require('../../../assets/delivery-bg.png')}
                style={styles.image}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 16,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        textAlign: 'center',
        marginVertical: 10,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    inputContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    textInput: {
        width: '90%',
        marginBottom: 10,
    },
    button: {
        width: '90%',
        borderRadius: 10,
        justifyContent: 'center',
    },
    surface: {
        padding: 16,
        marginTop: 20,
        marginHorizontal: 10,
        borderRadius: 8,
    },
    surfaceText: {
        textAlign: 'center',
    },
    image: {
        width: width,
        height: height * 0.35,
        resizeMode: 'contain',
        marginTop: 10,
    },
});

export default AirlineTrackLuggage;