import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTheme, TextInput, Button, Card, Menu, Divider, TouchableRipple, IconButton } from 'react-native-paper'
const AddNewAccountScreen = ({ navigation }) => {
    const { colors, fonts } = useTheme()

    const [firstName, setFirstName] = useState('')
    const [middleName, setMiddleName] = useState('')
    const [lastName, setLastName] = useState('')
    const [userName, setUserName] = useState('')
    const [emailAddress, setEmailAddress] = useState('')
    const [password, setPassword] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [contactNumber, setContactNumber] = useState('')
    const [role, setRole] = useState('')
    const [status, setStatus] = useState('Active')
    const [visible, setVisible] = useState(false)

    const roles = ['Admin', 'Delivery Personnel', 'Airline Staff', 'Passenger']

    const handleSave = () => {
        // Handle the save logic, such as submitting the data
        console.log({ firstName, middleName, lastName, userName, emailAddress, password, birthDate, contactNumber, role, status })
        navigation.goBack()
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: '30%' }}>
            <Card style={[styles.card, { backgroundColor: colors.background }]}>
                <Card.Content>
                    <Text style={[styles.title, { color: colors.primary, fontFamily: fonts.medium.fontFamily }]}>
                        Add New Account
                    </Text>
                    <TextInput
                        label="First Name"
                        value={firstName}
                        onChangeText={setFirstName}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        mode="outlined"
                    />
                    <TextInput
                        label="Middle Name"
                        value={middleName}
                        onChangeText={setMiddleName}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        mode="outlined"
                    />
                    <TextInput
                        label="Last Name"
                        value={lastName}
                        onChangeText={setLastName}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        mode="outlined"
                    />
                    <TextInput
                        label="Username"
                        value={userName}
                        onChangeText={setUserName}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        mode="outlined"
                    />
                    <TextInput
                        label="Email Address"
                        value={emailAddress}
                        onChangeText={setEmailAddress}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        keyboardType="email-address"
                        mode="outlined"
                    />
                    <TextInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        secureTextEntry
                        mode="outlined"
                    />
                    <TextInput
                        label="Birth Date"
                        value={birthDate}
                        onChangeText={setBirthDate}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        keyboardType="datetime-local"
                        mode="outlined"
                    />
                    <TextInput
                        label="Contact Number"
                        value={contactNumber}
                        onChangeText={setContactNumber}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        keyboardType="phone-pad"
                        mode="outlined"
                    />

                    <Menu
                        visible={visible}
                        onDismiss={() => setVisible(false)}
                        anchor={
                            <TouchableRipple onPress={() => setVisible(true)} style={styles.menuTrigger}>
                                <View style={[styles.menuLabel, { borderColor: colors.secondary }]}>
                                    <Text style={[{ color: colors.tertiary, fontFamily: fonts.medium.fontFamily, fontSize: 16 }]}>
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
                                    setVisible(false)
                                }}
                                titleStyle={{
                                    color: colors.primary,
                                    fontFamily: fonts.medium.fontFamily,
                                    fontSize: 16,  // Match the text input font size
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
                </Card.Content>
                <Card.Actions>
                    <Button
                        mode="contained"
                        onPress={handleSave}
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Text style={{ color: colors.background, fontFamily: fonts.medium.fontFamily }}>Save</Text>
                    </Button>
                    <Button onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                        <Text style={{ fontFamily: fonts.medium.fontFamily }}>Cancel</Text>
                    </Button>
                </Card.Actions>
            </Card>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    card: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    input: {
        marginBottom: 16,
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
})

export default AddNewAccountScreen
