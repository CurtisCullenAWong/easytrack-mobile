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
  Portal,
  Dialog,
} from 'react-native-paper'
import { supabase } from '../../../../lib/supabaseAdmin'
import useSnackbar from '../../../hooks/useSnackbar'
import { printPDF, sharePDF } from '../../../../utils/pdfUtils'

const COLUMN_WIDTH = 180

const CompletedReceipts = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('payment_id')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [actionsMenuVisible, setActionsMenuVisible] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false)
  const [transactionToUpdate, setTransactionToUpdate] = useState(null)

  const filterOptions = [
    { label: 'Invoice No.', value: 'payment_id' },
    { label: 'Status', value: 'status' },
    { label: 'Drop-off Location', value: 'drop_off_location' },
    { label: 'Luggage Owner', value: 'luggage_owner' },
    { label: 'Contract ID', value: 'id' },
  ]

  const columns = [
    { key: 'payment_id', label: 'Invoice No.', width: COLUMN_WIDTH },
    { key: 'payment_status', label: 'Payment Status', width: COLUMN_WIDTH },
    { key: 'created_at', label: 'Created At', width: COLUMN_WIDTH },
    { key: 'updated_at', label: 'Updated At', width: COLUMN_WIDTH },
    { key: 'due_date', label: 'Due Date', width: COLUMN_WIDTH },
    { key: 'total_charge', label: 'Total Charge', width: COLUMN_WIDTH },
  ]

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        payment_id,
        payment:payment_id (
          payment_status:payment_status_id (status_name, id),
          due_date,
          total_charge,
          created_at,
          updated_at,
          invoice_image
        ),
        id,
        contract_status:contract_status_id (status_name),
        delivery_charge,
        delivery_surcharge,
        delivery_discount,
        remarks,
        passenger_form,
        drop_off_location,
        delivery_address,
        delivered_at,
        cancelled_at,
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
        ),
        owner_first_name,
        owner_middle_initial,
        owner_last_name,
        owner_contact,
        luggage_description,
        luggage_weight,
        luggage_quantity,
        flight_number,
        case_number,
        passenger_id,
        proof_of_delivery
      `)
      .not('payment_id', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
      return
    }

    // Group by payment_id and format the data
    const groupedTransactions = data.reduce((acc, transaction) => {
      const paymentId = transaction.payment_id
      
      if (!acc[paymentId]) {
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

        const baseAmount = (transaction.delivery_charge || 0) + (transaction.delivery_surcharge || 0)
        const discountedAmount = baseAmount * (1 - ((transaction.delivery_discount || 0) / 100))

        // Build owner name from individual fields
        const ownerName = [
          transaction.owner_first_name,
          transaction.owner_middle_initial,
          transaction.owner_last_name
        ].filter(Boolean).join(' ') || 'N/A'

        // Create a base transaction object
        const baseTransaction = {
          key: paymentId,
          payment_id: paymentId,
          payment_status: transaction.payment?.payment_status?.status_name || 'N/A',
          payment_status_id: transaction.payment?.payment_status?.id || null,
          created_at: transaction.payment?.created_at 
            ? new Date(transaction.payment.created_at).toLocaleString()
            : 'N/A',
          updated_at: transaction.payment?.updated_at 
            ? new Date(transaction.payment.updated_at).toLocaleString()
            : 'N/A',
          due_date: transaction.payment?.due_date 
            ? new Date(transaction.payment.due_date).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })
            : 'N/A',
          total_charge: transaction.payment?.total_charge || 0,
          id: transaction.id,
          status: transaction.contract_status?.status_name || 'N/A',
          delivery_charge: transaction.delivery_charge || 0,
          delivery_surcharge: transaction.delivery_surcharge || 0,
          delivery_discount: transaction.delivery_discount || 0,
          remarks: transaction.remarks || 'N/A',
          passenger_form: transaction.passenger_form || null,
          invoice_image: transaction.payment?.invoice_image || null,
          drop_off_location: transaction.drop_off_location || transaction.delivery_address || 'N/A',
          completion_date: completionDate,
          airline: transaction.airline,
          delivery: transaction.delivery,
          amount_per_passenger: discountedAmount,
          luggage_owner: ownerName,
          luggage_description: transaction.luggage_description || 'N/A',
          luggage_weight: transaction.luggage_weight || 'N/A',
          luggage_quantity: transaction.luggage_quantity || 'N/A',
          flight_number: transaction.flight_number || 'N/A',
          case_number: transaction.case_number || 'N/A',
          owner_contact: transaction.owner_contact || 'N/A',
          passenger_id: transaction.passenger_id || 'N/A',
          proof_of_delivery: transaction.proof_of_delivery || null,
          contracts: [] // Array to store all contracts with this payment_id
        }

        acc[paymentId] = baseTransaction
      }

      // Add this contract's information to the payment group
      acc[paymentId].contracts.push({
        contract_id: transaction.id,
        luggage_owner: acc[paymentId].luggage_owner,
        flight_number: transaction.flight_number || 'N/A',
        luggage_quantity: transaction.luggage_quantity || 0,
        case_number: transaction.case_number || 'N/A',
        luggage_description: transaction.luggage_description || 'N/A',
        luggage_weight: transaction.luggage_weight || 0,
        owner_contact: transaction.owner_contact || 'N/A'
      })
      
      return acc
    }, {})

    setTransactions(Object.values(groupedTransactions))
    setLoading(false)
  }

  useFocusEffect(
    useCallback(() => {
      fetchTransactions()
    }, [])
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchTransactions().finally(() => setRefreshing(false))
  }, [])

  const handlePrint = async (transaction) => {
    try {
      const summary = {
        totalTransactions: transaction.contracts.length,
        totalAmount: transaction.amount_per_passenger,
        totalSurcharge: transaction.delivery_surcharge || 0,
        totalDiscount: transaction.delivery_discount || 0,
        statusCounts: { [transaction.status]: 1 }
      }
      await printPDF([transaction], summary, transaction.invoice_image)
    } catch (error) {
      console.error('Error printing PDF:', error)
      showSnackbar(`Failed to print PDF: ${error.message}`)
    }
  }

  const handleShare = async (transaction) => {
    try {
      const summary = {
        totalTransactions: transaction.contracts.length,
        totalAmount: transaction.amount_per_passenger,
        totalSurcharge: transaction.delivery_surcharge || 0,
        totalDiscount: transaction.delivery_discount || 0,
        statusCounts: { [transaction.status]: 1 }
      }
      await sharePDF([transaction], summary, transaction.invoice_image)
    } catch (error) {
      console.error('Error sharing PDF:', error)
      showSnackbar(`Failed to share PDF: ${error.message}`)
    }
  }

  const handleMarkAsPaid = async (transaction) => {
    try {
      const { error } = await supabase
        .from('payment')
        .update({ payment_status_id: 2, updated_at: new Date().toISOString() }) // Assuming 2 is the ID for "Paid" status
        .eq('id', transaction.payment_id)

      if (error) throw error

      showSnackbar('Payment status updated successfully', true)
      fetchTransactions() // Refresh the list
    } catch (error) {
      console.error('Error updating payment status:', error)
      showSnackbar(`Failed to update payment status: ${error.message}`)
    }
  }

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

      if (['created_at', 'updated_at', 'completion_date', 'due_date'].includes(sortColumn)) {
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

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2)}`
  }

  const formatPercentage = (amount) => {
    return `${parseFloat(amount).toFixed(2)}%`
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {SnackbarElement}

      <Portal>
        <Dialog
          visible={confirmDialogVisible}
          onDismiss={() => setConfirmDialogVisible(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.onSurface }}>
            Confirm Payment Status Update
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurface }}>
              Are you sure you want to mark this receipt as paid?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setConfirmDialogVisible(false)}
              textColor={colors.primary}
            >
              Cancel
            </Button>
            <Button
              onPress={() => {
                handleMarkAsPaid(transactionToUpdate)
                setConfirmDialogVisible(false)
                setTransactionToUpdate(null)
              }}
              textColor={colors.primary}
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
        <View style={[styles.menuAnchor, {width:'60%'}]}>
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

      {loading ? (
        <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyMedium]}>
          Loading transactions...
        </Text>
      ) : filteredAndSortedTransactions.length === 0 ? (
        <Text style={[styles.noDataText, { color: colors.onSurface }, fonts.bodyMedium]}>
          No transactions available
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

              {paginatedTransactions.map(transaction => (
                <DataTable.Row key={transaction.key}>
                  {columns.map(({ key, width }, idx) => (
                    <DataTable.Cell
                      key={idx}
                      style={{ width, justifyContent: 'center', paddingVertical: 12 }}
                    >
                      <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                        {['delivery_charge', 'delivery_surcharge', 'total_amount', 'amount_per_passenger', 'total_charge'].includes(key)
                          ? formatCurrency(transaction[key])
                          : key === 'delivery_discount'
                          ? formatPercentage(transaction[key])
                          : transaction[key]}
                      </Text>
                    </DataTable.Cell>
                  ))}
                  <DataTable.Cell numeric style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
                    <View style={styles.menuAnchor}>
                      <Menu
                        visible={actionsMenuVisible && selectedTransaction === transaction.id}
                        onDismiss={() => {
                          setActionsMenuVisible(false)
                          setSelectedTransaction(null)
                        }}
                        anchor={
                          <Button
                            mode="outlined"
                            icon="dots-vertical"
                            onPress={() => {
                              if (selectedTransaction === transaction.id) {
                                setActionsMenuVisible(false)
                                setSelectedTransaction(null)
                              } else {
                                setSelectedTransaction(transaction.id)
                                setActionsMenuVisible(true)
                              }
                            }}
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                          >
                            Actions
                          </Button>
                        }
                        contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
                      >
                        <Menu.Item
                          onPress={() => {
                            handlePrint(transaction)
                            setActionsMenuVisible(false)
                            setSelectedTransaction(null)
                          }}
                          title="Print"
                          leadingIcon="printer"
                          titleStyle={[{ color: colors.onSurface }, fonts.bodyLarge]}
                        />
                        <Menu.Item
                          onPress={() => {
                            handleShare(transaction)
                            setActionsMenuVisible(false)
                            setSelectedTransaction(null)
                          }}
                          title="Share"
                          leadingIcon="share"
                          titleStyle={[{ color: colors.onSurface }, fonts.bodyLarge]}
                        />
                        {transaction.payment_status_id === 1 && (
                          <Menu.Item
                            onPress={() => {
                              setTransactionToUpdate(transaction)
                              setConfirmDialogVisible(true)
                              setActionsMenuVisible(false)
                              setSelectedTransaction(null)
                            }}
                            title="Mark as Paid"
                            leadingIcon="check-circle"
                            titleStyle={[{ color: colors.onSurface }, fonts.bodyLarge]}
                          />
                        )}
                      </Menu>
                    </View>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
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
    width: 'auto',
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
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
  },
})

export default CompletedReceipts