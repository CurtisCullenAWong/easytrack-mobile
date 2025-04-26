import React, { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Avatar, Card, Title, Text, Divider, Button, Dialog, Portal, useTheme } from 'react-native-paper'
import Header from '../customComponents/Header'

const Profile = ({ navigation, route }) => {
    const { colors, fonts } = useTheme()

    const user = {
        name: route?.params?.name || 'Admin Name',
        email: route?.params?.email || 'admin@example.com',
        role: route?.params?.role || 'Super Admin',
        dateCreated: route?.params?.dateCreated || 'Jan 1, 2024',
        avatarUrl: route?.params?.avatarUrl || 'https://randomuser.me/api/portraits/men/10.jpg',
    }

    const [logoutDialogVisible, setLogoutDialogVisible] = useState(false)

    const openLogoutDialog = () => setLogoutDialogVisible(true)
    const closeLogoutDialog = () => setLogoutDialogVisible(false)
    const confirmLogout = () => {
        closeLogoutDialog()
        navigation.navigate('Login')
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header navigation={navigation} title="Profile" />

            {/* User Info Card */}
            <Card style={{ margin: 16, borderRadius: 12, backgroundColor: colors.surface, elevation: 3 }}>
                <Card.Content style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 20 }}>
                    <Avatar.Image
                        size={80}
                        source={{ uri: user.avatarUrl }}
                        style={{ marginRight: 16, borderWidth: 2, borderColor: colors.background }}
                    />
                    <View style={{ flex: 1 }}>
                        <Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>{user.name}</Title>
                        <Text style={{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>{user.email}</Text>
                    </View>
                </Card.Content>
            </Card>

            {/* Account Info Card */}
            <Card style={{ margin: 16, borderRadius: 12, backgroundColor: colors.surface, elevation: 3 }}>
                <Card.Title title="Account Info" titleStyle={{ color: colors.onSurface, ...fonts.titleMedium }} />
                <Divider />
                <Card.Content>
                    <Text style={{ marginBottom: 6, color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
                        Role: {user.role}
                    </Text>
                    <Text style={{ marginBottom: 6, color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
                        Date Created: {user.dateCreated}
                    </Text>
                </Card.Content>
            </Card>

            {/* Recent Activity Section */}
            <Card style={{ margin: 16, borderRadius: 12, backgroundColor: colors.surface, elevation: 3 }}>
                <Card.Title title="Recent Activity" titleStyle={{ color: colors.onSurface, ...fonts.titleMedium }} />
                <Divider />
                <Card.Content>
                    <Text style={{ marginBottom: 6, color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
                        Last Login: Jan 1, 2024
                    </Text>
                    <Text style={{ marginBottom: 6, color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
                        Posts Created: 15
                    </Text>
                    <Text style={{ marginBottom: 6, color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
                        Active Sessions: 3
                    </Text>
                </Card.Content>
            </Card>

            {/* Logout Button */}
            <View style={{ marginTop: 24, marginBottom: 32, alignItems: 'center' }}>
                <Button
                    icon={'logout'}
                    mode="contained"
                    style={{ marginVertical: 6, width: '90%', backgroundColor: colors.error }}
                    contentStyle={{ height: 48 }}
                    onPress={openLogoutDialog}
                    labelStyle={{ ...fonts.labelLarge, color: colors.onError }}
                >
                    Logout
                </Button>
            </View>

            {/* Logout Dialog */}
            <Portal>
                <Dialog visible={logoutDialogVisible} onDismiss={closeLogoutDialog} style={{ backgroundColor: colors.surface }}>
                    <Dialog.Title style={{ ...fonts.titleLarge, color: colors.onSurface }}>Confirm Logout</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ ...fonts.bodyMedium, color: colors.onSurfaceVariant }}>
                            Are you sure you want to log out?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={closeLogoutDialog} labelStyle={{ ...fonts.labelLarge }}>
                            Cancel
                        </Button>
                        <Button onPress={confirmLogout} labelStyle={{ ...fonts.labelLarge }}>
                            Logout
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </ScrollView>
    )
}

export default Profile
