import React, { useEffect, useState } from 'react'
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native'
import { Appbar, IconButton, Avatar } from 'react-native-paper'
import { useTheme } from 'react-native-paper'
import { supabase } from '../../lib/supabase'

const Header = ({ navigation, title }) => {
    const { colors, fonts } = useTheme()
    const [firstName, setFirstName] = useState('')
    const [profilePicture, setProfilePicture] = useState(null)

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('profiles')
                .select('first_name, profile_picture')
                .eq('id', user.id)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
                return
            }

            setFirstName(data?.first_name || '')
            setProfilePicture(data?.profile_picture || null)
        } catch (error) {
            console.error('Error in fetchUserProfile:', error)
        }
    }

    useEffect(() => {
        fetchUserProfile()
    }, [])

    const handleProfilePress = () => {
        navigation.navigate('Profile')
    }

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
                <TouchableOpacity onPress={handleProfilePress}>
                    {profilePicture ? (
                        <Avatar.Image 
                            size={40} 
                            source={{ uri: profilePicture }}
                            style={{ backgroundColor: colors.primary }}
                        />
                    ) : (
                        <Avatar.Text 
                            size={40} 
                            label={firstName ? firstName[0].toUpperCase() : 'U'}
                            style={{ backgroundColor: colors.primary }}
                            labelStyle={{ color: colors.onPrimary }}
                        />
                    )}
                </TouchableOpacity>
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
    },
    logo: {
        resizeMode: 'contain',
        width: 50,
        height: 50,
    },
})

export default Header
