import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native'
import {
  Searchbar,
  Button,
  DataTable,
  Text,
  useTheme,
  Menu,
  Dialog,
  Portal,
  List,
} from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabaseAdmin'
import useSnackbar from '../../../components/hooks/useSnackbar'

const COLUMN_WIDTH = 180
const FULL_NAME_WIDTH = 200

const AssignLuggage = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('status')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('status')
  const [sortDirection, setSortDirection] = useState('descending')
  const [contracts, setContracts] = useState([])
  const [deliveryPersonnel, setDeliveryPersonnel] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState(null)
  const [actionMenuVisible, setActionMenuVisible] = useState(null)

  const fetchContracts = async () => {
    setLoading(true)
    
    const { data: contractsData, error: contractsError } = await supabase
      .from('contract')
      .select(`
        *,
        contract_status:contract_status_id (status_name),
        airline:airline_id (
          first_name,
          middle_initial,
          last_name,
          suffix
        ),
        delivery:delivery_id (
          first_name,
          middle_initial,
          last_name,
          suffix
        )
      `)
      .in('contract_status_id', [1, 3, 4])
      .order('created_at', { ascending: false })

    if (contractsError) {
      console.error('Error fetching contracts:', contractsError)
      showSnackbar('Failed to fetch contracts')
      setLoading(false)
      return
    }

    const { data: personnelData, error: personnelError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role_id',2)
      .eq('verify_status_id', 1)
    if (personnelError) {
      console.error('Error fetching delivery personnel:', personnelError)
      showSnackbar('Failed to fetch delivery personnel')
      setLoading(false)
      return
    }

    const formatted = contractsData.map(contract => {
      return {
        id: contract.id,
        status: contract.contract_status?.status_name || 'N/A',
        contract_status_id: contract.contract_status_id,
        luggage_quantity: contract.luggage_quantity || 'N/A',
        drop_off_location: contract.drop_off_location || 'N/A',
        airline_name: `${contract.airline?.first_name || ''} ${contract.airline?.middle_initial || ''} ${contract.airline?.last_name || ''} ${contract.airline?.suffix || ''}`.trim() || 'N/A',
        delivery_name: contract.delivery ? `${contract.delivery?.first_name || ''} ${contract.delivery?.middle_initial || ''} ${contract.delivery?.last_name || ''} ${contract.delivery?.suffix || ''}`.trim() : 'Not Assigned',
        created_at: contract.created_at
          ? new Date(contract.created_at).toLocaleString()
          : 'N/A',
      }
    })

    setContracts(formatted)
    setDeliveryPersonnel(personnelData)
    setLoading(false)
  }

  useFocusEffect(
    useCallback(() => {
      fetchContracts()
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

  const filteredAndSortedContracts = contracts
    .filter(contract => {
      const searchValue = String(contract[searchColumn] || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      return searchValue.includes(query)
    })
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]

      if (['created_at'].includes(sortColumn)) {
        if (valA === 'N/A') return sortDirection === 'ascending' ? -1 : 1
        if (valB === 'N/A') return sortDirection === 'ascending' ? 1 : -1
        if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
        if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
        return 0
      }

      if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
      if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
      return 0
    })

  const from = page * itemsPerPage
  const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedContracts.length)
  const paginatedContracts = filteredAndSortedContracts.slice(from, to)

  const filterOptions = [
    { label: 'Status', value: 'status' },
    { label: 'Drop-off Location', value: 'drop_off_location' },
    { label: 'Contractor Name', value: 'airline_name' },
    { label: 'Sub-contractor Name', value: 'delivery_name' },
  ]

  const columns = [
    { key: 'id', label: 'Contract ID', width: COLUMN_WIDTH },
    { key: 'status', label: 'Status', width: COLUMN_WIDTH },
    { key: 'luggage_quantity', label: 'Luggage Quantity', width: COLUMN_WIDTH },
    { key: 'drop_off_location', label: 'Drop-off Location', width: COLUMN_WIDTH },
    { key: 'airline_name', label: 'Contractor Name', width: FULL_NAME_WIDTH },
    { key: 'delivery_name', label: 'Sub-contractor Name', width: FULL_NAME_WIDTH },
    { key: 'created_at', label: 'Created At', width: COLUMN_WIDTH },
  ]

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchContracts().finally(() => setRefreshing(false))
  }, [])

  const handleAssignDelivery = async () => {
    if (!selectedDeliveryPerson) {
      showSnackbar('Please select a delivery personnel')
      return
    }

    try {
      const { error } = await supabase
        .from('contract')
        .update({ 
          delivery_id: selectedDeliveryPerson.id,
          contract_status_id: 3 // Update status to assigned
        })
        .eq('id', selectedContract.id)

      if (error) throw error

      showSnackbar('Successfully assigned delivery personnel', true)
      setShowAssignDialog(false)
      setSelectedDeliveryPerson(null)
      fetchContracts()
    } catch (error) {
      console.error('Error assigning delivery personnel:', error)
      showSnackbar('Failed to assign delivery personnel')
    }
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Header navigation={navigation} title="Luggage Management" />
      {SnackbarElement}

      <View style={styles.searchActionsRow}>
        <Searchbar
          placeholder={`Search by ${filterOptions.find(opt => opt.value === searchColumn)?.label}`}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: colors.surface }]}
        />
      </View>

      <View style={styles.buttonContainer}>
        <View style={[styles.buttonContainer1]}>
          <Menu
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <Button
                mode="contained"
                icon="filter-variant"
                onPress={() => setFilterMenuVisible(true)}
                style={[styles.button, { borderColor: colors.primary, minWidth: 'auto'}]}
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
      </View>

      {loading ? (
        <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyMedium]}>
          Loading contracts...
        </Text>
      ) : (
        <View style={styles.tableContainer}>
          <ScrollView horizontal>
            <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
              <DataTable.Header style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
                {columns.map(({ key, label, width }) => (
                  <DataTable.Title
                    key={key}
                    style={{ width, justifyContent: 'center', paddingVertical: 12 }}
                    onPress={() => handleSort(key)}
                  >
                    <View style={styles.sortableHeader}>
                      <Text style={[styles.headerText, { color: colors.onSurface }]}>{label}</Text>
                      <Text style={[styles.sortIcon, { color: colors.onSurface }]}>{getSortIcon(key)}</Text>
                    </View>
                  </DataTable.Title>
                ))}
                <DataTable.Title style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
                  <Text style={[styles.headerText, { color: colors.onSurface }]}>Actions</Text>
                </DataTable.Title>
              </DataTable.Header>

              {filteredAndSortedContracts.length === 0 ? (
                <DataTable.Row>
                  <DataTable.Cell style={styles.noDataCell}>
                    <Text style={[{ color: colors.onSurface, textAlign: 'center' }, fonts.bodyMedium]}>
                      No contracts available
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ) : (
                paginatedContracts.map(contract => (
                  <DataTable.Row key={contract.id}>
                    {columns.map(({ key, width }, idx) => (
                      <DataTable.Cell
                        key={idx}
                        style={{ width, justifyContent: 'center', paddingVertical: 12 }}
                      >
                        <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                          {contract[key]}
                        </Text>
                      </DataTable.Cell>
                    ))}                    
                    <DataTable.Cell numeric style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
                      <Menu
                        visible={actionMenuVisible === contract.id}
                        onDismiss={() => setActionMenuVisible(null)}
                        anchor={
                          <Button
                            mode="outlined"
                            icon="dots-vertical"
                            onPress={() => setActionMenuVisible(contract.id)}
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                          >
                            Actions
                          </Button>
                        }
                        contentStyle={{ backgroundColor: colors.surface }}
                      >
                        {contract.contract_status_id === 1 && (
                          <Menu.Item
                            onPress={() => {
                              setActionMenuVisible(null)
                              setSelectedContract(contract)
                              setShowAssignDialog(true)
                            }}
                            title="Assign Luggage"
                            leadingIcon="account-plus"
                            titleStyle={[
                              {
                                color: colors.onSurface,
                              },
                              fonts.bodyLarge,
                            ]}
                          />
                        )}
                        {(contract.contract_status_id === 3 || contract.contract_status_id === 4) && (
                          <Menu.Item
                            onPress={() => {
                              setActionMenuVisible(null)
                              navigation.navigate('ContractDetailsAdmin', { id: contract.id })
                            }}
                            title="Track Luggage"
                            leadingIcon="map-marker"
                            titleStyle={[
                              {
                                color: colors.onSurface,
                              },
                              fonts.bodyLarge,
                            ]}
                          />
                        )}
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
              numberOfPages={Math.ceil(filteredAndSortedContracts.length / itemsPerPage)}
              onPageChange={page => setPage(page)}
              label={`${from + 1}-${to} of ${filteredAndSortedContracts.length}`}
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

          <Portal>
            <Dialog
              visible={showAssignDialog}
              onDismiss={() => {
                setShowAssignDialog(false)
                setSelectedDeliveryPerson(null)
              }}
              style={[styles.dialog, { backgroundColor: colors.surface }]}
            >
              <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>
                Assign Delivery Personnel
              </Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                <ScrollView style={styles.deliveryList}>
                  {deliveryPersonnel.map(person => (
                    <List.Item
                      key={person.id}
                      title={`${person.first_name} ${person.middle_initial || ''} ${person.last_name} ${person.suffix || ''}`}
                      description={`Phone: ${person.contact_number}`}
                      left={props => (
                        <List.Icon
                          {...props}
                          icon={selectedDeliveryPerson?.id === person.id ? 'check-circle' : 'account'}
                          color={selectedDeliveryPerson?.id === person.id ? colors.primary : colors.onSurface}
                        />
                      )}
                      onPress={() => setSelectedDeliveryPerson(person)}
                      style={[
                        styles.deliveryItem,
                        selectedDeliveryPerson?.id === person.id && {
                          backgroundColor: colors.primaryContainer,
                        },
                      ]}
                    />
                  ))}
                </ScrollView>
              </Dialog.Content>
              <Dialog.Actions style={styles.dialogActions}>
                <Button onPress={() => {
                  setShowAssignDialog(false)
                  setSelectedDeliveryPerson(null)
                }}>
                  Cancel
                </Button>
                <Button onPress={handleAssignDelivery}>
                  Assign
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    gap: 8,
  },
  buttonContainer1: {
    marginHorizontal: 'auto'
  },
  button: {
    marginVertical: 10,
    height: 40,
    borderRadius: 8,
  },
  buttonContent: {
    height: 40,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tableContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    minHeight: 'auto',
    overflow: 'hidden',
  },
  table: {
    flex: 1,
  },
  sortableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sortIcon: {
    fontSize: 12,
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
  dialog: {
    borderRadius: 8,
    maxWidth: 500,
    width: '90%',
    alignSelf: 'center',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  dialogActions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  deliveryList: {
    maxHeight: 300,
  },
  deliveryItem: {
    borderRadius: 8,
    marginVertical: 4,
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
})

export default AssignLuggage
