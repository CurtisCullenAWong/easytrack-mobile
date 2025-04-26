import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Avatar, Card, Title, Text, Divider, Button, useTheme, Dialog, Portal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Header from '../customComponents/Header';

const AdminProfile = ({ navigation, route }) => {
    const { colors, fonts } = useTheme();

    const user = {
        name: route?.params?.name || 'Admin Name',
        email: route?.params?.email || 'admin@example.com',
        role: route?.params?.role || 'Super Admin',
        dateCreated: route?.params?.dateCreated || 'Jan 1, 2024',
        avatarUrl: route?.params?.avatarUrl || 'https://randomuser.me/api/portraits/men/10.jpg',
    };

    const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

    const openLogoutDialog = () => setLogoutDialogVisible(true);
    const closeLogoutDialog = () => setLogoutDialogVisible(false);
    const confirmLogout = () => {
        closeLogoutDialog();
        navigation.navigate('Login');
    };

    return (
        <ScrollView contentContainerStyle={{ backgroundColor: colors.background }}>
            <Header navigation={navigation} title="Admin Profile" />

            <Card style={[styles.profileCard, { backgroundColor: colors.primary }]}>
                <Card.Content style={styles.cardContent}>
                    {user.avatarUrl ? (
                        <Avatar.Image size={80} source={{ uri: user.avatarUrl }} style={styles.avatar} />
                    ) : (
                        <Avatar.Text size={80} label={user.name.charAt(0)} style={styles.avatar} />
                    )}
                    <View style={{ flex: 1 }}>
                        <Title style={[styles.nameText, { color: colors.onPrimary }]}>{user.name}</Title>
                        <Text style={{ color: colors.onPrimary }}>{user.email}</Text>
                    </View>
                </Card.Content>
            </Card>

            <Card style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                <Card.Title title="Account Info" titleStyle={{ fontFamily: fonts.medium.fontFamily, fontSize: 18 }} />
                <Divider />
                <Card.Content>
                    <Text style={[styles.infoText, { color: colors.onSurface }]}>Role: {user.role}</Text>
                    <Text style={[styles.infoText, { color: colors.onSurface }]}>Date Created: {user.dateCreated}</Text>
                </Card.Content>
            </Card>

            {/* Logout Button Positioned Cleanly */}
            <View style={styles.logoutContainer}>
                <Button
                    mode="contained-tonal"
                    icon="logout"
                    onPress={openLogoutDialog}
                    labelStyle={{ fontFamily: fonts.medium.fontFamily }}
                    buttonColor={colors.primary}
                    textColor="#fff"
                >
                    Logout
                </Button>
            </View>

            <Portal>
                <Dialog visible={logoutDialogVisible} onDismiss={closeLogoutDialog}>
                    <Dialog.Title>Confirm Logout</Dialog.Title>
                    <Dialog.Content>
                        <Text>Are you sure you want to log out?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={closeLogoutDialog}>Cancel</Button>
                        <Button onPress={confirmLogout}>Logout</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    profileCard: {
        margin: 16,
        borderRadius: 12,
        elevation: 4,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatar: {
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#fff',
    },
    nameText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    infoCard: {
        marginHorizontal: 16,
        borderRadius: 12,
        marginTop: 8,
        elevation: 2,
    },
    infoText: {
        fontSize: 14,
        marginBottom: 6,
    },
    logoutContainer: {
        marginTop: 24,
        marginBottom: 32,
        alignItems: 'center',
    },
});

export default AdminProfile;
