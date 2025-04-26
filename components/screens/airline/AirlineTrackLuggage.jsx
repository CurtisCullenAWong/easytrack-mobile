import React from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    Dimensions,
    Image,
} from 'react-native';
import { Text, TextInput, Button, Surface, useTheme } from 'react-native-paper';
import Header from '../../customComponents/Header';

const { width, height } = Dimensions.get('window');

const TrackLuggage = ({ navigation }) => {
    const [trackingNumber, setTrackingNumber] = React.useState('');
    const { colors, fonts } = useTheme();

    return (
        <ScrollView style={{ backgroundColor: colors.background, flex: 1 }}>
            <Header navigation={navigation} />

            <View style={{ padding: 16, alignItems: 'center' }}>
                <Text
                    style={{
                        fontSize: 24,
                        fontFamily: fonts.medium.fontFamily,
                        color: colors.primary,
                        textAlign: 'center',
                        marginVertical: 10,
                    }}
                >
                    Track your shipment
                </Text>
                <Text
                    style={{
                        fontSize: 16,
                        fontFamily: fonts.light.fontFamily,
                        color: colors.tertiary,
                        textAlign: 'center',
                        marginBottom: 20,
                    }}
                >
                    Please enter your tracking number
                </Text>

                <View style={{ width: '100%', alignItems: 'center', marginBottom: 20 }}>
                    <TextInput
                        mode="outlined"
                        placeholder="Enter track number"
                        value={trackingNumber}
                        onChangeText={setTrackingNumber}
                        style={{ width: '90%', marginBottom: 10 }}
                        theme={{ colors: { primary: colors.primary } }}
                    />

                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate('LuggageStatus')}
                        style={{
                            width: '90%',
                            borderRadius: 10,
                            justifyContent: 'center',
                        }}
                        buttonColor={colors.primary}
                        icon="magnify"
                        labelStyle={{ fontFamily: fonts.medium.fontFamily }}
                    >
                        Track
                    </Button>
                </View>

                <Surface
                    style={{
                        padding: 16,
                        marginTop: 20,
                        marginHorizontal: 10,
                        borderRadius: 8,
                        backgroundColor: colors.surface,
                    }}
                    elevation={2}
                >
                    <Text
                        style={{
                            textAlign: 'center',
                            color: colors.tertiary,
                            fontFamily: fonts.regular.fontFamily,
                        }}
                    >
                        “Quickly check the status and location of your luggage in real-time. Your journey, our priority.”
                    </Text>
                </Surface>
            </View>

            <Image
                source={require('../../../assets/delivery-bg.png')}
                style={{
                    width: width,
                    height: height * 0.35,
                    resizeMode: 'contain',
                    marginTop: 10,
                }}
            />
        </ScrollView>
    );
};

export default TrackLuggage;
