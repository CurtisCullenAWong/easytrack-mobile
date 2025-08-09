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
} from 'react-native-paper'
import { supabase } from '../../../../lib/supabaseAdmin'
import useSnackbar from '../../../hooks/useSnackbar'

const COLUMN_WIDTH = 180
const FULL_NAME_WIDTH = 200

const PendingReceipts = ({ navigation }) => {
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
      .is('payment_id', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
      return
    }

    // Format the data for display
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

      // Build owner name from individual fields
      const ownerName = [
        transaction.owner_first_name,
        transaction.owner_middle_initial,
        transaction.owner_last_name
      ].filter(Boolean).join(' ') || 'N/A'

      const baseAmount = (transaction.delivery_charge || 0) + (transaction.delivery_surcharge || 0)
      const discountedAmount = baseAmount * (1 - ((transaction.delivery_discount || 0) / 100))

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
        amount_per_passenger: discountedAmount,
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

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2)}`
  }

  const formatPercentage = (amount) => {
    return `${parseFloat(amount).toFixed(2)}%`
  }

  const handleGenerateSummary = async () => {
    try {
      const summary = {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + (t.amount_per_passenger || 0), 0),
        totalSurcharge: transactions.reduce((sum, t) => sum + (t.delivery_surcharge || 0), 0),
        totalDiscount: transactions.reduce((sum, t) => sum + (t.delivery_discount || 0), 0),
        statusCounts: transactions.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1
          return acc
        }, {})
      }

      navigation.navigate('TransactionSummary', {
        summaryData: summary,
        transactions: transactions
      })
    } catch (error) {
      console.error('Error generating summary:', error)
      showSnackbar(`Failed to generate summary: ${error.message}`)
    }
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
        <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>Filter by:</Text>
        <View style={styles.menuAnchor}>
          <Menu
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <Button
                mode="contained"
                icon="filter-variant"
                onPress={() => setFilterMenuVisible(true)}
                style={[styles.button, { borderColor: colors.primary, flex: 1 }]}
                contentStyle={styles.buttonContent}
                labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
              >
                {filterOptions.find(opt => opt.value === searchColumn)?.label}
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
      <View style={styles.buttonContainer}>
        <Button
            mode="contained"
            icon="file-document-outline"
            onPress={handleGenerateSummary}
            style={[
              styles.button, 
              { 
                backgroundColor: transactions.length === 0 ? colors.surfaceDisabled : colors.primary,
                width: '100%',
                opacity: transactions.length === 0 ? 0.6 : 1
              }
            ]}
            contentStyle={styles.buttonContent}
            labelStyle={[
              styles.buttonLabel, 
              { 
                color: transactions.length === 0 ? colors.onSurfaceDisabled : colors.onPrimary 
              }
            ]}
            disabled={transactions.length === 0}
        >
            Generate Summary
        </Button>
      </View>
      {loading ? (
        <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyMedium]}>
          Loading transactions...
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

              {filteredAndSortedTransactions.length === 0 ? (
                <DataTable.Row>
                  <DataTable.Cell style={styles.noDataCell}>
                    <Text style={[{ color: colors.onSurface, textAlign: 'center' }, fonts.bodyMedium]}>
                      No transactions available
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ) : (
                paginatedTransactions.map(transaction => (
                  <DataTable.Row key={transaction.key}>
                    {columns.map(({ key, width }, idx) => (
                      <DataTable.Cell
                        key={idx}
                        style={{ width, justifyContent: 'center', paddingVertical: 12 }}
                      >
                        <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                          {['delivery_charge', 'delivery_surcharge', 'amount_per_passenger'].includes(key)
                            ? formatCurrency(transaction[key])
                            : key === 'delivery_discount'
                            ? formatPercentage(transaction[key])
                            : transaction[key]}
                        </Text>
                      </DataTable.Cell>
                    ))}
                    <DataTable.Cell numeric style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
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
                  </DataTable.Row>
                ))
              )}
            </DataTable>
          </ScrollView>

          <View style={[styles.paginationContainer, { backgroundColor: colors.surface }]}>
            <DataTable.Pagination
              page={page}
              numberOfPages={Math.ceil(filteredAndSortedTransactions.length / itemsPerPage)}
              onPageChange={page => setPage(page)}
              label={`${from + 1}-${to} of ${filteredAndSortedTransactions.length}`}
              labelStyle={[{ color: colors.onSurface }, fonts.bodyMedium]}
              showFirstPageButton
              showLastPageButton
              showFastPaginationControls
              numberOfItemsPerPageList={[5, 50, 100, 200]}
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
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 10,
  },
  filterLabel: {
    marginRight: 8,
  },
  menuAnchor: {
    flex: 1,
    position: 'relative',
    width:'auto'
  },
  menuContent: {
    width: '100%',
    left: 0,
    right: 0,
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
  tableContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    minHeight: '55%',
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
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
})

export default PendingReceipts 