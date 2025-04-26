import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Header from '../../customComponents/Header';

const Contracting = ({ navigation }) => {
    return (
        <View style={styles.container}>
            {/* Reusable Header */}
            <Header navigation={navigation} />

            {/* Date & Time */}
            <View style={styles.dateContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="chevron-left" size={20} color="#5D8736" />
                </TouchableOpacity>
                <Text style={styles.dateText}>16 October 2025, 8:52 PM</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Booking Details */}
            <View style={styles.bookingDetails}>
                <View style={styles.bookingHeader}>
                    <Text style={styles.bookingText}>BOOKING ID</Text>
                    <Text style={styles.bookingText}>A4G-BUIN8-IAS09855</Text>
                </View>

                {/* Passenger Info */}
                <View style={styles.passengerInfo}>
                    <Image source={require('../../../assets/profile-placeholder.png')} style={styles.profileImage} />
                    <View>
                        <Text style={styles.bookingID}>2022-15482324253</Text>
                        <Text style={styles.passengerName}>Naiza F. Albina</Text>
                    </View>
                </View>

                {/* Fare Info */}
                <View style={styles.fareContainer}>
                    <Text style={styles.fareLabel}>FARE:</Text>
                    <Text style={styles.fareAmount}>₱ 185</Text>
                </View>

                {/* Locations */}
                <View style={styles.locationContainer}>
                    <View style={styles.locationItem}>
                        <Icon name="map-marker-alt" size={12} color="blue" />
                        <Text style={styles.locationText}>SM CITY North EDSA Main Entrance</Text>
                    </View>
                    <View style={styles.locationItem}>
                        <Icon name="dot-circle" size={12} color="red" />
                        <Text style={styles.locationText}>76 P Florentino Street</Text>
                    </View>
                </View>
            </View>

            {/* Check Location Button */}
            <TouchableOpacity style={styles.checkLocationButton} onPress={() => navigation.navigate('CheckLocation')}>
                <Text style={styles.checkLocationText}>CHECK LOCATION</Text>
            </TouchableOpacity>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 15,
        marginTop: 30,
    },
    hamburger: {
        padding: 10,
    },
    logo: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 10,
        marginVertical: 10,
    },
    backButton: {
        padding: 10,
    },
    dateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    placeholder: {
        width: 30,
    },
    bookingDetails: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 10,
        elevation: 2,
        marginTop: 10,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
        paddingBottom: 8,
    },
    bookingText: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
    },
    passengerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EAEAEA',
        marginRight: 10,
    },
    bookingID: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    passengerName: {
        fontSize: 12,
        color: '#666',
    },
    fareContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    fareLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
    },
    fareAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    locationContainer: {
        paddingVertical: 10,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    locationText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    checkLocationButton: {
        backgroundColor: '#5D8736',
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 20,
        alignSelf: 'center',
        width: '80%',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 3,
    },
    checkLocationText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Contracting;