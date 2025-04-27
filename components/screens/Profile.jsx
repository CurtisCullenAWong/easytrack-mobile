import React, { useState } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
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
        <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
            <Header navigation={navigation} title="Profile" />

            {/* User Info Card */}
            <Card style={[styles.card, {backgroundColor: colors.surface}]}>
                <Card.Content style={styles.cardContent}>
                    <Avatar.Image size={80} source={{ uri: user.avatarUrl }} style={[styles.avatar, { borderColor: colors.background }]} />
                    <View style={styles.cardTextContainer}>
                        <Title style={[styles.title, { color: colors.onSurface, ...fonts.titleLarge }]}>{user.name}</Title>
                        <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>{user.email}</Text>
                    </View>
                </Card.Content>
            </Card>

            {/* Account Info Card */}
            <Card style={[styles.card, {backgroundColor: colors.surface}]}>
                <Card.Title title="Account Info" titleStyle={[styles.title, { color: colors.onSurface, ...fonts.titleMedium }]} />
                <Divider style={[styles.divider,{backgroundColor: colors.onSurface}]}/>
                <Card.Content>
                    <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>Role: {user.role}</Text>
                    <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>Date Created: {user.dateCreated}</Text>
                </Card.Content>
            </Card>

            {/* Recent Activity Section */}
            <Card style={[styles.card, {backgroundColor: colors.surface}]}>
                <Card.Title title="Recent Activity" titleStyle={[styles.title, { color: colors.onSurface, ...fonts.titleMedium }]} />
                <Divider style={styles.divider}/>
                <Card.Content>
                    <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>Last Login: Jan 1, 2024</Text>
                    <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>Deliveries Made: 15</Text>
                    <Text style={[styles.text, { color: colors.onSurfaceVariant, ...fonts.bodyMedium }]}>Active Sessions: 3</Text>
                </Card.Content>
            </Card>

            {/* Logout Button */}
            <View style={styles.logoutContainer}>
                <Button
                    icon="logout"
                    mode="contained"
                    style={[styles.logoutButton, { backgroundColor: colors.error }]}
                    contentStyle={styles.logoutContent}
                    onPress={openLogoutDialog}
                    labelStyle={[styles.logoutLabel, { color: colors.onError }]}
                >
                    Logout
                </Button>
            </View>

            {/* Logout Dialog */}
            <Portal>
                <Dialog visible={logoutDialogVisible} onDismiss={closeLogoutDialog} style={{ backgroundColor: colors.surface }}>
                    <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>Confirm Logout</Dialog.Title>
                    <Dialog.Content>
                        <Text style={[styles.dialogText, { color: colors.onSurfaceVariant }]}>Are you sure you want to log out?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={closeLogoutDialog} labelStyle={styles.dialogButton}>Cancel</Button>
                        <Button onPress={confirmLogout} labelStyle={styles.dialogButton}>Logout</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    scrollView: { flex: 1 },
    card: {
        margin: 16,
        borderRadius: 12,
        elevation: 3,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatar: {
        marginRight: 16,
        borderWidth: 2,
    },
    cardTextContainer: {
        flex: 1,
    },
    title: {
        marginBottom: 4,
    },
    text: {
        marginBottom: 6,
    },
    divider: {
        height: 2,
        alignSelf: 'center',
    },
    logoutContainer: {
        marginTop: 24,
        marginBottom: 32,
        alignItems: 'center',
    },
    logoutButton: {
        marginVertical: 6,
        width: '90%',
    },
    logoutContent: {
        height: 48,
    },
    logoutLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    dialogTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    dialogText: {
        fontSize: 16,
    },
    dialogButton: {
        fontSize: 16,
    },
})

export default Profile
