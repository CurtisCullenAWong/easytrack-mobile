import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native'
import {
  Searchbar,
  Button,
  Avatar,
  DataTable,
  Text,
  useTheme,
  Menu,
  Dialog,
  Portal,
  Surface,
} from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabaseAdmin'

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
  const [showDialog, setShowDialog] = useState(false)
  const [showDialogConfirm, setShowDialogConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState({
    id: null,
    email: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        *,
        profile_status:user_status_id (status_name),
        profile_roles:role_id (role_name),
        verify_status:verify_status_id (status_name)
      `
      )
      .order('first_name', { ascending: true })

    if (error) {
      console.error('Error fetching users:', error)
      setLoading(false)
      return
    }

    const formatted = data.map(user => ({
      id: user.id,
      email: user.email,
      full_name: `${user?.first_name || ''} ${user?.middle_initial || ''} ${user?.last_name || ''} ${user?.suffix || ''}`.trim() || 'N/A',
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

      if (searchColumn === 'verify_status') {
        if (query === 'verified') return user.verify_status_id === 1
        if (query === 'unverified') return user.verify_status_id === 2
        if (query === 'pending') return user.verify_status_id === 3
      }

      return searchValue.includes(query)
    })
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]

      if (['dateCreated', 'lastLogin', 'lastUpdated'].includes(sortColumn)) {
        if (valA === 'Never' || valA === 'N/A') return sortDirection === 'ascending' ? -1 : 1;
        if (valB === 'Never' || valB === 'N/A') return sortDirection === 'ascending' ? 1 : -1;
        if (valA < valB) return sortDirection === 'ascending' ? -1 : 1;
        if (valA > valB) return sortDirection === 'ascending' ? 1 : -1;
        return 0;
      }

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

  const handleArchiveAccount = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_status_id: 3 })
        .eq('id', userId)

      if (error) {
        console.error('Error archiving account:', error)
      } else {
        fetchUsers()
      }
    } catch (error) {
      console.error('Error archiving account:', error)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchUsers().finally(() => setRefreshing(false))
  }, [])

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Header navigation={navigation} title="Manage Users" />
      <View style={styles.container}>
        {/* Search & Filter Section */}
        <Surface style={[styles.searchSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
            Search & Filter
          </Text>
          <View style={styles.controlsRow}>
            <Searchbar
              placeholder={`Search by ${filterOptions.find(opt => opt.value === searchColumn)?.label}`}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={[styles.searchbar, { backgroundColor: colors.surfaceVariant }]}
              iconColor={colors.onSurfaceVariant}
              inputStyle={[styles.searchInput, { color: colors.onSurfaceVariant }]}
            />
            <View style={styles.filterButtonContainer}>
              <Menu
                visible={filterMenuVisible}
                onDismiss={() => setFilterMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    icon="filter-variant"
                    onPress={() => setFilterMenuVisible(true)}
                    style={[styles.filterButton, { borderColor: colors.outline }]}
                    contentStyle={styles.buttonContent}
                    labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                  >
                    Filter
                  </Button>
                }
                contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
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
          </View>
        </Surface>

        {/* Action Button Section */}
        <Surface style={[styles.actionSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Button
            mode="contained"
            icon="account-plus"
            onPress={() => navigation.navigate('AddAccount')}
            style={[styles.button, { borderColor: colors.primary }]}
            contentStyle={styles.buttonContent}
            labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
          >
            Add Account
          </Button>
        </Surface>

        {/* Results Section */}
        <Surface style={[styles.resultsSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
              User Results
            </Text>
            {!loading && (
              <Text style={[styles.resultsCount, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                {filteredAndSortedUsers.length} user{filteredAndSortedUsers.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyLarge]}>
                Loading users...
              </Text>
            </View>
          ) : (
            <View style={styles.tableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
                  <DataTable.Header style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
                    <DataTable.Title style={[styles.actionColumn, { justifyContent: 'center' }]}>
                      <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>Actions</Text>
                    </DataTable.Title>
                    <DataTable.Title style={{ width: AVATAR_COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
                      <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>Avatar</Text>
                    </DataTable.Title>
                    {columns.map(({ key, label, width }) => (
                      <DataTable.Title
                        key={key}
                        style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                        onPress={() => handleSort(key)}
                      >
                        <View style={styles.sortableHeader}>
                          <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>{label}</Text>
                          <Text style={[styles.sortIcon, { color: colors.onSurface }]}>{getSortIcon(key)}</Text>
                        </View>
                      </DataTable.Title>
                    ))}
                  </DataTable.Header>

                  {filteredAndSortedUsers.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={styles.noDataCell}>
                        <Text style={[styles.noDataText, { color: colors.onSurfaceVariant }, fonts.bodyLarge]}>
                          No users available
                        </Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    paginatedUsers.map((user, index) => (
                      <DataTable.Row
                        key={user.id}
                        style={[
                          styles.tableRow,
                          index % 2 === 0 && { backgroundColor: colors.surfaceVariant + '20' }
                        ]}
                      >
                        <DataTable.Cell style={[styles.actionColumn, { justifyContent: 'center' }]}>
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
                                setShowDialog(true)
                                setUserToDelete({
                                  id: user.id,
                                  email: user.email,
                                })
                              }}
                              title="Archive Account"
                              leadingIcon="archive"
                              titleStyle={[
                                {
                                  color: colors.error,
                                },
                                fonts.bodyLarge,
                              ]}
                            />
                          </Menu>
                        </DataTable.Cell>
                        <DataTable.Cell style={{ width: AVATAR_COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
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
                            style={[styles.tableColumn, { width, justifyContent: 'center' }]}
                          >
                            <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]}>{value}</Text>
                          </DataTable.Cell>
                        ))}
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>
              {filteredAndSortedUsers.length > 0 && (
                <View style={[styles.paginationContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <DataTable.Pagination
                    page={page}
                    numberOfPages={Math.ceil(filteredAndSortedUsers.length / itemsPerPage)}
                    onPageChange={page => setPage(page)}
                    label={`${from + 1}-${to} of ${filteredAndSortedUsers.length}`}
                    labelStyle={[styles.paginationLabel, { color: colors.onSurface }, fonts.bodyMedium]}
                    showFirstPageButton
                    showLastPageButton
                    showFastPaginationControls
                    numberOfItemsPerPageList={[5, 10, 20, 50]}
                    numberOfItemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    selectPageDropdownLabel={'Rows per page'}
                    style={styles.pagination}
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
              )}
            </View>
          )}
        </Surface>
      </View>
      <Portal>
        <Dialog
          visible={showDialog}
          onDismiss={() => setShowDialog(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Archive Account for {userToDelete.email}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurface }}>This will archive the account. The user will no longer be able to access the system.</Text>
            <Text style={{ color: colors.onSurface }}>Are you sure you want to proceed?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>Cancel</Button>
            <Button onPress={() => {
              setShowDialogConfirm(true)
              setShowDialog(false)
            }}>Archive</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Portal>
        <Dialog
          visible={showDialogConfirm}
          onDismiss={() => setShowDialogConfirm(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Are you sure you want to archive this account?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurface }}>Account Email: {userToDelete.email}</Text>
            <Text style={{ color: colors.onSurface }}>This action can be reversed by an administrator.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialogConfirm(false)}>Cancel</Button>
            <Button style={{ backgroundColor: colors.error }} onPress={() => {
              setShowDialogConfirm(false)
              handleArchiveAccount(userToDelete.id)
            }}><Text style={[fonts.labelLarge, { color: colors.onError }]}>Confirm Archive</Text></Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  searchSurface: {
    padding: 16,
    borderRadius: 12,
  },
  actionSurface: {
    padding: 16,
    borderRadius: 12,
  },
  resultsSurface: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchbar: {
    flex: 1,
    borderRadius: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  filterButtonContainer: {
    position: 'relative',
  },
  filterButton: {
    borderRadius: 8,
    minWidth: 100,
  },
  button: {
    marginVertical: 10,
    height: 48,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuContent: {
    width: '100%',
    left: 0,
    right: 0,
  },
  resultsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  resultsCount: {
    marginTop: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
  },
  tableContainer: {
    flex: 1,
  },
  table: {
    flex: 1,
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  actionColumn: {
    width: 140,
    paddingVertical: 12,
  },
  tableColumn: {
    paddingVertical: 12,
  },
  sortableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortIcon: {
    fontSize: 12,
  },
  headerText: {
    fontWeight: '600',
  },
  cellText: {
    textAlign: 'center',
  },
  paginationContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
  pagination: {
    justifyContent: 'space-evenly',
  },
  paginationLabel: {
    fontWeight: '500',
  },
  noDataCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    flex: 1,
  },
  noDataText: {
    textAlign: 'center',
  },
})

export default UserManagement