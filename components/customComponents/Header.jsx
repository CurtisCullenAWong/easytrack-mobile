import React from 'react'
import { Image, StyleSheet, TouchableOpacity, Text, View } from 'react-native'
import { Appbar, IconButton } from 'react-native-paper'
import { useTheme } from 'react-native-paper'

const Header = ({ navigation, title }) => {
    const userProfileImage =
        // ''
        'https://cdn.prod.website-files.com/62d84e447b4f9e7263d31e94/6399a4d27711a5ad2c9bf5cd_ben-sweet-2LowviVHZ-E-unsplash-1.jpeg'

    const handleProfilePress = () => {
        navigation.navigate('Profile')
    }

    const { colors, fonts } = useTheme()  // Destructure `colors` from the theme

    return (
        <View style={styles.container}>
            {/* Header */}
            <Appbar.Header style={styles.header}>
                <IconButton
                    icon="menu"
                    size={30}
                    iconColor={colors.primary}
                    onPress={() => navigation.openDrawer()}
                />
                <Text style={[styles.title, fonts.headlineSmall, {color:colors.onBackground, fontWeight: 'bold' }]}>{title}</Text>
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
                        iconColor={colors.primary}
                        onPress={handleProfilePress}
                    />
                )}
            </Appbar.Header>
            {/* Header */}
        </View>
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
