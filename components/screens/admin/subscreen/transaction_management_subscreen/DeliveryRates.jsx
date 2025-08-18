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
} from 'react-native-paper'
import Header from '../../../../customComponents/Header'
import { supabase } from '../../../../../lib/supabaseAdmin'

const COLUMN_WIDTH = 180
const CITY_COLUMN_WIDTH = 200
const PRICE_COLUMN_WIDTH = 150
const REGION_COLUMN_WIDTH = 200

const DeliveryRates = ({ navigation }) => {
  const { colors, fonts } = useTheme()

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
      updated_at: rate.updated_at
        ? new Date(rate.updated_at).toLocaleString('en-PH')
        : 'N/A',
      region_id: rate.region_id,
    }))
    setRates(formatted)
    setLoading(false)
  }

  useFocusEffect(
    useCallback(() => {
      fetchRates()
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
    { label: 'Price', value: 'price' },
    { label: 'City', value: 'city' },
    { label: 'Region', value: 'region' },
    { label: 'Last Updated', value: 'updated_at' },
  ]

  const columns = [
    { key: 'price', label: 'Price', width: PRICE_COLUMN_WIDTH },
    { key: 'city', label: 'City', width: CITY_COLUMN_WIDTH },
    { key: 'region', label: 'Region', width: REGION_COLUMN_WIDTH },
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
                  onPress={() => setFilterMenuVisible(true)}
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
                        <DataTable.Cell style={[styles.actionColumn, { justifyContent: 'center' }]}>
                          <Button
                            mode="contained"
                            style={[styles.actionButton, { backgroundColor: colors.primary }]}
                            contentStyle={styles.buttonContent}
                            labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
                            onPress={() => console.log('Edit pressed')}
                          >
                            Edit
                          </Button>
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
  },
  actionColumn: { width: 140, paddingVertical: 12 },
  tableColumn: { paddingVertical: 12 },
  sortableHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortIcon: { fontSize: 12 },
  headerText: { fontWeight: '600' },
  cellText: { textAlign: 'center' },
  actionButton: { borderRadius: 8 },
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
