import React, { useState, useEffect } from 'react'
import { Text, StyleSheet, ScrollView, View } from 'react-native'
import {
    Avatar, TextInput, Button, Card, Title, Portal, Dialog,
    Menu, Divider, TouchableRipple, IconButton
} from 'react-native-paper'
import { useTheme } from 'react-native-paper'

const EditAccountScreen = ({ route, navigation }) => {
    const { colors, fonts } = useTheme()
    const { userId } = route.params

    const [user, setUser] = useState(null)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('')
    const [status, setStatus] = useState('Active')
    const [visibleDialog, setVisibleDialog] = useState(false)
    const [saving, setSaving] = useState(false)
    const [visibleMenu, setVisibleMenu] = useState(false)

    const roles = ['Admin', 'Delivery Personnel', 'Airline Staff', 'Passenger']

    const users = [
        { id: 1, avatar: 'A', avatarUrl: 'https://randomuser.me/api/portraits/women/1.jpg', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active', dateCreated: '2025-01-12', lastLogin: '2025-04-23' },
        { id: 2, avatar: 'B', avatarUrl: '', name: 'Bob Smith', email: 'bob@example.com', role: 'Delivery Personnel', status: 'Inactive', dateCreated: '2025-02-18', lastLogin: '2025-04-22' },
        { id: 3, avatar: 'C', avatarUrl: 'https://randomuser.me/api/portraits/women/1.jpg', name: 'Charlie Brown', email: 'charlie@example.com', role: 'Moderator', status: 'Active', dateCreated: '2025-03-05', lastLogin: '2025-04-21' },
    ]

    useEffect(() => {
        const selectedUser = users.find(u => u.id === userId)
        setUser(selectedUser)
        setName(selectedUser.name)
        setEmail(selectedUser.email)
        setRole(selectedUser.role)
        setStatus(selectedUser.status)
    }, [userId])

    if (!user) {
        return <Text>Loading...</Text>
    }

    const handleSaveChanges = () => {
        setVisibleDialog(true)
    }

    const handleConfirmSave = () => {
        setSaving(true)
        setTimeout(() => {
            console.log('Updated User Info:', {
                id: userId,
                name,
                email,
                role,
                status,
            })
            setSaving(false)
            setVisibleDialog(false)
            navigation.goBack()
        }, 2000)
    }

    const handleCancelSave = () => {
        setVisibleDialog(false)
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: '30%' }}>
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Card.Content>
                    <View style={{ alignSelf: 'center' }}>
                        {user.avatarUrl ? (
                            <Avatar.Image source={{ uri: user.avatarUrl }} size={100} />
                        ) : (
                            <Avatar.Text label={user.avatar} size={100} />
                        )}
                    </View>

                    <Title style={[styles.title, { color: colors.primary, fontFamily: fonts.medium.fontFamily }]}>{name}</Title>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.primary }]}>Email:</Text>
                        <Text style={[styles.infoText, { color: colors.primary }]}>{email}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.primary }]}>Role:</Text>
                        <Text style={[styles.infoText, { color: colors.primary }]}>{role}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.primary }]}>Status:</Text>
                        <Text style={[styles.infoText, { color: colors.primary }]}>{status}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.primary }]}>Date Created:</Text>
                        <Text style={[styles.infoText, { color: colors.primary }]}>{user.dateCreated}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.primary }]}>Last Login:</Text>
                        <Text style={[styles.infoText, { color: colors.primary }]}>{user.lastLogin}</Text>
                    </View>
                </Card.Content>
            </Card>

            <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                style={[styles.input, { backgroundColor: colors.surface }]}
                mode="outlined"
            />

            <TextInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { backgroundColor: colors.surface }]}
                keyboardType="email-address"
                mode="outlined"
            />

            <Menu
                visible={visibleMenu}
                onDismiss={() => setVisibleMenu(false)}
                anchor={
                    <TouchableRipple
                        onPress={() => setVisibleMenu(true)}
                        style={[styles.menuTrigger, { borderColor: colors.secondary }]}
                    >
                        <View style={[styles.menuLabel, { borderColor: colors.secondary }]}>
                            <Text style={{ color: colors.tertiary, fontFamily: fonts.medium.fontFamily, fontSize: 16 }}>
                                {role || 'Select Role'}
                            </Text>
                            <IconButton
                                icon="menu-down"
                                color={colors.primary}
                                size={20}
                                style={styles.iconStyle}
                            />
                        </View>
                    </TouchableRipple>
                }
                contentStyle={{ backgroundColor: colors.surface }}
            >
                {roles.map((roleOption, index) => (
                    <Menu.Item
                        key={index}
                        title={roleOption}
                        onPress={() => {
                            setRole(roleOption)
                            setVisibleMenu(false)
                        }}
                        titleStyle={{
                            color: colors.primary,
                            fontFamily: fonts.medium.fontFamily,
                            fontSize: 16,
                        }}
                    />
                ))}
                <Divider />
            </Menu>

            <TextInput
                label="Status"
                value={status}
                onChangeText={setStatus}
                style={[styles.input, { backgroundColor: colors.surface }]}
                mode="outlined"
            />

            <Button mode="contained" onPress={handleSaveChanges} style={[styles.button, { backgroundColor: colors.primary }]}>
                Save Changes
            </Button>
            <Button mode="text" onPress={() => navigation.goBack()} style={styles.button}>
                Go Back
            </Button>

            <Portal>
                <Dialog visible={visibleDialog} onDismiss={handleCancelSave}>
                    <Dialog.Title>Confirm Changes</Dialog.Title>
                    <Dialog.Content>
                        <Text>Are you sure you want to save the changes to this account?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={handleCancelSave}>No</Button>
                        <Button onPress={handleConfirmSave} loading={saving}>Yes</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    card: {
        marginBottom: 20,
        padding: 10,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    input: {
        marginBottom: 10,
    },
    button: {
        marginTop: 10,
    },
    menuTrigger: {
        marginBottom: 16,
        borderWidth: 1,
        paddingVertical: 8,
        borderRadius: 4,
    },
    menuLabel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxHeight: 40,
        paddingLeft: 15,
        paddingVertical: 10,
        borderRadius: 4,
    },
    iconStyle: {
        alignSelf: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
        width: '100%',
    },
    infoLabel: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    infoText: {
        fontSize: 16,
    },
})

export default EditAccountScreen
