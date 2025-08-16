import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { ScrollView, StyleSheet, View, RefreshControl, Image } from 'react-native'
import {
  Searchbar,
  Button,
  DataTable,
  Text,
  useTheme,
  Menu,
  Portal,
  Dialog,
  TextInput,
  Surface,
} from 'react-native-paper'
import { supabase } from '../../../../lib/supabaseAdmin'
import useSnackbar from '../../../hooks/useSnackbar'
import { printPDF, sharePDF } from '../../../../utils/pdfUtils'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'

const COLUMN_WIDTH = 180

const SummarizedContracts = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('summary_id')
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

  const [invoiceDialogVisible, setInvoiceDialogVisible] = useState(false)
  const [selectedSummaryId, setSelectedSummaryId] = useState(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceImage, setInvoiceImage] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [imageSourceDialogVisible, setImageSourceDialogVisible] = useState(false)

  const filterOptions = [
    { label: 'Summary ID', value: 'summary_id' },
    { label: 'Status', value: 'status' },
    { label: 'Drop-off Location', value: 'drop_off_location' },
    { label: 'Luggage Owner', value: 'luggage_owner' },
    { label: 'Contract ID', value: 'id' },
  ]

  const columns = [
    { key: 'summary_id', label: 'Summary ID', width: COLUMN_WIDTH },
    { key: 'summary_status', label: 'Summary Status', width: COLUMN_WIDTH },
    { key: 'created_at', label: 'Created At', width: COLUMN_WIDTH },
    { key: 'due_date', label: 'Due Date', width: COLUMN_WIDTH },
  ]

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        summary:summary_id (
          summary_status:summary_status_id (status_name, id),
          due_date,
          created_at
        ),
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
      .not('summary_id', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
      return
    }

    const groupedTransactions = data.reduce((acc, transaction) => {
      const summaryId = transaction.summary_id
      if (!acc[summaryId]) {
        let completionDate = 'N/A'
        if (transaction.delivered_at) {
          completionDate = new Date(transaction.delivered_at).toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
          })
        } else if (transaction.cancelled_at) {
          completionDate = new Date(transaction.cancelled_at).toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
          })
        }

        const ownerName = [
          transaction.owner_first_name,
          transaction.owner_middle_initial,
          transaction.owner_last_name
        ].filter(Boolean).join(' ') || 'N/A'

        acc[summaryId] = {
          key: summaryId,
          summary_id: summaryId,
          summary_status: transaction.summary?.summary_status?.status_name || 'N/A',
          summary_status_id: transaction.summary?.summary_status?.id || null,
          created_at: transaction.summary?.created_at ? new Date(transaction.summary.created_at).toLocaleString() : 'N/A',
          due_date: transaction.summary?.due_date ? new Date(transaction.summary.due_date).toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
          }) : 'N/A',
          id: transaction.id,
          status: transaction.contract_status?.status_name || 'N/A',
          delivery_charge: transaction.delivery_charge || 0,
          delivery_surcharge: transaction.delivery_surcharge || 0,
          delivery_discount: transaction.delivery_discount || 0,
          remarks: transaction.remarks || 'N/A',
          passenger_form: transaction.passenger_form || null,
          drop_off_location: transaction.drop_off_location || transaction.delivery_address || 'N/A',
          completion_date: completionDate,
          airline: transaction.airline,
          delivery: transaction.delivery,
          amount_per_passenger: (transaction.delivery_charge || 0) + (transaction.delivery_surcharge || 0) - (transaction.delivery_discount || 0),
          luggage_owner: ownerName,
          luggage_description: transaction.luggage_description || 'N/A',
          luggage_weight: transaction.luggage_weight || 'N/A',
          luggage_quantity: transaction.luggage_quantity || 'N/A',
          flight_number: transaction.flight_number || 'N/A',
          case_number: transaction.case_number || 'N/A',
          owner_contact: transaction.owner_contact || 'N/A',
          passenger_id: transaction.passenger_id || 'N/A',
          proof_of_delivery: transaction.proof_of_delivery || null,
          contracts: []
        }
      }

      acc[summaryId].contracts.push({
        contract_id: transaction.id,
        luggage_owner: acc[summaryId].luggage_owner,
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
      if (transaction.summary_status_id !== 2) {
        showSnackbar('Invoice not available yet. Please create the invoice first.')
        return
      }
      const summary = {
        totalTransactions: transaction.contracts.length,
        totalAmount: transaction.amount_per_passenger,
        totalSurcharge: transaction.delivery_surcharge || 0,
        totalDiscount: transaction.delivery_discount || 0,
        statusCounts: { [transaction.status]: 1 }
      }
      await printPDF([transaction], transaction.invoice_image)
    } catch (error) {
      console.error('Error printing PDF:', error)
      showSnackbar(`Failed to print PDF: ${error.message}`)
    }
  }

  const handleShare = async (transaction) => {
    try {
      if (transaction.summary_status_id !== 2) {
        showSnackbar('Invoice not available yet. Please create the invoice first.')
        return
      }
      const summary = {
        totalTransactions: transaction.contracts.length,
        totalAmount: transaction.amount_per_passenger,
        totalSurcharge: transaction.delivery_surcharge || 0,
        totalDiscount: transaction.delivery_discount || 0,
        statusCounts: { [transaction.status]: 1 }
      }
      await sharePDF([transaction], transaction.invoice_image)
    } catch (error) {
      console.error('Error sharing PDF:', error)
      showSnackbar(`Failed to share PDF: ${error.message}`)
    }
  }

  const handleMarkAsPaid = async (transaction) => {
    try {
      const { error } = await supabase
        .from('summary')
        .update({ summary_status_id: 2 })
        .eq('id', transaction.summary_id)

      if (error) throw error

      showSnackbar('Summary status updated successfully', true)
      fetchTransactions()
    } catch (error) {
      console.error('Error updating summary status:', error)
      showSnackbar(`Failed to update summary status: ${error.message}`)
    }
  }

  const handleCreateInvoice = async (transaction) => {
    navigation.navigate('CreateInvoice', { summary: { summary_id: transaction.summary_id } })
  }

  const handleInvoiceNumberChange = (text) => {
    const numbersOnly = text.replace(/[^0-9]/g, '')
    if (numbersOnly.length <= 4) setInvoiceNumber(numbersOnly)
  }

  const getFullInvoiceNumber = () => {
    const currentYear = new Date().getFullYear()
    return `${currentYear}${invoiceNumber}`
  }

  const handleImageSource = async (source) => {
    setImageSourceDialogVisible(false)
    try {
      const options = { mediaTypes: 'images', allowsEditing: true, quality: 1, aspect: [3, 4] }
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options)
      if (!result.canceled) setInvoiceImage(result.assets[0].uri)
    } catch (error) {
      console.error('Error picking image:', error)
      showSnackbar('Error picking image: ' + error.message)
    }
  }

  const uploadInvoiceImage = async () => {
    if (!invoiceImage?.startsWith('file://')) return null
    try {
      const bucket = 'invoices'
      const fileName = `${invoiceNumber}.png`
      const filePath = `/${fileName}`
      const { error: deleteError } = await supabase.storage.from(bucket).remove([filePath])
      if (deleteError && !deleteError.message.includes('not found')) {
        console.error('Error deleting existing file:', deleteError)
      }
      const base64 = await FileSystem.readAsStringAsync(invoiceImage, { encoding: FileSystem.EncodingType.Base64 })
      const contentType = 'image/png'
      const { error } = await supabase.storage.from(bucket).upload(filePath, decode(base64), { contentType, upsert: true })
      if (error) {
        showSnackbar('Error uploading image: ' + error.message)
        return null
      }
      const { data: { signedUrl }, error: signedUrlError } = await supabase.storage.from(bucket).createSignedUrl(filePath, 31536000)
      if (signedUrlError) throw signedUrlError
      return signedUrl
    } catch (error) {
      showSnackbar('Error uploading image: ' + error.message)
      return null
    }
  }

  const handleAssignPayment = async () => {
    try {
      if (!invoiceNumber.trim() || invoiceNumber.length !== 4) {
        showSnackbar('Please enter a 4-digit invoice number')
        return
      }
      if (!invoiceImage) {
        showSnackbar('Please upload an invoice image')
        return
      }
      setUploading(true)
      const invoiceImageUrl = await uploadInvoiceImage()
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, delivery_charge, delivery_surcharge, delivery_discount')
        .eq('summary_id', selectedSummaryId)
        .is('summary_id', null)
      if (contractsError) throw contractsError
      const { error: paymentError } = await supabase
        .from('payment')
        .insert({ id: getFullInvoiceNumber(), invoice_image: invoiceImageUrl })
        .select()
        .single()
      if (paymentError) throw paymentError
      const { error: contractError } = await supabase
        .from('contracts')
        .update({ summary_id: getFullInvoiceNumber() })
        .eq('summary_id', selectedSummaryId)
        .is('summary_id', null)
      if (contractError) throw contractError
      showSnackbar('Payment created successfully', true)
      setInvoiceNumber('')
      setInvoiceImage(null)
      setSelectedSummaryId(null)
      setInvoiceDialogVisible(false)
      fetchTransactions()
    } catch (error) {
      console.error('Error creating payment:', error)
      showSnackbar('Failed to create payment: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSort = (column) => {
    setSortDirection(prev => (sortColumn === column && prev === 'ascending' ? 'descending' : 'ascending'))
    setSortColumn(column)
  }
  const getSortIcon = (column) => (sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : '')

  const filteredAndSortedTransactions = transactions
    .filter(transaction => {
      if (!searchQuery) return true
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

  const formatCurrency = (amount) => `₱${parseFloat(amount).toFixed(2)}`
  const formatPercentage = (amount) => `${parseFloat(amount).toFixed(2)}%`

  return (
    <ScrollView 
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
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

        {/* Results Section */}
        <Surface style={[styles.resultsSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
              Summarized Transactions
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
                    <DataTable.Title style={[styles.actionColumn, { justifyContent: 'center' }]}>
                      <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>Actions</Text>
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
                        <DataTable.Cell style={[styles.actionColumn, { justifyContent: 'center' }]}>
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
                                handleCreateInvoice(transaction)
                                setActionsMenuVisible(false)
                                setSelectedTransaction(null)
                              }}
                              title="Create Invoice"
                              leadingIcon="file-document"
                              titleStyle={[{ color: colors.onSurface }, fonts.bodyLarge]}
                            />
                          </Menu>
                        </DataTable.Cell>
                        {columns.map(({ key, width }, idx) => (
                          <DataTable.Cell 
                            key={idx} 
                            style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                          >
                            <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]}>
                              {['delivery_charge', 'delivery_surcharge', 'total_amount', 'amount_per_passenger'].includes(key)
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
                    numberOfItemsPerPageList={[5, 10, 20, 50]}
                    numberOfItemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    selectPageDropdownLabel={'Rows per page'}
                    style={styles.pagination}
                    theme={{
                      colors: { onSurface: colors.onSurface, text: colors.onSurface, elevation: { level2: colors.surface } },
                      fonts: { bodyMedium: fonts.bodyMedium, labelMedium: fonts.labelMedium },
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
          visible={confirmDialogVisible}
          onDismiss={() => setConfirmDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: colors.surface }]}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>
            Confirm Summary Status Update
          </Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.dialogContent, { color: colors.onSurface }]}>
              Are you sure you want to mark this summary as completed?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDialogVisible(false)} textColor={colors.primary}>
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

      <Portal>
        <Dialog
          visible={invoiceDialogVisible}
          onDismiss={() => setInvoiceDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: colors.surface }]}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>
            Create Payment
          </Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.dialogContent, { color: colors.onSurfaceVariant, marginBottom: 16 }]}>
              Create payment for Summary ID: {selectedSummaryId}
            </Text>

            <TextInput
              label="Payment Number"
              value={invoiceNumber}
              onChangeText={handleInvoiceNumberChange}
              mode="outlined"
              style={styles.invoiceInput}
              placeholder="Enter 4 digits (e.g., 0001)"
              keyboardType="numeric"
              maxLength={4}
            />
            <Text style={[styles.invoicePreview, { color: colors.onSurfaceVariant }]}>
              Full Payment Number: {invoiceNumber ? getFullInvoiceNumber() : 'YYYYxxxx'}
            </Text>

            <Button mode="outlined" onPress={() => setImageSourceDialogVisible(true)} style={styles.uploadButton} icon="camera">
              {invoiceImage ? 'Change Payment Image' : 'Upload Payment Image'}
            </Button>

            {invoiceImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: invoiceImage }} style={styles.imagePreview} resizeMode="contain" />
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInvoiceDialogVisible(false)} textColor={colors.primary}>
              Cancel
            </Button>
            <Button onPress={handleAssignPayment} textColor={colors.primary} disabled={!invoiceNumber.trim() || !invoiceImage || uploading} loading={uploading}>
              Create Payment
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={imageSourceDialogVisible}
          onDismiss={() => setImageSourceDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: colors.surface }]}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>Choose Image Source</Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.dialogContent, { color: colors.onSurfaceVariant }]}>Select where you want to get the image from</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => handleImageSource('camera')} textColor={colors.primary}>Camera</Button>
            <Button onPress={() => handleImageSource('gallery')} textColor={colors.primary}>Gallery</Button>
            <Button onPress={() => setImageSourceDialogVisible(false)} textColor={colors.error}>Cancel</Button>
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
  invoiceInput: {
    marginBottom: 16,
  },
  uploadButton: {
    marginBottom: 16,
  },
  imagePreviewContainer: {
    marginVertical: 8,
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
    aspectRatio: 3/4,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  invoicePreview: {
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
  },
})

export default SummarizedContracts


