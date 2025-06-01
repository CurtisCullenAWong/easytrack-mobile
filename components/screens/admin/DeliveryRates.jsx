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
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper'
import Header from '../../customComponents/Header'
import { supabase } from '../../../lib/supabaseAdmin'

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
  const [actionMenuVisible, setActionMenuVisible] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [editDialogVisible, setEditDialogVisible] = useState(false)
  const [editingRate, setEditingRate] = useState({
    id: null,
    city: '',
    region_id: null,
  })
  const [editingPrice, setEditingPrice] = useState('')
  const [editError, setEditError] = useState('')

  const MIN_PRICE = 1.00
  const MAX_PRICE = 99999.99

  const formatPrice = (value) => {
    // Remove any non-numeric characters except decimal point
    let numericValue = value.replace(/[^0-9.]/g, '')
    
    // Ensure only one decimal point
    const parts = numericValue.split('.')
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      numericValue = parts[0] + '.' + parts[1].substring(0, 2)
    }
    
    // Convert to number and validate range
    const numValue = parseFloat(numericValue)
    if (!isNaN(numValue)) {
      if (numValue < MIN_PRICE) {
        return MIN_PRICE.toFixed(2)
      }
      if (numValue > MAX_PRICE) {
        return MAX_PRICE.toFixed(2)
      }
    }
    
    return numericValue
  }

  const handlePriceChange = (text) => {
    const formattedPrice = formatPrice(text)
    setEditingPrice(formattedPrice)
  }

  const fetchRates = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pricing')
      .select(`
        *,
        region:region_id (
          id,
          region
        )
      `)
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
        ? new Date(rate.updated_at).toLocaleString()
        : 'N/A',
    }))
    setRates(formatted)
    setLoading(false)
  }

  useFocusEffect(
    useCallback(() => {
      fetchRates()
    }, [])
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchRates().finally(() => setRefreshing(false))
  }, [])

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
      const query = searchQuery.toLowerCase()
      return searchValue.includes(query)
    })
    .sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]

      // Special handling for price column
      if (sortColumn === 'price') {
        const priceA = parseFloat(valA.replace('₱', '')) || 0
        const priceB = parseFloat(valB.replace('₱', '')) || 0
        return sortDirection === 'ascending' ? priceA - priceB : priceB - priceA
      }

      // Special handling for date columns
      if (sortColumn === 'updated_at') {
        if (valA === 'N/A') return sortDirection === 'ascending' ? -1 : 1
        if (valB === 'N/A') return sortDirection === 'ascending' ? 1 : -1
        return sortDirection === 'ascending'
          ? new Date(valA) - new Date(valB)
          : new Date(valB) - new Date(valA)
      }

      // Default sorting for non-date columns
      if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
      if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
      return 0
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

  const handleDeleteRate = async (rateId) => {
    try {
      const { error } = await supabase
        .from('pricing')
        .delete()
        .eq('id', rateId)
      
      if (error) {
        console.error('Error deleting rate:', error)
      } else {
        fetchRates()
      }
    } catch (error) {
      console.error('Error deleting rate:', error)
    }
  }

  const handleEditRate = async () => {
    try {
      setEditError('')
      
      // Validate price
      if (!editingPrice.trim()) {
        setEditError('Price is required')
        return
      }

      // Convert price to number and validate
      const price = parseFloat(editingPrice)
      if (isNaN(price) || price < MIN_PRICE || price > MAX_PRICE) {
        setEditError(`Price must be between ₱${MIN_PRICE.toFixed(2)} and ₱${MAX_PRICE.toFixed(2)}`)
        return
      }

      const { error } = await supabase
        .from('pricing')
        .update({
          price: price,
          region_id: editingRate.region_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingRate.id)

      if (error) {
        console.error('Error updating rate:', error)
        setEditError('Failed to update rate. Please try again.')
      } else {
        setEditDialogVisible(false)
        fetchRates()
      }
    } catch (error) {
      console.error('Error updating rate:', error)
      setEditError('An unexpected error occurred')
    }
  }

  const openEditDialog = (rate) => {
    setEditingRate({
      id: rate.id,
      city: rate.city,
      region_id: rate.region_id,
    })
    setEditingPrice(rate.price.replace('₱', ''))
    setEditDialogVisible(true)
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Header navigation={navigation} title="Delivery Rates" />

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

      {loading ? (
        <Text style={[styles.loadingText, { color: colors.onSurface }, fonts.bodyMedium]}>
          Loading rates...
        </Text>
      ) : (
        <View style={styles.tableContainer}>
          <ScrollView horizontal>
            <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
              <DataTable.Header style={[styles.table, { backgroundColor: colors.surfaceVariant, alignItems: 'center' }]}>
                {columns.map(({ key, label, width }) => (
                  <DataTable.Title
                    key={key}
                    style={{ width: width || COLUMN_WIDTH, justifyContent: 'center' }}
                    onPress={() => handleSort(key)}
                  >
                    <View style={styles.sortableHeader}>
                      <Text style={[{ color: colors.onSurface }, fonts.labelLarge]}>{label}</Text>
                      <Text style={[styles.sortIcon, { color: colors.onSurface }]}>{getSortIcon(key)}</Text>
                    </View>
                  </DataTable.Title>
                ))}
                <DataTable.Title style={{ width: COLUMN_WIDTH, justifyContent: 'center' }} numeric>
                  <Text style={[{ color: colors.onSurface }, fonts.labelLarge]}>Actions</Text>
                </DataTable.Title>
              </DataTable.Header>

              {filteredAndSortedRates.length === 0 ? (
                <DataTable.Row>
                  <DataTable.Cell style={styles.noDataCell}>
                    <Text style={[{ color: colors.onSurface, textAlign: 'center' }, fonts.bodyMedium]}>
                      No delivery rates available
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ) : (
                paginatedRates.map(rate => (
                  <DataTable.Row key={rate.id}>
                    {[
                      { value: rate.price, width: PRICE_COLUMN_WIDTH },
                      { value: rate.city, width: CITY_COLUMN_WIDTH },
                      { value: rate.region, width: REGION_COLUMN_WIDTH },
                      { value: rate.updated_at, width: COLUMN_WIDTH },
                    ].map(({ value, width }, idx) => (
                      <DataTable.Cell
                        key={idx}
                        style={{ width, justifyContent: 'center', paddingVertical: 8 }}
                      >
                        <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>{value}</Text>
                      </DataTable.Cell>
                    ))}
                    <DataTable.Cell numeric style={{ width: COLUMN_WIDTH, justifyContent: 'center', paddingVertical: 8 }}>
                      <Menu
                        visible={actionMenuVisible === rate.id}
                        onDismiss={() => setActionMenuVisible(null)}
                        anchor={
                          <Button
                            mode="outlined"
                            icon="dots-vertical"
                            onPress={() => setActionMenuVisible(rate.id)}
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
                            setActionMenuVisible(null)
                            openEditDialog(rate)
                          }}
                          title="Edit Rate"
                          leadingIcon="pencil"
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
              numberOfPages={Math.ceil(filteredAndSortedRates.length / itemsPerPage)}
              onPageChange={page => setPage(page)}
              label={`${from + 1}-${to} of ${filteredAndSortedRates.length}`}
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

      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)} style={{backgroundColor: colors.surface}}>
          <Dialog.Title>Edit Delivery Rate</Dialog.Title>
          <Dialog.Content>
            <View style={styles.infoContainer}>
              <Text style={[styles.infoLabel, { color: colors.onSurface }]}>City:</Text>
              <Text style={[styles.infoValue, { color: colors.onSurface }]}>{editingRate.city}</Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={[styles.infoLabel, { color: colors.onSurface }]}>Region:</Text>
              <Text style={[styles.infoValue, { color: colors.onSurface }]}>{rates.find(r => r.id === editingRate.id)?.region || 'N/A'}</Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={[styles.infoLabel, { color: colors.onSurface }]}>Last Updated:</Text>
              <Text style={[styles.infoValue, { color: colors.onSurface }]}>{editingRate.updated_at}</Text>
            </View>
            <TextInput
              label="Price"
              value={editingPrice}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
              style={styles.input}
              placeholder={`₱${MIN_PRICE.toFixed(2)} - ₱${MAX_PRICE.toFixed(2)}`}
              error={editError}
              left={<TextInput.Icon icon={() => <Text>₱</Text>} />}
            />
            {editError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{editError}</Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleEditRate}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  },
  buttonContainer1: {
    marginHorizontal:'auto'
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
    minHeight: 'auto',
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
  input: {
    marginBottom: 16,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
  },
})

export default DeliveryRates 