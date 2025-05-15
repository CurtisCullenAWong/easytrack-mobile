import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
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

const COLUMN_WIDTH = 180
const EMAIL_COLUMN_WIDTH = 200
const AVATAR_COLUMN_WIDTH = 80
const FULL_NAME_WIDTH = 200

const UserManagement = ({ navigation }) => {
  const { colors, fonts } = useTheme()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('full_name')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('full_name')
  const [sortDirection, setSortDirection] = useState('ascending')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [actionMenuVisible, setActionMenuVisible] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        profile_status:user_status_id (status_name),
        profile_roles:role_id (role_name),
        verify_status:verify_status_id (status_name)
      `)
      .order('first_name', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      setLoading(false)
      return
    }

    const formatted = data.map(user => ({
      id: user.id,
      email: user.email,
      full_name: `${user.first_name || ''} ${user.middle_initial || ''} ${user.last_name || ''}`.trim(),
      contact_number: user.contact_number || 'N/A',
      status: user.profile_status?.status_name || 'Unknown',
      role: user.profile_roles?.role_name || 'N/A',
      verify_status: user.verify_status?.status_name || 'Unverified',
      verify_status_id: user.verify_status_id,
      dateCreated: user.created_at
        ? new Date(user.created_at).toLocaleString()
        : 'N/A',
      lastLogin: user.last_sign_in_at
        ? new Date(user.last_sign_in_at).toLocaleString()
        : 'Never',
      lastUpdated: user.updated_at
        ? new Date(user.updated_at).toLocaleString()
        : 'Never',  
      avatar: (user.first_name || 'N')[0].toUpperCase(),
      pfp_id: user.pfp_id || null,
    }))

    setUsers(formatted)
    setLoading(false)
  }

  useFocusEffect(
    useCallback(() => {
      fetchUsers()
    }, [])
  )

  const handleSort = (column) => {
    setSortDirection(prev =>
      sortColumn === column && prev === 'ascending' ? 'descending' : 'ascending'
    )
    setSortColumn(column)
  }

  const getSortIcon = (column) =>
    sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : ''

  const filteredAndSortedUsers = users
    .filter(user => {
      const searchValue = String(user[searchColumn] || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      
      // Special handling for verification status
      if (searchColumn === 'verify_status') {
        if (query === 'verified') {
          return user.verify_status_id === 1
        } else if (query === 'unverified') {
          return user.verify_status_id === 2
        } else if (query === 'pending') {
          return user.verify_status_id === 3
        }
      }
      
      return searchValue.includes(query)
    })
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]

      // Special handling for date columns
      if (['dateCreated', 'lastLogin', 'lastUpdated'].includes(sortColumn)) {
        // If either value is 'Never' or 'N/A', handle special case
        if (valA === 'Never' || valA === 'N/A') {
          return sortDirection === 'ascending' ? -1 : 1;
        }
        if (valB === 'Never' || valB === 'N/A') {
          return sortDirection === 'ascending' ? 1 : -1;
        }
        
        // For actual dates, compare them normally
        if (valA < valB) return sortDirection === 'ascending' ? -1 : 1;
        if (valA > valB) return sortDirection === 'ascending' ? 1 : -1;
        return 0;
      }

      // Default sorting for non-date columns
      if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
      if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
      return 0
    })

  const from = page * itemsPerPage
  const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedUsers.length)
  const paginatedUsers = filteredAndSortedUsers.slice(from, to)

  const filterOptions = [
    { label: 'Full Name', value: 'full_name' },
    { label: 'Email', value: 'email' },
    { label: 'Role', value: 'role' },
    { label: 'Account Status', value: 'status' },
    { label: 'Verification Status', value: 'verify_status' },
    { label: 'Contact', value: 'contact_number' },
  ]

  const columns = [
    { key: 'full_name', label: 'Full Name', width: FULL_NAME_WIDTH },
    { key: 'email', label: 'Email', width: EMAIL_COLUMN_WIDTH },
    { key: 'contact_number', label: 'Contact Number', width: COLUMN_WIDTH },
    { key: 'role', label: 'Role', width: COLUMN_WIDTH },
    { key: 'status', label: 'Account Status', width: COLUMN_WIDTH },
    { key: 'verify_status', label: 'Verification Status', width: COLUMN_WIDTH },
    { key: 'dateCreated', label: 'Date Created', width: COLUMN_WIDTH },
    { key: 'lastLogin', label: 'Last Login', width: COLUMN_WIDTH },
    { key: 'lastUpdated', label: 'Last Updated', width: COLUMN_WIDTH },
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
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          icon="refresh"
          onPress={fetchUsers}
          style={[styles.button, { borderColor: colors.primary }]}
          contentStyle={styles.buttonContent}
          labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
        >
          Refresh
        </Button>
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Button
              mode="contained"
              icon="filter-variant"
              onPress={() => setFilterMenuVisible(true)}
              style={[styles.button, { borderColor: colors.primary }]}
              contentStyle={styles.buttonContent}
              labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
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
                setFilterMenuVisible(false)
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

      {loading ? (
        <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyMedium]}>
          Loading users...
        </Text>
      ) : (
        <View style={styles.tableContainer}>
          <ScrollView horizontal>
            <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
              <DataTable.Header style={[styles.table, { backgroundColor: colors.surfaceVariant, alignItems: 'center' }]}>
                <DataTable.Title style={{ width: AVATAR_COLUMN_WIDTH, justifyContent: 'center' }}>
                  <Text style={[{ color: colors.onSurface }, fonts.labelLarge]}>Avatar</Text>
                </DataTable.Title>
                {columns.map(({ key, label, width }) => (
                  <DataTable.Title
                    key={key}
                    style={{ width: width || COLUMN_WIDTH, justifyContent: 'center' }}
                    onPress={() => handleSort(key)}
                  >
                    <View style={styles.sortableHeader}>
                      <Text style={[{ color: colors.onSurface }, fonts.labelLarge]}>{label}</Text>
                      <Text style={[styles.sortIcon, { color: colors.onSurface }]}>{getSortIcon(key)}</Text>
                    </View>
                  </DataTable.Title>
                ))}
                <DataTable.Title style={{ width: COLUMN_WIDTH, justifyContent: 'center' }} numeric>
                  <Text style={[{ color: colors.onSurface }, fonts.labelLarge]}>Actions</Text>
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
                paginatedUsers.map(user => (
                  <DataTable.Row key={user.id}>
                    <DataTable.Cell style={{ width: AVATAR_COLUMN_WIDTH, justifyContent: 'center' }}>
                      {user.pfp_id ? (
                        <Avatar.Image size={40} source={{ uri: user.pfp_id }} />
                      ) : (
                        <Avatar.Text size={40} label={user.avatar} />
                      )}
                    </DataTable.Cell>
                    {[
                      { value: user.full_name, width: FULL_NAME_WIDTH },
                      { value: user.email, width: EMAIL_COLUMN_WIDTH },
                      { value: user.contact_number, width: COLUMN_WIDTH },
                      { value: user.role, width: COLUMN_WIDTH },
                      { value: user.status, width: COLUMN_WIDTH },
                      { value: user.verify_status, width: COLUMN_WIDTH },
                      { value: user.dateCreated, width: COLUMN_WIDTH },
                      { value: user.lastLogin, width: COLUMN_WIDTH },
                      { value: user.lastUpdated, width: COLUMN_WIDTH },
                    ].map(({ value, width }, idx) => (
                      <DataTable.Cell
                        key={idx}
                        style={{ width, justifyContent: 'center', paddingVertical: 8 }}
                      >
                        <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>{value}</Text>
                      </DataTable.Cell>
                    ))}
                    <DataTable.Cell numeric style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 8 }}>
                      <Menu
                        visible={actionMenuVisible === user.id}
                        onDismiss={() => setActionMenuVisible(null)}
                        anchor={
                          <Button
                            mode="outlined"
                            icon="dots-vertical"
                            onPress={() => setActionMenuVisible(user.id)}
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                          >
                            Actions
                          </Button>
                        }
                        contentStyle={{ backgroundColor: colors.surface }}
                      >
                        <Menu.Item
                          onPress={() => {
                            setActionMenuVisible(null)
                            navigation.navigate('ViewAccount', { userId: user.id })
                          }}
                          title="View Account"
                          leadingIcon="eye"
                          titleStyle={[
                            {
                              color: colors.onSurface,
                            },
                            fonts.bodyLarge,
                          ]}
                        />
                        <Menu.Item
                          onPress={() => {
                            setActionMenuVisible(null)
                            navigation.navigate('EditAccount', { userId: user.id })
                          }}
                          title="Edit Account"
                          leadingIcon="account-edit"
                          titleStyle={[
                            {
                              color: colors.onSurface,
                            },
                            fonts.bodyLarge,
                          ]}
                        />
                      </Menu>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))
              )}
            </DataTable>
          </ScrollView>

          <View style={[styles.paginationContainer, { backgroundColor: colors.surface }]}>
            <DataTable.Pagination
              page={page}
              numberOfPages={Math.ceil(filteredAndSortedUsers.length / itemsPerPage)}
              onPageChange={page => setPage(page)}
              label={`${from + 1}-${to} of ${filteredAndSortedUsers.length}`}
              labelStyle={[{ color: colors.onSurface }, fonts.bodyMedium]}
              showFirstPageButton
              showLastPageButton
              showFastPaginationControls
              numberOfItemsPerPageList={[5, 10, 20, 50]}
              numberOfItemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              selectPageDropdownLabel={'Rows per page'}
              style={[styles.pagination, { backgroundColor: colors.surfaceVariant }]}
              theme={{
                colors: {
                  onSurface: colors.onSurface,
                  text: colors.onSurface,
                  elevation: {
                    level2: colors.surface,
                  },
                },
                fonts: {
                  bodyMedium: fonts.bodyMedium,
                  labelMedium: fonts.labelMedium,
                },
              }}
            />
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  searchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 16,
    gap: 10,
  },
  button: {
    marginVertical: 6,
    height: 48,
    borderRadius: 8,
    minWidth: '40%',
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tableContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 8,
    minHeight: '70%',
    marginBottom: 16,
    overflow: 'hidden',
  },
  table: {
    flex: 1,
  },
  sortableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortIcon: {
    marginLeft: 4,
  },
  actionButton: {
    borderRadius: 8,
    minWidth: 100,
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
  paginationContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
  pagination: {
    justifyContent: 'space-evenly',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
})

export default UserManagement