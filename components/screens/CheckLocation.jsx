import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

const CheckLocation = ({ navigation }) => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.hamburger}>
                    <Icon name="bars" size={24} color="#5D8736" />
                </TouchableOpacity>

                <Image source={require('../../../assets/icon-w_o-name.png')} style={styles.logo} />
            </View>

            {/* Map Container with Overlays */}
            <View style={styles.mapContainer}>
                <Image
                    source={require('../../../assets/contracting-map.png')}
                    style={styles.mapImage}
                    resizeMode="cover"
                />

                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Contracting')}>
                    <Icon name="arrow-left" size={20} color="#5D8736" />
                </TouchableOpacity>

                {/* Zoom Controls */}
                <View style={styles.zoomControls}>
                    <TouchableOpacity style={styles.zoomButton}>
                        <Icon name="plus" size={20} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.zoomButton}>
                        <Icon name="minus" size={20} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    hamburger: {
        padding: 10,
        marginTop: 30,
    },
    logo: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
        marginTop: 30,
        alignSelf: 'center',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    mapImage: {
        flex: 1,
        width: '100%',
    },
    backButton: {
        position: 'absolute',
        top: 15,
        left: 15,
        backgroundColor: '#FFF',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
    },
    zoomControls: {
        position: 'absolute',
        bottom: 20,
        right: 20,
    },
    zoomButton: {
        width: 40,
        height: 40,
        backgroundColor: '#FFF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 5,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
});

export default CheckLocation;