import React, { useState, useEffect } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import {
  Searchbar,
  Button,
  Avatar,
  DataTable,
  Text,
  useTheme,
  Menu,
} from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabase'

const COLUMN_WIDTH = 120
const EMAIL_COLUMN_WIDTH = 200
const AVATAR_COLUMN_WIDTH = 80

const UserManagement = ({ navigation }) => {
  const { colors, fonts } = useTheme()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('name')
  const [menuVisible, setMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState('ascending')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const handleSort = (column) => {
    setSortDirection(prev =>
      sortColumn === column && prev === 'ascending' ? 'descending' : 'ascending'
    )
    setSortColumn(column)
  }

  const getSortIcon = (column) =>
    sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : ''

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      setLoading(false)
      return
    }

    const formatted = data.map(user => ({
      id: user.id,
      name: user.full_name || user.username || 'N/A',
      email: user.email,
      role: user.role || 'N/A',
      status: user.user_status || 'Unknown',
      dateCreated: user.created_at
        ? new Date(user.created_at).toLocaleString()
        : 'N/A',
      lastLogin: user.last_sign_in_at
        ? new Date( user.last_sign_in_at).toLocaleString()
        : 'Never',
      avatar: (user.full_name || 'N')[0].toUpperCase(),
      avatarUrl: user.avatar_url || null,
    }))

    setUsers(formatted)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const filteredAndSortedUsers = users
    .filter(user =>
      String(user[searchColumn] || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]
      if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
      if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
      return 0
    })

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email', width: EMAIL_COLUMN_WIDTH },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'dateCreated', label: 'Date Created' },
    { key: 'lastLogin', label: 'Last Login' },
  ]

  const filterOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Email', value: 'email' },
    { label: 'Role', value: 'role' },
    { label: 'Status', value: 'status' },
  ]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header navigation={navigation} title="Manage Users" />

      <View style={styles.searchActionsRow}>
        <Searchbar
          placeholder={`Search by ${filterOptions.find(opt => opt.value === searchColumn)?.label}`}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: colors.surface }]}
        />

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              icon="filter-variant"
              onPress={() => setMenuVisible(true)}
              style={[styles.filterButton, { borderColor: colors.primary }]}
              labelStyle={[{ color: colors.primary }, fonts.labelLarge]}
            >
              {filterOptions.find(opt => opt.value === searchColumn)?.label}
            </Button>
          }
          contentStyle={{ backgroundColor: colors.surface }}
        >
          {filterOptions.map(option => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                setSearchColumn(option.value)
                setMenuVisible(false)
              }}
              title={option.label}
              titleStyle={[
                {
                  color: searchColumn === option.value
                    ? colors.primary
                    : colors.onSurface,
                },
                fonts.bodyLarge,
              ]}
              leadingIcon={searchColumn === option.value ? 'check' : undefined}
            />
          ))}
        </Menu>
      </View>

      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          icon="refresh"
          onPress={fetchUsers}
          style={[styles.actionButton, { borderColor: colors.primary }]}
          labelStyle={{ color: colors.primary }}
        >
          Refresh
        </Button>
      </View>

      {loading ? (
        <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyMedium]}>
          Loading users...
        </Text>
      ) : (
        <ScrollView horizontal>
          <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
            <DataTable.Header>
              <DataTable.Title style={{ width: AVATAR_COLUMN_WIDTH, justifyContent: 'center' }}>
                <Text style={[{ color: colors.onSurface }, fonts.labelMedium]}>Avatar</Text>
              </DataTable.Title>
              {columns.map(({ key, label, width }) => (
                <DataTable.Title
                  key={key}
                  style={{ width: width || COLUMN_WIDTH, justifyContent: 'center' }}
                  onPress={() => handleSort(key)}
                >
                  <View style={styles.sortableHeader}>
                    <Text style={[{ color: colors.onSurface }, fonts.labelMedium]}>{label}</Text>
                    <Text style={[styles.sortIcon, { color: colors.onSurface }]}>{getSortIcon(key)}</Text>
                  </View>
                </DataTable.Title>
              ))}
              <DataTable.Title style={{ width: COLUMN_WIDTH, justifyContent: 'center' }} numeric>
                <Text style={[{ color: colors.onSurface }, fonts.labelMedium]}>Actions</Text>
              </DataTable.Title>
            </DataTable.Header>

            {filteredAndSortedUsers.length === 0 ? (
              <DataTable.Row>
                <DataTable.Cell style={styles.noDataCell}>
                  <Text style={[{ color: colors.onSurface, textAlign: 'center' }, fonts.bodyMedium]}>
                    No users available
                  </Text>
                </DataTable.Cell>
              </DataTable.Row>
            ) : (
              filteredAndSortedUsers.map(user => (
                <DataTable.Row key={user.id}>
                  <DataTable.Cell style={{ width: AVATAR_COLUMN_WIDTH, justifyContent: 'center' }}>
                    {user.avatarUrl ? (
                      <Avatar.Image size={40} source={{ uri: user.avatarUrl }} />
                    ) : (
                      <Avatar.Text size={40} label={user.avatar} />
                    )}
                  </DataTable.Cell>
                  {[
                    { value: user.name, width: COLUMN_WIDTH },
                    { value: user.email, width: EMAIL_COLUMN_WIDTH },
                    { value: user.role, width: COLUMN_WIDTH },
                    { value: user.status, width: COLUMN_WIDTH },
                    { value: user.dateCreated, width: COLUMN_WIDTH },
                    { value: user.lastLogin, width: COLUMN_WIDTH },
                  ].map(({ value, width }, idx) => (
                    <DataTable.Cell
                      key={idx}
                      style={{ width, justifyContent: 'center', paddingVertical: 8 }}
                    >
                      <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>{value}</Text>
                    </DataTable.Cell>
                  ))}
                  <DataTable.Cell numeric style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 8 }}>
                    <Button
                      mode="outlined"
                      icon="eye"
                      compact
                      onPress={() => navigation.navigate('Edit Account', { userId: user.id })}
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
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  searchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  searchbar: {
    flex: 1,
  },
  filterButton: {
    height: 56,
    justifyContent: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  actionButton: {
    marginVertical: 8,
  },
  table: {
    paddingHorizontal: 16,
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
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
  },
})

export default UserManagement