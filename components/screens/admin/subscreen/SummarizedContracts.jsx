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
  Surface,
  Chip,
} from 'react-native-paper'
import { supabase } from '../../../../lib/supabaseAdmin'
import useSnackbar from '../../../hooks/useSnackbar'

const COLUMN_WIDTH = 180

const SummarizedContracts = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('summary_id')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [refreshing, setRefreshing] = useState(false)
  const [actionMenuFor, setActionMenuFor] = useState(null)
  
  // Date filtering states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateFilterType, setDateFilterType] = useState('created_at')
  const [dateFilterMenuVisible, setDateFilterMenuVisible] = useState(false)

  const filterOptions = [
    { label: 'Summary ID', value: 'summary_id' },
    { label: 'Invoice ID', value: 'invoice_id' },
    { label: 'Summary Status', value: 'summary_status' },
    { label: 'Total Amount', value: 'total' },
  ]

  const dateFilterOptions = [
    { label: 'Created Date', value: 'created_at' },
    { label: 'Due Date', value: 'due_date' },
  ]

  const columns = [
    { key: 'summary_id', label: 'Summary ID', width: COLUMN_WIDTH },
    { key: 'invoice_id', label: 'Invoice ID', width: COLUMN_WIDTH },
    { key: 'summary_status', label: 'Summary Status', width: COLUMN_WIDTH },
    { key: 'total', label: 'Total', width: COLUMN_WIDTH },
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
          created_at,
          invoice_id
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
        const ownerName = [
          transaction.owner_first_name,
          transaction.owner_middle_initial,
          transaction.owner_last_name
        ].filter(Boolean).join(' ') || 'N/A'

        acc[summaryId] = {
          key: summaryId,
          summary_id: summaryId,
          invoice_id: transaction.summary?.invoice_id || 'N/A',
          summary_status: transaction.summary?.summary_status?.status_name || 'N/A',
          summary_status_id: transaction.summary?.summary_status?.id ?? null,
          created_at: transaction.summary?.created_at ? new Date(transaction.summary.created_at).toLocaleString() : 'N/A',
          due_date: transaction.summary?.due_date ? new Date(transaction.summary.due_date).toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
          }) : 'N/A',
          // Store raw dates for filtering
          created_at_raw: transaction.summary?.created_at ? new Date(transaction.summary.created_at) : null,
          due_date_raw: transaction.summary?.due_date ? new Date(transaction.summary.due_date) : null,
          total: 0
        }
      }

      // Add to total for this summary
      acc[summaryId].total += (transaction.delivery_charge || 0) + (transaction.delivery_surcharge || 0) - (transaction.delivery_discount || 0)

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

  const toggleSummaryCompletion = async (summaryId, isCurrentlyCompleted) => {
    try {
      // Guard: prevent marking/unmarking complete without an assigned invoice
      const target = transactions.find(t => t.summary_id === summaryId)
      if (!target || !target.invoice_id || target.invoice_id === 'N/A') {
        showSnackbar('Cannot change completion: missing Invoice ID')
        return
      }

      const newStatusId = isCurrentlyCompleted ? 1 : 2
      const { error } = await supabase
        .from('summary')
        .update({ summary_status_id: newStatusId })
        .eq('id', summaryId)

      if (error) throw error

      showSnackbar(isCurrentlyCompleted ? 'Summary unmarked as complete' : 'Summary marked as complete', true)
      await fetchTransactions()
    } catch (err) {
      console.error('Error updating summary status:', err)
      showSnackbar('Failed to update summary status')
    }
  }

  const handleSort = (column) => {
    setSortDirection(prev => (sortColumn === column && prev === 'ascending' ? 'descending' : 'ascending'))
    setSortColumn(column)
  }
  
  const getSortIcon = (column) => (sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : '')

  // Enhanced filtering function with date filtering
  const filteredAndSortedTransactions = transactions
    .filter(transaction => {
      // Text search filtering
      if (searchQuery) {
        const searchValue = String(transaction[searchColumn] || '').toLowerCase()
        const query = searchQuery.toLowerCase()
        if (!searchValue.includes(query)) {
          return false
        }
      }

      // Date filtering
      if (startDate || endDate) {
        const dateField = dateFilterType === 'created_at' ? 'created_at_raw' : 'due_date_raw'
        const transactionDate = transaction[dateField]
        
        if (!transactionDate) {
          return false // Exclude items without dates when date filter is active
        }

        if (startDate) {
          const startDateTime = new Date(startDate)
          if (transactionDate < startDateTime) {
            return false
          }
        }

        if (endDate) {
          const endDateTime = new Date(endDate)
          endDateTime.setHours(23, 59, 59, 999) // Set to end of day
          if (transactionDate > endDateTime) {
            return false
          }
        }
      }

      return true
    })
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]
      
      // Handle date sorting using raw dates
      if (sortColumn === 'created_at') {
        const dateA = a.created_at_raw
        const dateB = b.created_at_raw
        if (!dateA && !dateB) return 0
        if (!dateA) return sortDirection === 'ascending' ? -1 : 1
        if (!dateB) return sortDirection === 'ascending' ? 1 : -1
        if (dateA < dateB) return sortDirection === 'ascending' ? -1 : 1
        if (dateA > dateB) return sortDirection === 'ascending' ? 1 : -1
        return 0
      }
      
      if (sortColumn === 'due_date') {
        const dateA = a.due_date_raw
        const dateB = b.due_date_raw
        if (!dateA && !dateB) return 0
        if (!dateA) return sortDirection === 'ascending' ? -1 : 1
        if (!dateB) return sortDirection === 'ascending' ? 1 : -1
        if (dateA < dateB) return sortDirection === 'ascending' ? -1 : 1
        if (dateA > dateB) return sortDirection === 'ascending' ? 1 : -1
        return 0
      }

      // Handle numeric sorting for total
      if (sortColumn === 'total') {
        const numA = parseFloat(valA) || 0
        const numB = parseFloat(valB) || 0
        if (numA < numB) return sortDirection === 'ascending' ? -1 : 1
        if (numA > numB) return sortDirection === 'ascending' ? 1 : -1
        return 0
      }

      // Default string sorting
      if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
      if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
      return 0
    })

  const from = page * itemsPerPage
  const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedTransactions.length)
  const paginatedTransactions = filteredAndSortedTransactions.slice(from, to)

  const formatCurrency = (amount) => `₱${parseFloat(amount).toFixed(2)}`

  const clearDateFilters = () => {
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = searchQuery || startDate || endDate

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

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
                Date Filter Type
              </Text>
              <Menu
                visible={dateFilterMenuVisible}
                onDismiss={() => setDateFilterMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    icon="calendar"
                    onPress={() => setDateFilterMenuVisible(true)}
                    style={[styles.filterButton, { borderColor: colors.outline }]}
                    contentStyle={styles.buttonContent}
                    labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                  >
                    {dateFilterOptions.find(opt => opt.value === dateFilterType)?.label || 'Select Date Type'}
                  </Button>
                }
                contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
              >
                {dateFilterOptions.map(option => (
                  <Menu.Item
                    key={option.value}
                    onPress={() => {
                      setDateFilterType(option.value)
                      setDateFilterMenuVisible(false)
                    }}
                    title={option.label}
                    titleStyle={[
                      {
                        color: dateFilterType === option.value
                          ? colors.primary
                          : colors.onSurface,
                      },
                      fonts.bodyLarge,
                    ]}
                    leadingIcon={dateFilterType === option.value ? 'check' : undefined}
                  />
                ))}
              </Menu>
            </View>
          </View>

          {/* Date Range Filters */}
          <View style={styles.dateFiltersRow}>
            <View style={styles.dateFilterGroup}>
              <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
                Start Date
              </Text>
              <Searchbar
                placeholder="YYYY-MM-DD"
                onChangeText={setStartDate}
                value={startDate}
                style={[styles.dateInput, { backgroundColor: colors.surfaceVariant }]}
                iconColor={colors.onSurfaceVariant}
                inputStyle={[styles.dateInputText, { color: colors.onSurfaceVariant }]}
              />
            </View>
            <View style={styles.dateFilterGroup}>
              <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
                End Date
              </Text>
              <Searchbar
                placeholder="YYYY-MM-DD"
                onChangeText={setEndDate}
                value={endDate}
                style={[styles.dateInput, { backgroundColor: colors.surfaceVariant }]}
                iconColor={colors.onSurfaceVariant}
                inputStyle={[styles.dateInputText, { color: colors.onSurfaceVariant }]}
              />
            </View>
          </View>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <View style={styles.activeFiltersContainer}>
              <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
                Active Filters:
              </Text>
              <View style={styles.activeFiltersChips}>
                {searchQuery && (
                  <Chip
                    mode="outlined"
                    onClose={() => setSearchQuery('')}
                    style={[styles.filterChip, { borderColor: colors.outline }]}
                    textStyle={[styles.chipText, { color: colors.onSurface }]}
                  >
                    {filterOptions.find(opt => opt.value === searchColumn)?.label}: {searchQuery}
                  </Chip>
                )}
                {startDate && (
                  <Chip
                    mode="outlined"
                    onClose={() => setStartDate('')}
                    style={[styles.filterChip, { borderColor: colors.outline }]}
                    textStyle={[styles.chipText, { color: colors.onSurface }]}
                  >
                    From: {startDate}
                  </Chip>
                )}
                {endDate && (
                  <Chip
                    mode="outlined"
                    onClose={() => setEndDate('')}
                    style={[styles.filterChip, { borderColor: colors.outline }]}
                    textStyle={[styles.chipText, { color: colors.onSurface }]}
                  >
                    To: {endDate}
                  </Chip>
                )}
                <Button
                  mode="text"
                  onPress={clearDateFilters}
                  style={styles.clearFiltersButton}
                  labelStyle={[styles.clearFiltersText, { color: colors.primary }]}
                >
                  Clear All
                </Button>
              </View>
            </View>
          )}
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
                            visible={actionMenuFor === transaction.summary_id}
                            onDismiss={() => setActionMenuFor(null)}
                            anchor={
                              <Button
                                mode="outlined"
                                icon="dots-vertical"
                                onPress={() => setActionMenuFor(transaction.summary_id)}
                                style={[styles.actionButton, { borderColor: colors.outline }]}
                                contentStyle={styles.buttonContent}
                                labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                              >
                                Actions
                              </Button>
                            }
                            contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
                          >
                            <Menu.Item
                              onPress={() => {
                                setActionMenuFor(null)
                                navigation.navigate('CreateInvoice', { summary: { summary_id: transaction.summary_id } })
                              }}
                              title="View Invoice"
                              leadingIcon="file-document"
                              titleStyle={[{ color: colors.onSurface }, fonts.bodyLarge]}
                            />
                            <Menu.Item
                              onPress={() => {
                                setActionMenuFor(null)
                                if (transaction.invoice_id && transaction.invoice_id !== 'N/A') {
                                  toggleSummaryCompletion(transaction.summary_id, transaction.summary_status_id === 2)
                                } else {
                                  showSnackbar('Assign an Invoice ID before marking complete')
                                }
                              }}
                              title={transaction.summary_status_id === 2 ? 'Un-mark as Complete' : 'Complete'}
                              leadingIcon={transaction.summary_status_id === 2 ? 'undo' : 'check'}
                              titleStyle={[
                                {
                                  color:
                                    !transaction.invoice_id || transaction.invoice_id === 'N/A'
                                      ? colors.onSurfaceDisabled
                                      : transaction.summary_status_id === 2
                                      ? colors.error
                                      : colors.primary,
                                },
                                fonts.bodyLarge,
                              ]}
                              disabled={!transaction.invoice_id || transaction.invoice_id === 'N/A'}
                            />
                          </Menu>
                        </DataTable.Cell>
                        {columns.map(({ key, width }, idx) => (
                          <DataTable.Cell 
                            key={idx} 
                            style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                          >
                            <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]} selectable>
                              {key === 'total' ? formatCurrency(transaction[key]) : transaction[key]}
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
    marginBottom: 16,
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
  dateFiltersRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dateFilterGroup: {
    flex: 1,
  },
  dateInput: {
    borderRadius: 8,
  },
  dateInputText: {
    fontSize: 16,
  },
  activeFiltersContainer: {
    marginTop: 8,
  },
  activeFiltersChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
  },
  clearFiltersButton: {
    marginLeft: 8,
  },
  clearFiltersText: {
    fontSize: 12,
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
})

export default SummarizedContracts