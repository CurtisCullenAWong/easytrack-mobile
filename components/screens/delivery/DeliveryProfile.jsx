import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

const DeliveryProfile = ({ navigation }) => {
    // Logout Confirmation
    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "OK", onPress: () => navigation.navigate('Splash') }
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.hamburger}>
                    <Icon name="bars" size={24} color="#333" />
                </TouchableOpacity>

                <Image source={require('../../../assets/icon-w_o-name.png')} style={styles.logo} />

                <TouchableOpacity>
                    <Icon name="user-circle" size={28} color="#5D8736" />
                </TouchableOpacity>
            </View>

            {/* Profile Section */}
            <View style={styles.profileCard}>
                <View style={styles.profileInfo}>
                    <Image source={require('../../../assets/profile-placeholder.png')} style={styles.profileImage} />
                    <View>
                        <Text style={styles.profileName}>Delivery Personnel 1</Text>
                        <Text style={styles.profileEmail}>Personnel@delivery.com</Text>
                    </View>
                </View>
            </View>

            {/* Personal Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>Contact No.: 09893242378</Text>
                </View>
            </View>

            {/* Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <TouchableOpacity style={styles.settingItem} 
                // onPress={() => navigation.navigate('AccountOwnership')}
                >
                    <Icon name="user-shield" size={20} color="#888" />
                    <Text style={styles.settingText}>Account Ownership and Control</Text>
                    <Icon name="chevron-right" size={16} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingItem} 
                // onPress={() => navigation.navigate('AboutApp')}
                >
                    <Icon name="info" size={20} color="#888" />
                    <Text style={styles.settingText}>About App</Text>
                    <Icon name="chevron-right" size={16} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
                    <Icon name="sign-out-alt" size={20} color="red" />
                    <Text style={[styles.settingText, { color: "red" }]}>Log out</Text>
                    <Icon name="chevron-right" size={16} color="red" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 30,
    },
    hamburger: {
        padding: 10,
    },
    logo: {
        width: 50,
        height: 50,
        resizeMode: 'contain',
    },
    profileCard: {
        backgroundColor: '#5D8736',
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#DDD',
        marginRight: 10,
    },
    profileName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    profileEmail: {
        fontSize: 14,
        color: 'white',
    },
    section: {
        marginBottom: 20,
        marginLeft: 10,
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    infoBox: {
        backgroundColor: '#F2F2F2',
        padding: 15,
        borderRadius: 10,
    },
    infoText: {
        fontSize: 14,
        color: '#333',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    settingText: {
        fontSize: 16,
        flex: 1,
        marginLeft: 10,
        color: '#333',
    },
});

export default DeliveryProfile;