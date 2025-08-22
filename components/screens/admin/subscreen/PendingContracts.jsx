import React, { useState, useCallback, useMemo } from 'react'
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

// Filter configuration
const FILTER_OPTIONS = [
  { label: 'Status', value: 'status' },
  { label: 'Drop-off Location', value: 'drop_off_location' },
  { label: 'Luggage Owner', value: 'luggage_owner' },
  { label: 'Corporation', value: 'corporation' },
  { label: 'Contract ID', value: 'id' },
]

const TABLE_COLUMNS = [
  { key: 'id', label: 'Contract ID', width: COLUMN_WIDTH },
  { key: 'luggage_owner', label: 'Luggage Owner', width: FULL_NAME_WIDTH },
  { key: 'corporation', label: 'Corporation', width: COLUMN_WIDTH },
  { key: 'drop_off_location', label: 'Address', width: COLUMN_WIDTH },
  { key: 'completion_date', label: 'Date Received', width: COLUMN_WIDTH },
  { key: 'status', label: 'Status', width: COLUMN_WIDTH },
  { key: 'amount_per_passenger', label: 'Amount', width: COLUMN_WIDTH },
  { key: 'remarks', label: 'Remarks', width: COLUMN_WIDTH },
  { key: 'created_at', label: 'Created At', width: COLUMN_WIDTH },
]

// Custom hook for filtering and sorting
const useFilteredTransactions = (transactions, filters, sortConfig) => {
  return useMemo(() => {
    let filtered = transactions.filter(transaction => {
      // Search filter
      if (filters.searchQuery && filters.searchColumn) {
        const searchValue = String(transaction[filters.searchColumn] || '').toLowerCase()
        const query = filters.searchQuery.toLowerCase()
        if (!searchValue.includes(query)) return false
      }
      
      // Corporation filter
      if (filters.selectedCorporation && transaction.corporation !== filters.selectedCorporation) {
        return false
      }
      
      return true
    })

    // Sorting
    if (sortConfig.column) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.column]
        const valB = b[sortConfig.column]

        // Handle date sorting
        if (['created_at', 'updated_at', 'completion_date'].includes(sortConfig.column)) {
          if (valA === 'N/A') return sortConfig.direction === 'ascending' ? -1 : 1
          if (valB === 'N/A') return sortConfig.direction === 'ascending' ? 1 : -1
          if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1
          if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1
          return 0
        }

        // Handle regular sorting
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [transactions, filters, sortConfig])
}

// Reusable Filter Menu Component
const FilterMenu = ({ 
  visible, 
  onDismiss, 
  anchor, 
  options, 
  selectedValue, 
  onSelect, 
  placeholder = 'Select Option' 
}) => {
  const { colors, fonts } = useTheme()
  
  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
      contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
    >
      {options.map(option => (
        <Menu.Item
          key={option.value}
          onPress={() => {
            onSelect(option.value)
            onDismiss()
          }}
          title={option.label}
          titleStyle={[
            {
              color: selectedValue === option.value ? colors.primary : colors.onSurface,
            },
            fonts.bodyLarge,
          ]}
          leadingIcon={selectedValue === option.value ? 'check' : undefined}
        />
      ))}
    </Menu>
  )
}

// Search and Filter Section Component
const SearchFilterSection = ({ 
  filters, 
  onFiltersChange, 
  filterOptions, 
  corporations 
}) => {
  const { colors, fonts } = useTheme()
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [corporationMenuVisible, setCorporationMenuVisible] = useState(false)

  const handleClearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      selectedCorporation: ''
    })
  }

  const hasActiveFilters = filters.searchQuery || filters.selectedCorporation

  return (
    <>
      {/* Search Section */}
      <Surface style={[styles.searchSurface, { backgroundColor: colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
          Search & Filter
        </Text>
        <Searchbar
          placeholder={`Search by ${filterOptions.find(opt => opt.value === filters.searchColumn)?.label}`}
          onChangeText={(query) => onFiltersChange({ searchQuery: query })}
          value={filters.searchQuery}
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
            <FilterMenu
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
                  {filterOptions.find(opt => opt.value === filters.searchColumn)?.label || 'Select Column'}
                </Button>
              }
              options={filterOptions}
              selectedValue={filters.searchColumn}
              onSelect={(value) => onFiltersChange({ searchColumn: value })}
            />
          </View>
          
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
              Corporation Filter
            </Text>
            <FilterMenu
              visible={corporationMenuVisible}
              onDismiss={() => setCorporationMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  icon="office-building"
                  onPress={() => setCorporationMenuVisible(true)}
                  style={[styles.filterButton, { borderColor: colors.outline }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                >
                  {filters.selectedCorporation || 'All Corporations'}
                </Button>
              }
              options={[
                { label: 'All Corporations', value: '' },
                ...corporations.map(corp => ({ label: corp.corporation_name, value: corp.corporation_name }))
              ]}
              selectedValue={filters.selectedCorporation}
              onSelect={(value) => onFiltersChange({ selectedCorporation: value })}
            />
          </View>
        </View>
        
        {hasActiveFilters && (
          <View style={styles.clearFiltersContainer}>
            <Button
              mode="text"
              icon="close"
              onPress={handleClearFilters}
              style={styles.clearFiltersButton}
              contentStyle={styles.buttonContent}
              labelStyle={[styles.buttonLabel, { color: colors.primary }]}
            >
              Clear Filters
            </Button>
          </View>
        )}
      </Surface>
    </>
  )
}

// Selection Section Component
const SelectionSection = ({ 
  selectedContracts, 
  selectAll, 
  onSelectAll, 
  onContractSelection, 
  paginatedTransactions, 
  onGenerateSummary 
}) => {
  const { colors, fonts } = useTheme()

  return (
    <Surface style={[styles.selectionSurface, { backgroundColor: colors.surface }]} elevation={1}>
      <View style={styles.selectionContainer}>
        <View style={styles.selectAllContainer}>
          <Checkbox
            status={selectAll ? 'checked' : 'unchecked'}
            onPress={onSelectAll}
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
        onPress={onGenerateSummary}
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
  )
}

const PendingContracts = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  // State management
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [corporations, setCorporations] = useState([])
  
  // Filter state
  const [filters, setFilters] = useState({
    searchQuery: '',
    searchColumn: 'status',
    selectedCorporation: ''
  })
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({
    column: 'created_at',
    direction: 'descending'
  })
  
  // Pagination state
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Selection state
  const [selectedContracts, setSelectedContracts] = useState(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Data fetching
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
          suffix,
          corporation:corporation_id (corporation_name)
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
        corporation: transaction.airline?.corporation?.corporation_name || 'N/A',
      }
    })

    setTransactions(formatted)
    setLoading(false)
  }

  const fetchCorporations = async () => {
    const { data, error } = await supabase
      .from('profiles_corporation')
      .select('corporation_name')
      .order('corporation_name', { ascending: true })

    if (error) {
      console.error('Error fetching corporations:', error)
      return
    }

    setCorporations(data || [])
  }

  // Effects
  useFocusEffect(
    useCallback(() => {
      fetchTransactions()
      fetchCorporations()
      resetSelection()
    }, [])
  )

  // Filtered and sorted transactions
  const filteredAndSortedTransactions = useFilteredTransactions(transactions, filters, sortConfig)

  // Pagination
  const from = page * itemsPerPage
  const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedTransactions.length)
  const paginatedTransactions = filteredAndSortedTransactions.slice(from, to)

  // Handlers
  const handleSort = (column) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'ascending' ? 'descending' : 'ascending'
    }))
  }

  const getSortIcon = (column) =>
    sortConfig.column === column ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchTransactions().finally(() => setRefreshing(false))
  }, [])

  const handleViewDetails = (transaction) => {
    navigation.navigate('ContractDetailsAdmin', { id: transaction.id })
  }

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

  const formatCurrency = (amount) => `₱${parseFloat(amount).toFixed(2)}`
  const formatPercentage = (amount) => `${parseFloat(amount).toFixed(2)}%`

  return (
    <ScrollView 
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {SnackbarElement}

      <View style={styles.container}>
        {/* Search and Filter Section */}
        <SearchFilterSection
          filters={filters}
          onFiltersChange={setFilters}
          filterOptions={FILTER_OPTIONS}
          corporations={corporations}
        />

        {/* Selection Section */}
        <SelectionSection
          selectedContracts={selectedContracts}
          selectAll={selectAll}
          onSelectAll={handleSelectAll}
          onContractSelection={handleContractSelection}
          paginatedTransactions={paginatedTransactions}
          onGenerateSummary={handleGenerateSummary}
        />

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
                    {TABLE_COLUMNS.map(({ key, label, width }) => (
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
                        {TABLE_COLUMNS.map(({ key, width }, idx) => (
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
  clearFiltersContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  clearFiltersButton: {
    paddingHorizontal: 0,
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


