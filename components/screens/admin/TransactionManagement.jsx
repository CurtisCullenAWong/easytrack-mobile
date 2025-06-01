import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ScrollView, StyleSheet, View, RefreshControl, Alert } from 'react-native'
import {
  Searchbar,
  Button,
  DataTable,
  Text,
  useTheme,
  Menu,
  Dialog,
  Portal,
  TextInput,
  Checkbox,
} from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabaseAdmin'
import { printPDF, sharePDF } from '../../../utils/pdfUtils'
import useSnackbar from '../../../components/hooks/useSnackbar'

const COLUMN_WIDTH = 180
const FULL_NAME_WIDTH = 200

const TransactionManagement = ({ navigation }) => {
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
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showSurchargeDialog, setShowSurchargeDialog] = useState(false)
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [surchargeAmount, setSurchargeAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [actionMenuVisible, setActionMenuVisible] = useState(false)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [summaryData, setSummaryData] = useState(null)

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
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
        ),
        luggage_info:contract_luggage_information (
          luggage_owner,
          quantity,
          case_number,
          item_description,
          weight,
          contact_number,
          flight_number
        )
      `)
      .in('contract_status_id', [5, 6]) // 5 for delivered, 6 for failed
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
      return
    }

    // Expand luggage_info into separate rows
    const formatted = data.flatMap(transaction => {
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

      // If no luggage info, return one row with N/A
      if (!transaction.luggage_info || transaction.luggage_info.length === 0) {
        const baseAmount = (transaction.delivery_charge || 0) + (transaction.surcharge || 0)
        const discountedAmount = baseAmount * (1 - ((transaction.discount || 0) / 100))
        return [{
          key: `${transaction.id}_0`,
          id: transaction.id,
          status: transaction.contract_status?.status_name || 'N/A',
          drop_off_location: transaction.drop_off_location || 'N/A',
          completion_date: completionDate,
          delivery_charge: transaction.delivery_charge || 0,
          surcharge: transaction.surcharge || 0,
          discount: transaction.discount || 0,
          luggage_owner: 'N/A',
          amount_per_passenger: discountedAmount,
          remarks: transaction.remarks || 'N/A',
          flight_number: 'N/A',
          created_at: transaction.created_at
            ? new Date(transaction.created_at).toLocaleString()
            : 'N/A',
        }]
      }

      // Return one row per luggage owner
      return transaction.luggage_info.map((luggage, index) => {
        const baseAmount = (transaction.delivery_charge || 0) + (transaction.surcharge || 0)
        const discountedAmount = baseAmount * (1 - ((transaction.discount || 0) / 100))
        const perPassengerAmount = discountedAmount / transaction.luggage_info.length
        return {
          key: `${transaction.id}_${index}`,
          id: transaction.id,
          status: transaction.contract_status?.status_name || 'N/A',
          drop_off_location: transaction.drop_off_location || 'N/A',
          completion_date: completionDate,
          delivery_charge: transaction.delivery_charge || 0,
          surcharge: transaction.surcharge || 0,
          discount: transaction.discount || 0,
          luggage_owner: luggage.luggage_owner || 'N/A',
          amount_per_passenger: perPassengerAmount * transaction.luggage_info.length,
          remarks: transaction.remarks || ' ',
          flight_number: luggage.flight_number || 'N/A',
          created_at: transaction.created_at
            ? new Date(transaction.created_at).toLocaleString()
            : 'N/A',
        }
      })
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
      const searchValue = String(transaction[searchColumn] || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      return searchValue.includes(query)
    })
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]

      if (['created_at', 'updated_at'].includes(sortColumn)) {
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
    { label: 'Airline Name', value: 'airline_name' },
    { label: 'Delivery Name', value: 'delivery_name' },
  ]

  const columns = [
    { key: 'select', label: '', width: 50 },
    { key: 'id', label: 'Contract ID', width: COLUMN_WIDTH },
    { key: 'luggage_owner', label: 'Luggage Owner', width: COLUMN_WIDTH },
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

  const handleAddSurcharge = async () => {
    try {
      const { error } = await supabase
        .from('contract')
        .update({ surcharge: parseFloat(surchargeAmount) })
        .eq('id', selectedTransaction.id)

      if (error) throw error

      setShowSurchargeDialog(false)
      setSurchargeAmount('')
      fetchTransactions()
    } catch (error) {
      console.error('Error adding surcharge:', error)
    }
  }

  const handleAddDiscount = async () => {
    try {
      const { error } = await supabase
        .from('contract')
        .update({ discount: parseFloat(discountAmount) })
        .eq('id', selectedTransaction.id)

      if (error) throw error

      setShowDiscountDialog(false)
      setDiscountAmount('')
      fetchTransactions()
    } catch (error) {
      console.error('Error adding discount:', error)
    }
  }

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2)}`
  }

  const formatPercentage = (amount) => {
    return `${parseFloat(amount).toFixed(2)}%`
  }

  const handleGenerateAllSummary = async () => {
    try {
      const summary = generateSummary(filteredAndSortedTransactions)
      setSummaryData(summary)
      setShowSummaryDialog(true)
    } catch (error) {
      console.error('Error generating all summary:', error)
      showSnackbar(`Failed to generate summary: ${error.message}`)
    }
  }

  const generateSummary = (transactions) => {
    const summary = {
      totalTransactions: transactions.length,
      totalAmount: 0,
      totalSurcharge: 0,
      totalDiscount: 0,
      statusCounts: {}
    }

    transactions.forEach(transaction => {
      // Calculate base amount (delivery charge + surcharge)
      const baseAmount = (transaction.delivery_charge || 0) + (transaction.surcharge || 0)
      
      // Calculate discount amount
      const discountAmount = baseAmount * ((transaction.discount || 0) / 100)
      
      // Calculate final amount after discount
      const finalAmount = baseAmount - discountAmount
      
      // Add to totals
      summary.totalAmount += finalAmount
      summary.totalSurcharge += transaction.surcharge || 0
      summary.totalDiscount += discountAmount

      // Count statuses
      const status = transaction.status
      summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1
    })

    return summary
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Header navigation={navigation} title="Transaction Management" />
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
      <View style={styles.summaryButtonsContainer}>
        <Button
          mode="contained"
          icon="file-document-outline"
          onPress={handleGenerateAllSummary}
          style={[styles.button]}
          contentStyle={styles.buttonContent}
          labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
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
                {columns.slice(1).map(({ key, label, width }) => (
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
                    {columns.slice(1).map(({ key, width }, idx) => (
                      <DataTable.Cell
                        key={idx}
                        style={{ width, justifyContent: 'center', paddingVertical: 12 }}
                      >
                        <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                          {['delivery_charge', 'surcharge', 'total_amount'].includes(key)
                            ? formatCurrency(transaction[key])
                            : key === 'discount'
                            ? formatPercentage(transaction[key])
                            : transaction[key]}
                        </Text>
                      </DataTable.Cell>
                    ))}
                    <DataTable.Cell numeric style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
                      <Menu
                        visible={actionMenuVisible && selectedTransaction?.id === transaction.id}
                        onDismiss={() => setActionMenuVisible(false)}
                        anchor={
                          <Button
                            mode="outlined"
                            icon="dots-vertical"
                            onPress={(e) => {
                              setSelectedTransaction(transaction)
                              setActionMenuVisible(true)
                            }}
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
                            setActionMenuVisible(false)
                            handleViewDetails(transaction)
                          }}
                          title="View Details"
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
                            setActionMenuVisible(false)
                            setShowSurchargeDialog(true)
                          }}
                          title="Adjust Surcharge"
                          leadingIcon="plus"
                          titleStyle={[
                            {
                              color: colors.onSurface,
                            },
                            fonts.bodyLarge,
                          ]}
                        />
                        <Menu.Item
                          onPress={() => {
                            setActionMenuVisible(false)
                            setShowDiscountDialog(true)
                          }}
                          title="Adjust Discount"
                          leadingIcon="minus"
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

          <Portal>
            <Dialog
              visible={showSurchargeDialog}
              onDismiss={() => setShowSurchargeDialog(false)}
              style={[styles.dialog, { backgroundColor: colors.surface }]}
            >
              <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>Adjust Surcharge</Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                <TextInput
                  label="Surcharge Amount"
                  value={surchargeAmount}
                  onChangeText={setSurchargeAmount}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.dialogInput}
                  right={<TextInput.Affix text="₱" />}
                />
              </Dialog.Content>
              <Dialog.Actions style={styles.dialogActions}>
                <Button onPress={() => setShowSurchargeDialog(false)}>Cancel</Button>
                <Button onPress={handleAddSurcharge}>Adjust</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>

          <Portal>
            <Dialog
              visible={showDiscountDialog}
              onDismiss={() => setShowDiscountDialog(false)}
              style={[styles.dialog, { backgroundColor: colors.surface }]}
            >
              <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>Adjust Discount</Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                <TextInput
                  label="Discount Percentage"
                  value={discountAmount}
                  onChangeText={(text) => {
                    // Only allow numbers and decimal point
                    const filtered = text.replace(/[^0-9.]/g, '')
                    // Ensure only one decimal point
                    const parts = filtered.split('.')
                    if (parts.length > 2) {
                      setDiscountAmount(parts[0] + '.' + parts.slice(1).join(''))
                    } else {
                      setDiscountAmount(filtered)
                    }
                  }}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.dialogInput}
                  right={<TextInput.Affix text="%" />}
                />
                <Text style={[styles.dialogHelperText, { color: colors.onSurfaceVariant }]}>
                  Enter a percentage between 0 and 100
                </Text>
              </Dialog.Content>
              <Dialog.Actions style={styles.dialogActions}>
                <Button onPress={() => setShowDiscountDialog(false)}>Cancel</Button>
                <Button 
                  onPress={() => {
                    const percentage = parseFloat(discountAmount)
                    if (percentage >= 0 && percentage <= 100) {
                      handleAddDiscount()
                    }
                  }}
                  disabled={!discountAmount || parseFloat(discountAmount) < 0 || parseFloat(discountAmount) > 100}
                >
                  Adjust
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>

          <Portal>
            <Dialog
              visible={showSummaryDialog}
              onDismiss={() => {
                setShowSummaryDialog(false)
              }}
              style={[styles.dialog, { backgroundColor: colors.surface }]}
            >
              <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>Transaction Summary</Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                {summaryData && (
                  <View style={styles.summaryContent}>
                    <Text style={[styles.summaryText, { color: colors.onSurface }]}>
                      Total Transactions: {summaryData.totalTransactions}
                    </Text>
                    <Text style={[styles.summaryText, { color: colors.onSurface }]}>
                      Total Amount: {formatCurrency(summaryData.totalAmount)}
                    </Text>
                    <Text style={[styles.summaryText, { color: colors.onSurface }]}>
                      Total Surcharge: {formatCurrency(summaryData.totalSurcharge)}
                    </Text>
                    <Text style={[styles.summaryText, { color: colors.onSurface }]}>
                      Total Discount: {formatCurrency(summaryData.totalDiscount)}
                    </Text>
                    <Text style={[styles.summaryText, { color: colors.onSurface, marginTop: 16 }]}>
                      Status Breakdown:
                    </Text>
                    {Object.entries(summaryData.statusCounts).map(([status, count]) => (
                      <Text key={status} style={[styles.summaryText, { color: colors.onSurface, marginLeft: 16 }]}>
                        {status}: {count}
                      </Text>
                    ))}
                  </View>
                )}
              </Dialog.Content>
              <Dialog.Actions style={styles.summaryDialogActions}>
                <View style={styles.pdfButtonsContainer}>
                  <Button
                    icon="printer"
                    onPress={async () => {
                      try {
                        await printPDF(filteredAndSortedTransactions, summaryData)
                      } catch (error) {
                        Alert.alert('Error', error.message)
                      }
                    }}
                    style={styles.pdfButton}
                  >
                    Print
                  </Button>
                  <Button
                    icon="share"
                    onPress={async () => {
                      try {
                        await sharePDF(filteredAndSortedTransactions, summaryData)
                      } catch (error) {
                        Alert.alert('Error', error.message)
                      }
                    }}
                    style={styles.pdfButton}
                  >
                    Share/View
                  </Button>
                </View>
                <Button 
                  onPress={() => {
                    setShowSummaryDialog(false)
                  }}
                  style={styles.closeButton}
                >
                  Close
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
    gap:8,
  },
  buttonContainer1: {
    marginHorizontal:'auto'
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
  dialogInput: {
    marginBottom: 8,
  },
  dialogHelperText: {
    fontSize: 12,
    marginTop: 4,
  },
  dialogActions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  summaryDialogActions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'column',
    gap: 16,
  },
  pdfButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  pdfButton: {
    minWidth: 120,
  },
  closeButton: {
    alignSelf: 'center',
  },
  summaryContent: {
    gap: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
  },
  selectAllCell: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkboxContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center'
  },
})

export default TransactionManagement 