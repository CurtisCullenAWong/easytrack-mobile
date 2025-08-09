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
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {SnackbarElement}

      <Portal>
        <Dialog
          visible={confirmDialogVisible}
          onDismiss={() => setConfirmDialogVisible(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.onSurface }}>
            Confirm Summary Status Update
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurface }}>
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
        <View style={[styles.menuAnchor, { width: '60%' }]}>
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
                  { color: searchColumn === option.value ? colors.primary : colors.onSurface },
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
                <DataTable.Title style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 12 }}>
                  <Text style={[styles.headerText, { color: colors.onSurface }]}>Actions</Text>
                </DataTable.Title>
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
              </DataTable.Header>

              {paginatedTransactions.map(transaction => (
                <DataTable.Row key={transaction.key}>
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
                            handleCreateInvoice(transaction)
                            setActionsMenuVisible(false)
                            setSelectedTransaction(null)
                          }}
                          title="Create Invoice"
                          leadingIcon="file-document"
                          titleStyle={[{ color: colors.onSurface }, fonts.bodyLarge]}
                        />
                      </Menu>
                    </View>
                  </DataTable.Cell>
                  {columns.map(({ key, width }, idx) => (
                    <DataTable.Cell key={idx} style={{ width, justifyContent: 'center', paddingVertical: 12 }}>
                      <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>
                        {['delivery_charge', 'delivery_surcharge', 'total_amount', 'amount_per_passenger'].includes(key)
                          ? formatCurrency(transaction[key])
                          : key === 'delivery_discount'
                          ? formatPercentage(transaction[key])
                          : transaction[key]}
                      </Text>
                    </DataTable.Cell>
                  ))}
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
                colors: { onSurface: colors.onSurface, text: colors.onSurface, elevation: { level2: colors.surface } },
                fonts: { bodyMedium: fonts.bodyMedium, labelMedium: fonts.labelMedium },
              }}
            />
          </View>
        </View>
      )}

      <Portal>
        <Dialog
          visible={invoiceDialogVisible}
          onDismiss={() => setInvoiceDialogVisible(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.onSurface }}>
            Create Payment
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>
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
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.onSurface }}>Choose Image Source</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant }}>Select where you want to get the image from</Text>
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
  searchActionsRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, gap: 10 },
  searchbar: { flex: 1 },
  buttonContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, gap: 10 },
  filterLabel: { marginRight: 8 },
  menuAnchor: { flex: 1, position: 'relative', width: 'auto' },
  menuContent: { width: '100%', left: 0, right: 0 },
  button: { marginVertical: 10, height: 48, borderRadius: 8 },
  buttonContent: { height: 48 },
  buttonLabel: { fontSize: 16, fontWeight: 'bold' },
  tableContainer: { flex: 1, marginHorizontal: 16, marginBottom: 16, borderRadius: 8, minHeight: '55%', overflow: 'hidden' },
  table: { flex: 1 },
  sortableHeader: { flexDirection: 'row', alignItems: 'center' },
  sortIcon: { marginLeft: 4 },
  actionButton: { borderRadius: 8, minWidth: 50 },
  noDataCell: { justifyContent: 'center', alignItems: 'center', paddingVertical: 16, flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 20 },
  paginationContainer: { borderTopWidth: 1, borderTopColor: 'rgba(0, 0, 0, 0.12)' },
  pagination: { justifyContent: 'space-evenly', borderTopWidth: 1, borderTopColor: 'rgba(0, 0, 0, 0.12)' },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.12)' },
  headerText: { fontSize: 14, fontWeight: 'bold' },
  noDataText: { textAlign: 'center', marginTop: 20 },
  invoiceInput: { marginBottom: 16 },
  uploadButton: { marginBottom: 16 },
  imagePreviewContainer: { marginVertical: 8, position: 'relative', alignSelf: 'center', width: '100%', aspectRatio: 3/4, backgroundColor: '#f0f0f0', borderRadius: 8, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', borderRadius: 8 },
  invoicePreview: { fontSize: 14, marginTop: -12, marginBottom: 16, marginLeft: 4 },
})

export default SummarizedContracts


