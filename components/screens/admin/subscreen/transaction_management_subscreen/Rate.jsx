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
  Dialog,
  Portal,
} from 'react-native-paper'
import { supabase } from '../../../../../lib/supabase'
import EditDeliveryRateModal from '../../../../customComponents/EditDeliveryRateModal'
import AddDeliveryRateModal from '../../../../customComponents/AddDeliveryRateModal'
import useSnackbar from '../../../../hooks/useSnackbar'

const COLUMN_WIDTH = 180
const CITY_COLUMN_WIDTH = 200
const PRICE_COLUMN_WIDTH = 150
const REGION_COLUMN_WIDTH = 200

const DeliveryRates = () => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('city')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [sortColumn, setSortColumn] = useState('city')
  const [sortDirection, setSortDirection] = useState('ascending')
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [refreshing, setRefreshing] = useState(false)
  
  // Edit modal state
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedRate, setSelectedRate] = useState(null)
  const [priceAmount, setPriceAmount] = useState('')
  const [priceError, setPriceError] = useState('')
  const [editedCity, setEditedCity] = useState('')
  const [editedCityError, setEditedCityError] = useState('')
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)

  // Add modal state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newCity, setNewCity] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [regions, setRegions] = useState([])
  const [cityError, setCityError] = useState('')
  const [addPriceError, setAddPriceError] = useState('')
  const [regionError, setRegionError] = useState('')
  const [loadingAdd, setLoadingAdd] = useState(false)

  const fetchRates = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pricing')
      .select(`*, region:region_id(id, region)`)
      .order('city', { ascending: true })

    if (error) {
      console.error('Error fetching rates:', error)
      setLoading(false)
      return
    }

    const formatted = data.map(rate => ({
      id: rate.id,
      city: rate.city || 'N/A',
      price: rate.price ? `₱${rate.price.toFixed(2)}` : 'N/A',
      region: rate.region?.region || 'N/A',
      created_at: rate.created_at
        ? new Date(rate.created_at).toLocaleString('en-PH')
        : 'N/A',
      updated_at: rate.updated_at
        ? new Date(rate.updated_at).toLocaleString('en-PH')
        : 'N/A',
      region_id: rate.region_id,
      raw_price: rate.price, // Store the raw price for editing
    }))
    setRates(formatted)
    setLoading(false)
  }

  const fetchRegions = async () => {
    const { data, error } = await supabase.from('pricing_region').select('*')
    if (error) {
      console.error('Error fetching regions:', error)
      return
    }
    setRegions(data)
  }

  const handleAddRate = () => {
    setNewCity('')
    setNewPrice('')
    setSelectedRegion(null)
    setCityError('')
    setAddPriceError('')
    setRegionError('')
    setShowAddDialog(true)
  }

  const handleCreateRate = async () => {
    const cityTrimmed = newCity?.trim()
    const priceValue = parseFloat(String(newPrice).replace(/[^0-9.]/g, ''))

    // Basic validation
    if (!cityTrimmed) {
      setCityError('City is required.')
      return
    }
    if (!selectedRegion?.id) {
      setRegionError('Region is required.')
      return
    }
    if (isNaN(priceValue)) {
      setAddPriceError('Enter a valid price.')
      return
    }

    try {
      setLoadingAdd(true)

      // Duplicate check
      const { data: existing, error: dupError } = await supabase
        .from('pricing')
        .select('id')
        .eq('city', cityTrimmed)
        .eq('region_id', selectedRegion.id)

      if (dupError) throw dupError
      if (existing?.length > 0) {
        setCityError('This city already exists for the selected region.')
        return
      }

      // Insert new rate
      const { error } = await supabase.from('pricing').insert([
        {
          city: cityTrimmed,
          region_id: selectedRegion.id,
          price: priceValue,
        },
      ])

      if (error) throw error

      showSnackbar('Delivery rate added successfully!', true)
      setShowAddDialog(false)
      await fetchRates()
    } catch (error) {
      console.error('Add rate error:', error)
      showSnackbar('Error adding delivery rate. Please try again.', false)
    } finally {
      setLoadingAdd(false)
    }
  }

  const handleEditRate = (rate) => {
    setSelectedRate(rate)
    setPriceAmount(rate.raw_price != null ? String(rate.raw_price) : '')
    setEditedCity(rate.city && rate.city !== 'N/A' ? rate.city : '')
    setPriceError('')
    setEditedCityError('')
    setShowEditDialog(true)
  }

  const handleUpdateRate = async () => {
    const cityTrimmed = editedCity?.trim()
    const priceValue = parseFloat(String(priceAmount).replace(/[^0-9.]/g, ''))

    if (!selectedRate?.id) {
      showSnackbar('No selected rate to update.', false)
      return
    }
    if (!cityTrimmed) {
      setEditedCityError('City is required.')
      return
    }
    if (isNaN(priceValue)) {
      setPriceError('Enter a valid price.')
      return
    }

    try {
      setLoadingEdit(true)

      // Duplicate check (ignore current record)
      const { data: existing, error: dupError } = await supabase
        .from('pricing')
        .select('id')
        .eq('city', cityTrimmed)
        .eq('region_id', selectedRate.region_id)
        .neq('id', selectedRate.id)

      if (dupError) throw dupError
      if (existing?.length > 0) {
        setEditedCityError('This city already exists for the selected region.')
        return
      }

      // Update
      const { error } = await supabase
        .from('pricing')
        .update({
          city: cityTrimmed,
          price: priceValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRate.id)

      if (error) throw error

      showSnackbar('Delivery rate updated successfully!', true)
      setShowEditDialog(false)
      await fetchRates()
    } catch (error) {
      console.error('Update rate error:', error)
      showSnackbar('Error updating delivery rate.', false)
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleDeleteRate = (rate) => {
    setSelectedRate(rate)
    setShowDeleteDialog(true)
  }

  const confirmDeleteRate = async () => {
    if (!selectedRate) return
    setLoadingDelete(true)
    try {
      const { error } = await supabase
        .from('pricing')
        .delete()
        .eq('id', selectedRate.id)
      
      if (error) throw error

      setShowDeleteDialog(false)
      setSelectedRate(null)
      await fetchRates()
      showSnackbar('Delivery rate deleted successfully!', true)
    } catch (error) {
      showSnackbar('Error deleting delivery rate.', false)
      console.error('Error deleting delivery rate:', error)
    } finally {
      setLoadingDelete(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchRates()
      fetchRegions()
      // Realtime subscription for pricing updates
      const channelRef = { current: null }
      channelRef.current = supabase
        .channel('pricing_admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pricing' }, fetchRates)
        .subscribe()
      return () => {
        if (channelRef.current) {
          channelRef.current.unsubscribe()
        }
      }
    }, [])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchRates()
    setRefreshing(false)
  }

  const handleSort = (column) => {
    setSortDirection(prev =>
      sortColumn === column && prev === 'ascending' ? 'descending' : 'ascending'
    )
    setSortColumn(column)
  }

  const getSortIcon = (column) =>
    sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : ''

  const filteredAndSortedRates = rates
    .filter(rate => {
      const searchValue = String(rate[searchColumn] || '').toLowerCase()
      return searchValue.includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]

      if (sortColumn === 'price') {
        const priceA = parseFloat(valA.replace('₱', '')) || 0
        const priceB = parseFloat(valB.replace('₱', '')) || 0
        return sortDirection === 'ascending' ? priceA - priceB : priceB - priceA
      }

      if (sortColumn === 'updated_at') {
        return sortDirection === 'ascending'
          ? new Date(valA) - new Date(valB)
          : new Date(valB) - new Date(valA)
      }

      return sortDirection === 'ascending'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

  const from = page * itemsPerPage
  const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedRates.length)
  const paginatedRates = filteredAndSortedRates.slice(from, to)

  const filterOptions = [
    { label: 'City', value: 'city' },
    { label: 'Price', value: 'price' },
    { label: 'Region', value: 'region' },
    { label: 'Created at', value: 'created_at' },
    { label: 'Last Updated', value: 'updated_at' },
  ]

  const columns = [
    { key: 'city', label: 'City', width: CITY_COLUMN_WIDTH },
    { key: 'price', label: 'Price', width: PRICE_COLUMN_WIDTH },
    { key: 'region', label: 'Region', width: REGION_COLUMN_WIDTH },
    { key: 'created_at', label: 'Created at', width: COLUMN_WIDTH },
    { key: 'updated_at', label: 'Last Updated', width: COLUMN_WIDTH },
  ]

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >

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
            inputStyle={[styles.searchInput, { color: colors.onSurface }]}
          />
        </Surface>

        {/* Filter Section */}
        <Surface style={[styles.filtersSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>
              Filter Column
            </Text>
            <Menu
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
          <Button
            mode="contained"
            icon="plus"
            onPress={handleAddRate}
            style={{ marginTop: 10 }}
          >
            Add City
          </Button>
        </Surface>

        {/* Results Section */}
        <Surface style={[styles.resultsSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>
              Delivery Rates
            </Text>
            {!loading && (
              <Text style={[styles.resultsCount, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                {filteredAndSortedRates.length} rate{filteredAndSortedRates.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyLarge]}>
                Loading rates...
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

                  {filteredAndSortedRates.length === 0 ? (
                    <DataTable.Row>
                      <DataTable.Cell style={styles.noDataCell}>
                        <Text style={[styles.noDataText, { color: colors.onSurfaceVariant }, fonts.bodyLarge]}>
                          No rates found
                        </Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ) : (
                    paginatedRates.map((rate, index) => (
                      <DataTable.Row
                        key={rate.id}
                        style={[
                          styles.tableRow,
                          index % 2 === 0 && { backgroundColor: colors.surfaceVariant + '20' }
                        ]}
                      >
                      <DataTable.Cell style={[styles.actionColumn]}>
                        <View style={styles.actionButtonsContainer}>
                          <Button
                            mode="contained"
                            style={[styles.actionButton, { backgroundColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
                            onPress={() => handleEditRate(rate)}
                          >
                            Edit
                          </Button>
                          <Button
                            mode="contained"
                            style={[styles.actionButton, { backgroundColor: colors.error }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.onError }]}
                            onPress={() => handleDeleteRate(rate)}
                          >
                            Delete
                          </Button>
                        </View>
                      </DataTable.Cell>
                        {columns.map(({ key, width }) => (
                          <DataTable.Cell
                            key={key}
                            style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                          >
                            <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]}>
                              {rate[key]}
                            </Text>
                          </DataTable.Cell>
                        ))}
                      </DataTable.Row>
                    ))
                  )}
                </DataTable>
              </ScrollView>

              {/* Pagination */}
              {filteredAndSortedRates.length > 0 && (
                <View style={[styles.paginationContainer, { backgroundColor: colors.surfaceVariant }]}>
                  <DataTable.Pagination
                    page={page}
                    numberOfPages={Math.ceil(filteredAndSortedRates.length / itemsPerPage)}
                    onPageChange={page => setPage(page)}
                    label={`${from + 1}-${to} of ${filteredAndSortedRates.length}`}
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
                      colors: {
                        onSurface: colors.onSurface,
                        text: colors.onSurface,
                        elevation: { level2: colors.surface },
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

      <EditDeliveryRateModal
        visible={showEditDialog}
        onDismiss={() => setShowEditDialog(false)}
        title="Edit Delivery Rate"
        description={`Update delivery rate for ${selectedRate?.city || 'this city'}.`}
        priceAmount={priceAmount}
        setPriceAmount={setPriceAmount}
        priceError={priceError}
        setPriceError={setPriceError}
        city={editedCity}
        setCity={setEditedCity}
        cityError={editedCityError}
        setCityError={setEditedCityError}
        loading={loadingEdit}
        onConfirm={handleUpdateRate}
        currencySymbol="₱"
      />

      <AddDeliveryRateModal
        visible={showAddDialog}
        onDismiss={() => setShowAddDialog(false)}
        title="Add New Delivery Rate"
        description={`Enter the city name and select a region to add a new delivery rate.`}
        city={newCity}
        setCity={setNewCity}
        cityError={cityError}
        price={newPrice}
        setPrice={setNewPrice}
        priceError={addPriceError}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        regionError={regionError}
        regions={regions}
        loading={loadingAdd}
        onConfirm={handleCreateRate}
        currencySymbol="₱"
      />

      <Portal>
        <Dialog
          visible={showDeleteDialog}
          onDismiss={() => setShowDeleteDialog(false)}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Confirm Deletion</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete the rate for {selectedRate?.city}? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)} disabled={loadingDelete}>
              Cancel
            </Button>
            <Button onPress={confirmDeleteRate} loading={loadingDelete} disabled={loadingDelete} textColor={colors.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {SnackbarElement}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { padding: 16, gap: 16 },
  searchSurface: { padding: 16, borderRadius: 12 },
  sectionTitle: { marginBottom: 12, fontWeight: '600' },
  searchbar: { borderRadius: 8 },
  searchInput: { fontSize: 16 },
  filtersSurface: { padding: 16, borderRadius: 12 },
  filterGroup: { flex: 1 },
  filterLabel: { marginBottom: 8, fontWeight: '500' },
  filterButton: { borderRadius: 8 },
  menuContent: { width: '100%', left: 0, right: 0 },
  resultsSurface: { borderRadius: 12, overflow: 'hidden' },
  resultsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: { marginTop: 4 },
  loadingContainer: { padding: 32, alignItems: 'center' },
  loadingText: { textAlign: 'center' },
  tableContainer: { flex: 1 },
  table: { flex: 1 },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    flexDirection: 'row',
  },
  actionColumn: { width: 220, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent:'center' },
  tableColumn: { paddingVertical: 12 },
  sortableHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortIcon: { fontSize: 12 },
  headerText: { fontWeight: '600' },
  cellText: { textAlign: 'center' },
  actionButtonsContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  },
  actionButton: {
    borderRadius: 8,
    marginRight: 8,
  },
  buttonContent: { height: 40 },
  buttonLabel: { fontSize: 14, fontWeight: '600' },
  noDataCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    flex: 1,
  },
  noDataText: { textAlign: 'center' },
  paginationContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
  pagination: { justifyContent: 'space-evenly' },
  paginationLabel: { fontWeight: '500' },
})

export default DeliveryRates
