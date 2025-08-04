import React, { useEffect, useState } from 'react'
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native'
import { Appbar, IconButton, Avatar } from 'react-native-paper'
import { useTheme } from 'react-native-paper'
import { supabase } from '../../lib/supabase'

const Header = ({ navigation, title }) => {
    const { colors, fonts } = useTheme()
    const [firstName, setFirstName] = useState('')
    const [profilePicture, setProfilePicture] = useState(null)
    const [userRole, setUserRole] = useState('')

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('profiles')
                .select('first_name, pfp_id, role_id(role_name)')
                .eq('id', user.id)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
                return
            }

            setFirstName(data?.first_name || '')
            setProfilePicture(data?.pfp_id || null)
            setUserRole(data?.role_id?.role_name || '')
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
                <Text style={[styles.title, fonts.titleLarge, {color:colors.onBackground, fontWeight: 'bold' }]}>{title}</Text>
                <TouchableOpacity onPress={handleProfilePress} style={styles.profileContainer}>
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
                {/* {userRole && (
                    <View style={[styles.roleBadge, { backgroundColor: colors.primary + '40' }]}>
                        <Text style={[styles.roleText, { color: colors.primary }]}>
                            {firstName} - {userRole}
                        </Text>
                    </View>
                )} */}
            </Appbar.Header>
            {/* Header */}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
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
    profileContainer: {
        position: 'relative',
    },
    roleBadge: {
        position: 'absolute',
        bottom: -5,
        right: 0,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    roleText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
})

export default Header
