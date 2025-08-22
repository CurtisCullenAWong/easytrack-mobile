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
  Checkbox,
  Surface,
} from 'react-native-paper'
import { supabase } from '../../../../lib/supabaseAdmin'
import useSnackbar from '../../../hooks/useSnackbar'

const COLUMN_WIDTH = 180
const FULL_NAME_WIDTH = 200

const PendingContracts = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('status')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedContracts, setSelectedContracts] = useState(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contracts')
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
      .in('contract_status_id', [5, 6]) // 5 for delivered, 6 for failed
      .is('summary_id', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
      return
    }

    const formatted = data.map(transaction => {
      let completionDate = 'N/A'
      if (transaction.delivered_at) {
        completionDate = new Date(transaction.delivered_at).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      } else if (transaction.cancelled_at) {
        completionDate = new Date(transaction.cancelled_at).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      }

      const ownerName = [
        transaction.owner_first_name,
        transaction.owner_middle_initial,
        transaction.owner_last_name
      ].filter(Boolean).join(' ') || 'N/A'

      const amount = (transaction.delivery_charge || 0) + (transaction.delivery_surcharge || 0) - (transaction.delivery_discount || 0)

      return {
        key: transaction.id,
        id: transaction.id,
        status: transaction.contract_status?.status_name || 'N/A',
        drop_off_location: transaction.drop_off_location || transaction.delivery_address || 'N/A',
        completion_date: completionDate,
        delivery_charge: transaction.delivery_charge || 0,
        delivery_surcharge: transaction.delivery_surcharge || 0,
        delivery_discount: transaction.delivery_discount || 0,
        luggage_owner: ownerName,
        amount_per_passenger: amount,
        remarks: transaction.remarks || 'N/A',
        flight_number: transaction.flight_number || 'N/A',
        passenger_form: transaction.passenger_form || null,
        created_at: transaction.created_at
          ? new Date(transaction.created_at).toLocaleString()
          : 'N/A',
        luggage_description: transaction.luggage_description || 'N/A',
        luggage_weight: transaction.luggage_weight || 'N/A',
        luggage_quantity: transaction.luggage_quantity || 'N/A',
        case_number: transaction.case_number || 'N/A',
        owner_contact: transaction.owner_contact || 'N/A',
        passenger_id: transaction.passenger_id || 'N/A',
        proof_of_delivery: transaction.proof_of_delivery || null,
      }
    })

    setTransactions(formatted)
    setLoading(false)
  }

  useFocusEffect(
    useCallback(() => {
      fetchTransactions()
      resetSelection()
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

  const filteredAndSortedTransactions = transactions
    .filter(transaction => {
      if (!searchQuery) return true;
      const searchValue = String(transaction[searchColumn] || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      return searchValue.includes(query)
    })
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]

      if (['created_at', 'updated_at', 'completion_date'].includes(sortColumn)) {
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
  const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedTransactions.length)
  const paginatedTransactions = filteredAndSortedTransactions.slice(from, to)

  const filterOptions = [
    { label: 'Status', value: 'status' },
    { label: 'Drop-off Location', value: 'drop_off_location' },
    { label: 'Luggage Owner', value: 'luggage_owner' },
    { label: 'Contract ID', value: 'id' },
  ]

  const columns = [
    { key: 'id', label: 'Contract ID', width: COLUMN_WIDTH },
    { key: 'luggage_owner', label: 'Luggage Owner', width: FULL_NAME_WIDTH },
    { key: 'drop_off_location', label: 'Address', width: COLUMN_WIDTH },
    { key: 'completion_date', label: 'Date Received', width: COLUMN_WIDTH },
    { key: 'status', label: 'Status', width: COLUMN_WIDTH },
    { key: 'amount_per_passenger', label: 'Amount', width: COLUMN_WIDTH },
    { key: 'remarks', label: 'Remarks', width: COLUMN_WIDTH },
    { key: 'created_at', label: 'Created At', width: COLUMN_WIDTH },
  ]

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchTransactions().finally(() => setRefreshing(false))
  }, [])

  const handleViewDetails = (transaction) => {
    navigation.navigate('ContractDetailsAdmin', { id: transaction.id })
  }

  const formatCurrency = (amount) => `₱${parseFloat(amount).toFixed(2)}`
  const formatPercentage = (amount) => `${parseFloat(amount).toFixed(2)}%`

  const handleContractSelection = (contractId) => {
    const newSelected = new Set(selectedContracts)
    if (newSelected.has(contractId)) {
      newSelected.delete(contractId)
    } else {
      newSelected.add(contractId)
    }
    setSelectedContracts(newSelected)
    const allContractIds = new Set(paginatedTransactions.map(t => t.id))
    setSelectAll(newSelected.size === allContractIds.size && allContractIds.size > 0)
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedContracts(new Set())
    } else {
      const allContractIds = new Set(paginatedTransactions.map(t => t.id))
      setSelectedContracts(allContractIds)
    }
    setSelectAll(!selectAll)
  }

  const handleGenerateSummary = async () => {
    if (selectedContracts.size === 0) {
      showSnackbar('Please select at least one contract to generate summary')
      return
    }

    const selectedTransactions = transactions.filter(t => selectedContracts.has(t.id))

    // Summarized amount should be the sum of delivery_charge only
    const totalAmount = selectedTransactions.reduce((sum, t) => {
      return sum + (t.delivery_charge || 0)
    }, 0)

    const totalDiscount = selectedTransactions.reduce((sum, t) => sum + (t.delivery_discount || 0), 0)
    const summary = {
      totalTransactions: selectedTransactions.length,
      totalAmount: totalAmount,
      totalSurcharge: selectedTransactions.reduce((sum, t) => sum + (t.delivery_surcharge || 0), 0),
      totalDiscount: totalDiscount,
      statusCounts: selectedTransactions.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {}),
      selectedContracts: Array.from(selectedContracts)
    }

    navigation.navigate('TransactionSummary', {
      summaryData: summary,
      transactions: selectedTransactions,
      pendingContracts: Array.from(selectedContracts)
    })
  }

  const resetSelection = () => {
    setSelectedContracts(new Set())
    setSelectAll(false)
  }

  return (
    <ScrollView 
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {SnackbarElement}

      <View style={styles.container}>
        {/* Search Section */}
        <Surface style={[styles.searchSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
            Search & Filter
          </Text>
          <Searchbar
            placeholder={`Search by ${filterOptions.find(opt => opt.value === searchColumn)?.label}`}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchbar, { backgroundColor: colors.surfaceVariant }]}
            iconColor={colors.onSurfaceVariant}
            inputStyle={[styles.searchInput, { color: colors.onSurfaceVariant }]}
          />
        </Surface>

        {/* Filters Section */}
        <Surface style={[styles.filtersSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.filtersRow}>
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
                Search Column
              </Text>
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
                    {filterOptions.find(opt => opt.value === searchColumn)?.label || 'Select Column'}
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

        {/* Selection Section */}
        <Surface style={[styles.selectionSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.selectionContainer}>
            <View style={styles.selectAllContainer}>
              <Checkbox
                status={selectAll ? 'checked' : 'unchecked'}
                onPress={handleSelectAll}
                color={colors.primary}
              />
              <Text style={[styles.selectAllText, { color: colors.onSurface }, fonts.bodyMedium]}>
                Select All ({paginatedTransactions.length})
              </Text>
            </View>
            <Text style={[styles.selectedCount, { color: colors.primary }, fonts.bodyMedium]}>
              Selected: {selectedContracts.size}
            </Text>
          </View>
          <Button
            mode="contained"
            icon="file-document-outline"
            onPress={handleGenerateSummary}
            style={[
              styles.generateButton, 
              { 
                backgroundColor: selectedContracts.size === 0 ? colors.surfaceDisabled : colors.primary,
                opacity: selectedContracts.size === 0 ? 0.6 : 1
              }
            ]}
            contentStyle={styles.buttonContent}
            labelStyle={[
              styles.buttonLabel, 
              { 
                color: selectedContracts.size === 0 ? colors.onSurfaceDisabled : colors.onPrimary 
              }
            ]}
            disabled={selectedContracts.size === 0}
          >
            Generate Summary ({selectedContracts.size})
          </Button>
        </Surface>

        {/* Results Section */}
        <Surface style={[styles.resultsSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
              Pending Transactions
            </Text>
            {!loading && (
              <Text style={[styles.resultsCount, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                {filteredAndSortedTransactions.length} transaction{filteredAndSortedTransactions.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyLarge]}>
                Loading transactions...
              </Text>
            </View>
          ) : (
            <View style={styles.tableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
                  <DataTable.Header style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
                    <DataTable.Title style={[styles.selectColumn, { justifyContent: 'center' }]}>
                      <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>Select</Text>
                    </DataTable.Title>
                    <DataTable.Title style={[styles.actionColumn, { justifyContent: 'center' }]}>
                      <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>Details</Text>
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

                  {filteredAndSortedTransactions.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={styles.noDataCell}>
                        <Text style={[styles.noDataText, { color: colors.onSurfaceVariant }, fonts.bodyLarge]}>
                          No transactions found matching your criteria
                        </Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    paginatedTransactions.map((transaction, index) => (
                      <DataTable.Row 
                        key={transaction.key}
                        style={[
                          styles.tableRow,
                          index % 2 === 0 && { backgroundColor: colors.surfaceVariant + '20' }
                        ]}
                      >
                        <DataTable.Cell style={[styles.selectColumn, { justifyContent: 'center' }]}>
                          <Checkbox
                            status={selectedContracts.has(transaction.id) ? 'checked' : 'unchecked'}
                            onPress={() => handleContractSelection(transaction.id)}
                            color={colors.primary}
                          />
                        </DataTable.Cell>
                        <DataTable.Cell style={[styles.actionColumn, { justifyContent: 'center' }]}>
                          <Button
                            mode="outlined"
                            icon="eye"
                            onPress={() => handleViewDetails(transaction)}
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                          >
                            View Details
                          </Button>
                        </DataTable.Cell>
                        {columns.map(({ key, width }, idx) => (
                          <DataTable.Cell
                            key={idx}
                            style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                          >
                            <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]}>
                              {['delivery_charge', 'delivery_surcharge', 'amount_per_passenger'].includes(key)
                                ? formatCurrency(transaction[key])
                                : key === 'delivery_discount'
                                ? formatPercentage(transaction[key])
                                : transaction[key]}
                            </Text>
                          </DataTable.Cell>
                        ))}
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>

              {/* Pagination */}
              {filteredAndSortedTransactions.length > 0 && (
                <View style={[styles.paginationContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <DataTable.Pagination
                    page={page}
                    numberOfPages={Math.ceil(filteredAndSortedTransactions.length / itemsPerPage)}
                    onPageChange={page => setPage(page)}
                    label={`${from + 1}-${to} of ${filteredAndSortedTransactions.length}`}
                    labelStyle={[styles.paginationLabel, { color: colors.onSurface }, fonts.bodyMedium]}
                    showFirstPageButton
                    showLastPageButton
                    showFastPaginationControls
                    numberOfItemsPerPageList={[5, 50, 100, 200]}
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
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  searchbar: {
    borderRadius: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  filtersSurface: {
    padding: 16,
    borderRadius: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 16,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  filterButton: {
    borderRadius: 8,
  },
  menuContent: {
    width: '100%',
    left: 0,
    right: 0,
  },
  buttonContent: {
    height: 40,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectionSurface: {
    padding: 16,
    borderRadius: 12,
  },
  selectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: 8,
  },
  selectedCount: {
    fontWeight: 'bold',
  },
  generateButton: {
    borderRadius: 8,
  },
  resultsSurface: {
    borderRadius: 12,
    overflow: 'hidden',
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
  selectColumn: {
    width: 80,
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
  actionButton: {
    borderRadius: 8,
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
})

export default PendingContracts


