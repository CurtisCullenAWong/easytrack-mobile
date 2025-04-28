// const fetchUsers = async () => {
//     try {
//         const response = await fetch('http://10.0.2.2:8000/api/accounts/?format=json')
//         const data = await response.json()

//         const transformedUsers = data.map(user => ({
//             id: user.id,
//             name: `${user.first_name} ${user.middle_name} ${user.last_name}`,
//             email: user.email_address,
//             role: user.role || 'N/A',
//             status: user.is_active ? 'Active' : 'Inactive',
//             avatar: user.first_name?.[0] || '?',
//             avatarUrl: user.avatar_url || null,
//             dateCreated: new Date(user.date_joined).toLocaleDateString(),
//             lastLogin: user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never',
//         }))

//         setUsers(transformedUsers)
//     } catch (error) {
//         console.error('Failed to fetch users:', error)
//     }
// }
// useEffect(() => {
//     fetchUsers()
// }, [])
import React, { useState, useEffect } from 'react'
import {
ScrollView,
StyleSheet,
View,
} from 'react-native'
import {
Searchbar,
Button,
Avatar,
DataTable,
Text,
useTheme
} from 'react-native-paper'
import Header from '../../customComponents/Header'

const UserManagement = ({ navigation }) => {
const { colors } = useTheme()

const [searchQuery, setSearchQuery] = useState('')
const [sortColumn, setSortColumn] = useState('name')
const [sortDirection, setSortDirection] = useState('ascending')
const [users, setUsers] = useState([])

const onChangeSearch = query => setSearchQuery(query)

const handleSort = (column) => {
    if (sortColumn === column) {
        setSortDirection(prev => (prev === 'ascending' ? 'descending' : 'ascending'))
    } else {
        setSortColumn(column)
        setSortDirection('ascending')
    }
}

const getSortIcon = (column) =>
    sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : null

const filteredAndSortedUsers = users
    .filter(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
        const valA = a[sortColumn]
        const valB = b[sortColumn]
        if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
        if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
        return 0
    })

const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email', width: 200 },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'dateCreated', label: 'Date Created' },
    { key: 'lastLogin', label: 'Last Login' },
]

return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header navigation={navigation} title={'Manage Users'} />

        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Searchbar
                placeholder="Search by name"
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={[styles.searchbar, { backgroundColor: colors.surface }]}
            />
            <Button
                mode="outlined"
                icon="filter-variant"
                onPress={() => console.log('Filter pressed')}
                style={[styles.filterButton, { borderColor: colors.primary }]}
                labelStyle={{ color: colors.primary }}
            >
                Filter
            </Button>
        </View>

        <ScrollView horizontal>
            <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
                <DataTable.Header>
                    <DataTable.Title style={styles.avatarColumn}>
                        <Text style={{ color: colors.onSurface }}>Avatar</Text>
                    </DataTable.Title>
                    {columns.map(({ key, label, width }) => (
                        <DataTable.Title
                            key={key}
                            style={[styles.columnHeader, width && { width }]}
                            onPress={() => handleSort(key)}
                        >
                            <View style={styles.sortableHeader}>
                                <Text style={{ color: colors.onSurface }}>{label}</Text>
                                {sortColumn === key && (
                                    <Text style={[styles.sortIcon, { color: colors.onSurface }]}>
                                        {getSortIcon(key)}
                                    </Text>
                                )}
                            </View>
                        </DataTable.Title>
                    ))}
                    <DataTable.Title style={styles.columnHeader} numeric>
                        <Text style={{ color: colors.onSurface }}>Actions</Text>
                    </DataTable.Title>
                </DataTable.Header>

                {/* If there are no users, render a placeholder row */}
                {filteredAndSortedUsers.length === 0 ? (
                    <DataTable.Row>
                        <DataTable.Cell colSpan={columns.length + 1} style={styles.noDataCell}>
                            <Text style={{ color: colors.onSurface, textAlign: 'center' }}>
                                No users available
                            </Text>
                        </DataTable.Cell>
                    </DataTable.Row>
                ) : (
                    filteredAndSortedUsers.map(user => (
                        <DataTable.Row key={user.id}>
                            <DataTable.Cell style={styles.avatarColumn}>
                                {user.avatarUrl ? (
                                    <Avatar.Image size={40} source={{ uri: user.avatarUrl }} />
                                ) : (
                                    <Avatar.Text size={40} label={user.avatar} />
                                )}
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text style={{ color: colors.onSurface }}>{user.name}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.emailColumnCell}>
                                <Text style={{ color: colors.onSurface }}>{user.email}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text style={{ color: colors.onSurface }}>{user.role}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text style={{ color: colors.onSurface }}>{user.status}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text style={{ color: colors.onSurface }}>{user.dateCreated}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text style={{ color: colors.onSurface }}>{user.lastLogin}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell numeric style={styles.columnCell}>
                                <Button
                                    mode="outlined"
                                    icon="eye"
                                    compact
                                    onPress={() => navigation.navigate('EditAccount', { userId: user.id })}
                                    style={styles.viewButton}
                                    labelStyle={{ color: colors.primary }}
                                >
                                    View
                                </Button>
                            </DataTable.Cell>
                        </DataTable.Row>
                    ))
                )}
            </DataTable>
        </ScrollView>
    </ScrollView>
)
}

const styles = StyleSheet.create({
container: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
},
searchbar: {
    flex: 1,
},
filterButton: {
    marginLeft: 8,
},
table: {
    paddingHorizontal: 16,
},
columnHeader: {
    width: 120,
    justifyContent: 'center',
},
avatarColumn: {
    size: 50,
    justifyContent: 'center',
},
columnCell: {
    width: 120,
    justifyContent: 'center',
    paddingVertical: 8,
},
emailColumnCell: {
    width: 200,
    justifyContent: 'center',
    paddingVertical: 8,
},
sortableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
},
sortIcon: {
    marginLeft: 4,
},
viewButton: {
    borderRadius: 4,
},
noDataCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
},
})

export default UserManagement
