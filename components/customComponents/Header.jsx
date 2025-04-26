import React from 'react'
import { Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Appbar, IconButton } from 'react-native-paper'
import { useTheme } from 'react-native-paper'

const Header = ({ navigation }) => {
    const userProfileImage = 
    // ''
    'https://cdn.prod.website-files.com/62d84e447b4f9e7263d31e94/6399a4d27711a5ad2c9bf5cd_ben-sweet-2LowviVHZ-E-unsplash-1.jpeg'

    const handleProfilePress = () => {
        navigation.navigate('Profile')
    }

    const { colors } = useTheme()  // Correcting here to destructure `colors` from the theme

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <Appbar.Header style={styles.header}>
                <IconButton
                    icon="menu"
                    size={30}
                    iconColor={colors.primary}
                    onPress={() => navigation.openDrawer()}
                />
                <Image source={require('../../assets/icon-w_o-name.png')} style={styles.logo} />
                {/* Conditional rendering for profile picture or account icon */}
                {userProfileImage ? (
                    <TouchableOpacity onPress={handleProfilePress}>
                        <Image
                            source={{ uri: userProfileImage }}
                            style={styles.profileImage}
                        />
                    </TouchableOpacity>
                ) : (
                    <IconButton
                        icon="account-circle"
                        size={30}
                        onPress={handleProfilePress}
                    />
                )}
            </Appbar.Header>
            {/* Header */}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    logo: {
        resizeMode: 'contain',
        width: 50,
        height: 50,
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 50,
    },
})

export default Header
