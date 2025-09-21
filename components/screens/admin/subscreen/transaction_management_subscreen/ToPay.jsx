import React, { useState, useCallback, useMemo, useRef } from 'react'
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
import { supabase } from '../../../../../lib/supabaseAdmin'
import useSnackbar from '../../../../hooks/useSnackbar'

const COLUMN_WIDTH = 180
const FULL_NAME_WIDTH = 200

const FILTER_OPTIONS = [
  { label: 'Status', value: 'status' },
  { label: 'Drop-off Location', value: 'drop_off_location' },
  { label: 'Luggage Owner', value: 'luggage_owner' },
  { label: 'Corporation', value: 'corporation' },
  { label: 'Contract ID', value: 'id' },
  { label: 'Summary ID', value: 'summary_id' },
]

const INVOICE_FILTER_OPTIONS = [
  { label: 'All Bookings', value: 'all' },
  { label: 'With Invoice', value: 'with_invoice' },
  { label: 'Without Invoice', value: 'without_invoice' },
]

const TABLE_COLUMNS = [
  { key: 'id', label: 'Contract ID', width: COLUMN_WIDTH },
  { key: 'summary_id', label: 'Summary ID', width: COLUMN_WIDTH },
  { key: 'luggage_owner', label: 'Luggage Owner', width: FULL_NAME_WIDTH },
  { key: 'corporation', label: 'Corporation', width: COLUMN_WIDTH },
  { key: 'drop_off_location', label: 'Address', width: COLUMN_WIDTH },
  { key: 'completion_date', label: 'Date Received', width: COLUMN_WIDTH },
  { key: 'status', label: 'Status', width: COLUMN_WIDTH },
  { key: 'amount_per_passenger', label: 'Amount', width: COLUMN_WIDTH },
  { key: 'remarks', label: 'Remarks', width: COLUMN_WIDTH },
  { key: 'created_at', label: 'Created At', width: COLUMN_WIDTH },
]

const useFilteredTransactions = (transactions, filters, sortConfig) => {
  return useMemo(() => {
    let filtered = transactions.filter(contracts => {
      if (filters.searchQuery && filters.searchColumn) {
        const searchValue = String(contracts[filters.searchColumn] || '').toLowerCase()
        const query = filters.searchQuery.toLowerCase()
        if (!searchValue.includes(query)) return false
      }
      
      if (filters.selectedCorporation && contracts.corporation !== filters.selectedCorporation) {
        return false
      }
      
      if (filters.invoiceFilter && filters.invoiceFilter !== 'all') {
        const hasInvoice = contracts.summary_id !== 'N/A' && contracts.summary_id !== null && contracts.summary_id !== undefined
        if (filters.invoiceFilter === 'with_invoice' && !hasInvoice) return false
        if (filters.invoiceFilter === 'without_invoice' && hasInvoice) return false
      }
      
      if (filters.month || filters.year) {
        const sourceDate = contracts._rawCompletionDate || contracts._rawCreatedAt
        if (sourceDate) {
          const d = new Date(sourceDate)
          const month = String(d.getMonth() + 1)
          const year = String(d.getFullYear())
          if (filters.month && filters.month !== month) return false
          if (filters.year && filters.year !== year) return false
        }
      }
      
      return true
    })

    if (sortConfig.column) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.column]
        const valB = b[sortConfig.column]

        if (['created_at', 'updated_at', 'completion_date'].includes(sortConfig.column)) {
          if (valA === 'N/A') return sortConfig.direction === 'ascending' ? -1 : 1
          if (valB === 'N/A') return sortConfig.direction === 'ascending' ? 1 : -1
          if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1
          if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1
          return 0
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [transactions, filters, sortConfig])
}

const FilterMenu = ({ 
  visible, 
  onDismiss, 
  anchor, 
  options, 
  selectedValue, 
  onSelect, 
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

const SearchFilterSection = ({ 
  filters, 
  onFiltersChange, 
  filterOptions, 
  corporations 
}) => {
  const { colors, fonts } = useTheme()
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [corporationMenuVisible, setCorporationMenuVisible] = useState(false)
  const [invoiceMenuVisible, setInvoiceMenuVisible] = useState(false)
  const [monthMenuVisible, setMonthMenuVisible] = useState(false)
  const [yearMenuVisible, setYearMenuVisible] = useState(false)

  const handleClearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      selectedCorporation: '',
      invoiceFilter: 'all',
      month: '',
      year: ''
    })
  }

  const hasActiveFilters = filters.searchQuery || filters.selectedCorporation || filters.invoiceFilter !== 'all' || filters.month || filters.year

  return (
    <>
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

      <Surface style={[styles.filtersSurface, { backgroundColor: colors.surface }]} elevation={1}>
        <View style={styles.filtersRow}>
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
              Invoice Status
            </Text>
            <FilterMenu
              visible={invoiceMenuVisible}
              onDismiss={() => setInvoiceMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  icon="file-document"
                  onPress={() => setInvoiceMenuVisible((prev) => !prev)}
                  style={[styles.filterButton, { borderColor: colors.outline }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                >
                  {INVOICE_FILTER_OPTIONS.find(opt => opt.value === filters.invoiceFilter)?.label || 'All Bookings'}
                </Button>
              }
              options={INVOICE_FILTER_OPTIONS}
              selectedValue={filters.invoiceFilter}
              onSelect={(value) => onFiltersChange({ invoiceFilter: value })}
            />
          </View>
        </View>
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
                  onPress={() => setFilterMenuVisible((prev) => !prev)}
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
                  onPress={() => setCorporationMenuVisible((prev) => !prev)}
                  style={[styles.filterButton, { borderColor: colors.outline }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                >
                  {filters.selectedCorporation || 'Corporations'}
                </Button>
              }
              options={[
                { label: 'All Corporations', value: '' },
                ...corporations.map(corp => ({
                  label: corp.corporation_name,
                  value: corp.corporation_name
                }))
              ]}
              selectedValue={filters.selectedCorporation}
              onSelect={(value) => onFiltersChange({ selectedCorporation: value })}
            />
          </View>
        </View>

        <View style={styles.dateFiltersRow}>
          <View style={styles.dateFilterGroup}>
            <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>Month</Text>
            <FilterMenu
              visible={monthMenuVisible}
              onDismiss={() => setMonthMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  icon="calendar-month"
                  onPress={() => setMonthMenuVisible((prev) => !prev)}
                  style={[styles.filterButton, { borderColor: colors.outline }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                >
                  {(
                    [
                      { label: 'All Months', value: '' },
                      { label: 'January', value: '1' },
                      { label: 'February', value: '2' },
                      { label: 'March', value: '3' },
                      { label: 'April', value: '4' },
                      { label: 'May', value: '5' },
                      { label: 'June', value: '6' },
                      { label: 'July', value: '7' },
                      { label: 'August', value: '8' },
                      { label: 'September', value: '9' },
                      { label: 'October', value: '10' },
                      { label: 'November', value: '11' },
                      { label: 'December', value: '12' },
                    ].find(opt => opt.value === String(filters.month))?.label || 'All Months'
                  )}
                </Button>
              }
              options={[
                { label: 'All Months', value: '' },
                { label: 'January', value: '1' },
                { label: 'February', value: '2' },
                { label: 'March', value: '3' },
                { label: 'April', value: '4' },
                { label: 'May', value: '5' },
                { label: 'June', value: '6' },
                { label: 'July', value: '7' },
                { label: 'August', value: '8' },
                { label: 'September', value: '9' },
                { label: 'October', value: '10' },
                { label: 'November', value: '11' },
                { label: 'December', value: '12' },
              ]}
              selectedValue={String(filters.month || '')}
              onSelect={(value) => onFiltersChange({ month: value })}
            />
          </View>
          <View style={styles.dateFilterGroup}>
            <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>Year</Text>
            <FilterMenu
              visible={yearMenuVisible}
              onDismiss={() => setYearMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  icon="calendar"
                  onPress={() => setYearMenuVisible((prev) => !prev)}
                  style={[styles.filterButton, { borderColor: colors.outline }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                >
                  {(() => {
                    const currentYear = new Date().getFullYear()
                    const label = filters.year ? String(filters.year) : 'All Years'
                    return label
                  })()}
                </Button>
              }
              options={(() => {
                const currentYear = new Date().getFullYear()
                const years = [{ label: 'All Years', value: '' }]
                for (let y = currentYear; y >= currentYear - 10; y--) {
                  years.push({ label: String(y), value: String(y) })
                }
                return years
              })()}
              selectedValue={String(filters.year || '')}
              onSelect={(value) => onFiltersChange({ year: value })}
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

const SelectionSection = ({ 
  selectedContracts, 
  selectAll, 
  onSelectAll, 
  paginatedTransactions, 
  onGenerateSummary 
}) => {
  const { colors, fonts } = useTheme()
  
  const selectableCount = paginatedTransactions.filter(t => t.summary_id === 'N/A').length

  return (
    <Surface style={[styles.selectionSurface, { backgroundColor: colors.surface }]} elevation={1}>
      <View style={styles.selectionContainer}>
        <View style={styles.selectAllContainer}>
          <Checkbox
            status={selectAll ? 'checked' : 'unchecked'}
            onPress={onSelectAll}
            color={colors.primary}
            disabled={selectableCount === 0}
            style={selectableCount === 0 ? { opacity: 0.5 } : {}}
          />
          <Text style={[
            styles.selectAllText, 
            { 
              color: selectableCount === 0 ? colors.onSurfaceDisabled : colors.onSurface 
            }, 
            fonts.bodyMedium
          ]}>
            Select All ({selectableCount})
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
        Generate Summary and Invoice ({selectedContracts.size})
      </Button>
    </Surface>
  )
}

const Bookings = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const currentMonth = String(new Date().getMonth() + 1)
  const currentYear = String(new Date().getFullYear())

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [corporations, setCorporations] = useState([])
  
  const [filters, setFilters] = useState({
    searchQuery: '',
    searchColumn: 'id',
    selectedCorporation: '',
    invoiceFilter: 'all',
    month: currentMonth,
    year: currentYear,
  })
  
  const [sortConfig, setSortConfig] = useState({
    column: 'created_at',
    direction: 'descending'
  })
  
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
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
          suffix,
          corporation:corporation_id (id, corporation_name)
        ),
        delivery:delivery_id (
          first_name,
          middle_initial,
          last_name,
          suffix
        )
      `)
      .in('contract_status_id', [5, 6]) // 5 for delivered, 6 for failed
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
      return
    }

    const formatted = data.map(contracts => {
      let completionDate = 'N/A'
      let rawCompletion = null
      if (contracts.delivered_at) {
        rawCompletion = contracts.delivered_at
        completionDate = new Date(contracts.delivered_at).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      } else if (contracts.cancelled_at) {
        rawCompletion = contracts.cancelled_at
        completionDate = new Date(contracts.cancelled_at).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      }

      const ownerName = [
        contracts.owner_first_name,
        contracts.owner_middle_initial,
        contracts.owner_last_name
      ].filter(Boolean).join(' ') || 'N/A'

      const amount = (contracts.delivery_charge || 0) + (contracts.delivery_surcharge || 0) - (contracts.delivery_discount || 0)

      return {
        key: contracts.id,
        id: contracts.id,
        status: contracts.contract_status?.status_name || 'N/A',
        drop_off_location: contracts.drop_off_location || contracts.delivery_address || 'N/A',
        completion_date: completionDate,
        delivery_charge: contracts.delivery_charge || 0,
        delivery_surcharge: contracts.delivery_surcharge || 0,
        delivery_discount: contracts.delivery_discount || 0,
        luggage_owner: ownerName,
        amount_per_passenger: amount,
        remarks: contracts.remarks || 'N/A',
        created_at: contracts.created_at
          ? new Date(contracts.created_at).toLocaleString()
          : 'N/A',
        _rawCreatedAt: contracts.created_at || 'N/A',
        _rawCompletionDate: rawCompletion,
        corporation: contracts.airline?.corporation?.corporation_name || 'N/A',
        corporation_id: contracts.airline?.corporation?.id || 'N/A',
        summary_id: contracts.summary_id || 'N/A',
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

  useFocusEffect(
    useCallback(() => {
      fetchTransactions()
      fetchCorporations()
      resetSelection()
    }, [])
  )

  const subscriptionRef = useRef(null)
  useFocusEffect(
    useCallback(() => {
      subscriptionRef.current = supabase
        .channel('pending_contracts_admin')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'contracts' },
          fetchTransactions
        )
        .subscribe()

      return () => {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe()
        }
      }
    }, [])
  )

  const filteredAndSortedTransactions = useFilteredTransactions(transactions, filters, sortConfig)
  const from = page * itemsPerPage
  const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedTransactions.length)
  const paginatedTransactions = filteredAndSortedTransactions.slice(from, to)
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

  const handleViewDetails = (contracts) => {
    navigation.navigate('ContractDetailsAdmin', { id: contracts.id })
  }

  const handleContractSelection = (contractId) => {
    const contractToSelect = transactions.find(t => t.id === contractId)
    
    if (contractToSelect?.summary_id && contractToSelect.summary_id !== 'N/A') {
      showSnackbar('Cannot select bookings that already have a summary. Only bookings without summaries can be selected.')
      return
    }
    
    const newSelected = new Set(selectedContracts)
    if (newSelected.has(contractId)) {
      newSelected.delete(contractId)
    } else {
      if (canSelectContract(contractId, newSelected)) {
        newSelected.add(contractId)
      } else {
        const selectedContractsData = transactions.filter(t => newSelected.has(t.id))
        
        if (selectedContractsData.length > 0) {
          const selectedCorporation = selectedContractsData[0]?.corporation
          const targetCorporation = contractToSelect?.corporation || 'Unknown'
          showSnackbar(`Cannot select contracts from different corporations. You have selected contracts from ${selectedCorporation} and are trying to select from ${targetCorporation}.`)
        } else {
          showSnackbar('Cannot select this contract due to corporation restrictions.')
        }
        return
      }
    }
    
    setSelectedContracts(newSelected)
    const selectableContractIds = new Set(paginatedTransactions.filter(t => t.summary_id === 'N/A').map(t => t.id))
    setSelectAll(newSelected.size === selectableContractIds.size && selectableContractIds.size > 0)
  }

  const handleSelectAll = () => {
    if (selectAll) {
      // Unchecking Select All clears selection
      setSelectedContracts(new Set())
      setSelectAll(false)
      return
    }

    // We are checking Select All
    const allSelectableOnPage = paginatedTransactions.filter(contract => contract.summary_id === 'N/A')

    // If there is an existing selection, select all on page with the same corporation_id
    if (selectedContracts.size > 0) {
      const firstSelected = transactions.find(t => selectedContracts.has(t.id))
      const targetCorporationId = firstSelected?.corporation_id

      const sameCorpOnPage = allSelectableOnPage.filter(c => c.corporation_id === targetCorporationId)
      const newSelection = new Set(sameCorpOnPage.map(c => c.id))

      setSelectedContracts(newSelection)
      setSelectAll(newSelection.size > 0 && newSelection.size === sameCorpOnPage.length)
      return
    }

    // No existing selection: fall back to selecting all allowed on the page respecting rules
    const selectableContracts = new Set()
    if (allSelectableOnPage.length > 0) {
      selectableContracts.add(allSelectableOnPage[0].id)
      for (let i = 1; i < allSelectableOnPage.length; i++) {
        if (canSelectContract(allSelectableOnPage[i].id, selectableContracts)) {
          selectableContracts.add(allSelectableOnPage[i].id)
        }
      }
    }

    setSelectedContracts(selectableContracts)
    setSelectAll(selectableContracts.size > 0 && selectableContracts.size === allSelectableOnPage.length)
  }

  const handleGenerateSummary = async () => {
    if (selectedContracts.size === 0) {
      showSnackbar('Please select at least one contract to generate summary')
      return
    }

    const selectedTransactions = transactions.filter(t => selectedContracts.has(t.id))
    const totalAmount = selectedTransactions.reduce((sum, t) => sum + (t.delivery_charge || 0), 0)
    const totalDiscount = selectedTransactions.reduce((sum, t) => sum + (t.delivery_discount || 0), 0)
    
    const summary = {
      totalTransactions: selectedTransactions.length,
      totalAmount,
      totalSurcharge: selectedTransactions.reduce((sum, t) => sum + (t.delivery_surcharge || 0), 0),
      totalDiscount,
      statusCounts: selectedTransactions.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {}),
      selectedContracts: Array.from(selectedContracts)
    }

    navigation.navigate('GenerateInvoice', {
      summaryData: summary,
      transactions: selectedTransactions,
      pendingContracts: Array.from(selectedContracts)
    })
  }

  const resetSelection = () => {
    setSelectedContracts(new Set())
    setSelectAll(false)
  }

  const canSelectContract = (contractId, currentSelection) => {
    const contractToSelect = transactions.find(t => t.id === contractId)
    if (!contractToSelect || contractToSelect.corporation_id === 'N/A' || (contractToSelect.summary_id && contractToSelect.summary_id !== 'N/A')) return false
    
    if (currentSelection.size === 0) return true
    
    const selectedContractsData = transactions.filter(t => currentSelection.has(t.id))
    const hasCorporationOne = selectedContractsData.some(t => t.corporation_id === 1)
    const hasDifferentCorporation = selectedContractsData.some(t => 
      t.corporation_id !== 1 && t.corporation_id !== 'N/A' && t.corporation_id !== contractToSelect.corporation_id
    )
    
    if (hasDifferentCorporation) {
      return contractToSelect.corporation_id === 1 || 
             selectedContractsData.some(t => t.corporation_id === contractToSelect.corporation_id)
    }
    
    if (hasCorporationOne && selectedContractsData.every(t => t.corporation_id === 1)) {
      return true
    }
    
    const sameCorporation = selectedContractsData[0]?.corporation_id
    return contractToSelect.corporation_id === 1 || contractToSelect.corporation_id === sameCorporation
  }

  const formatCurrency = (amount) => `₱${parseFloat(amount).toFixed(2)}`

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
          onFiltersChange={(partial) =>
            setFilters((prev) => ({ ...prev, ...partial }))
          }
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

        <Surface style={[styles.resultsSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
              To Pay
            </Text>
            {!loading && (
              <Text style={[styles.resultsCount, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                {filteredAndSortedTransactions.length} contract{filteredAndSortedTransactions.length !== 1 ? 's' : ''} found
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
                          No contracts found matching your criteria
                        </Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    paginatedTransactions.map((contracts, index) => (
                      <DataTable.Row 
                        key={contracts.key}
                        style={[
                          styles.tableRow,
                          index % 2 === 0 && { backgroundColor: colors.surfaceVariant + '20' }
                        ]}
                      >
                        <DataTable.Cell style={[styles.selectColumn, { justifyContent: 'center' }]}>
                          <Checkbox
                            status={selectedContracts.has(contracts.id) ? 'checked' : 'unchecked'}
                            onPress={() => handleContractSelection(contracts.id)}
                            color={colors.primary}
                            disabled={!canSelectContract(contracts.id, selectedContracts)}
                            style={!canSelectContract(contracts.id, selectedContracts) ? { opacity: 0.5 } : {}}
                          />
                        </DataTable.Cell>
                        <DataTable.Cell style={[styles.actionColumn, { justifyContent: 'center' }]}>
                          <Button
                            mode="outlined"
                            icon="eye"
                            onPress={() => handleViewDetails(contracts)}
                            style={[styles.actionButton, { borderColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                          >
                            Details
                          </Button>
                        </DataTable.Cell>
                        {TABLE_COLUMNS.map(({ key, width }, idx) => (
                          <DataTable.Cell
                            key={idx}
                            style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                          >
                            <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]} selectable>
                              {['delivery_charge', 'delivery_surcharge', 'delivery_discount', 'amount_per_passenger'].includes(key)
                                ? formatCurrency(contracts[key])
                                : contracts[key]}
                            </Text>
                          </DataTable.Cell>
                        ))}
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>

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
    padding: 12,
    gap: 12,
  },
  searchSurface: {
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  searchbar: {
    borderRadius: 6,
  },
  searchInput: {
    fontSize: 14,
  },
  filtersSurface: {
    padding: 12,
    borderRadius: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterGroup: {
    flex: 1,
  },
  dateFiltersRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dateFilterGroup: {
    flex: 1,
  },
  dateInput: {
    borderRadius: 6,
  },
  dateInputText: {
    fontSize: 14,
  },
  clearFiltersContainer: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  clearFiltersButton: {
    paddingHorizontal: 0,
  },
  filterLabel: {
    marginBottom: 6,
    fontWeight: '500',
    fontSize: 13,
  },
  filterButton: {
    borderRadius: 6,
  },
  menuContent: {
    width: '100%',
    left: 0,
    right: 0,
  },
  buttonContent: {
    height: 42,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectionSurface: {
    padding: 12,
    borderRadius: 8,
  },
  selectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: 6,
    fontSize: 13,
  },
  selectedCount: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  generateButton: {
    borderRadius: 6,
  },
  resultsSurface: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  resultsHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  resultsCount: {
    marginTop: 2,
    fontSize: 13,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 14,
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
    width: 120,
    paddingVertical: 8,
  },
  selectColumn: {
    width: 70,
    paddingVertical: 8,
  },
  tableColumn: {
    paddingVertical: 8,
  },
  sortableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sortIcon: {
    fontSize: 10,
  },
  headerText: {
    fontWeight: '600',
    fontSize: 12,
  },
  cellText: {
    textAlign: 'center',
    fontSize: 12,
  },
  actionButton: {
    borderRadius: 6,
  },
  noDataCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    flex: 1,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 13,
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
    fontSize: 12,
  },
})

export default Bookings


