import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from 'react-native-paper';
import Header from '../../customComponents/Header';

const Contracting = ({ navigation }) => {
    const { colors } = useTheme(); // Access colors from the theme

    return (
        <ScrollView style={styles.container}>
            <Header navigation={navigation} />
            <View style={[styles.dateContainer, { backgroundColor: colors.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 15,
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
    },
    passengerName: {
        fontSize: 12,
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
        fontWeight: 'bold',
    },
    fareAmount: {
        fontSize: 14,
        fontWeight: 'bold',
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
