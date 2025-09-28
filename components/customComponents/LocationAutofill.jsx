import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { TextInput, Menu, Text, IconButton, Surface } from 'react-native-paper'
import { useTheme } from 'react-native-paper'
import { 
  getRegions, 
  getProvincesByRegion, 
  getCitiesByProvince, 
  getBarangaysByCity,
} from '../../utils/locationData'

const LocationAutofill = ({ 
  onLocationChange, 
  initialValues = {},
  disabled = false,
  style = {},
  errors = {}
}) => {
  const { colors, fonts } = useTheme()
  
  // State for address field values (modifiable)
  const [region, setRegion] = useState(initialValues.region || '')
  const [province, setProvince] = useState(initialValues.province || '')
  const [cityMunicipality, setCityMunicipality] = useState(initialValues.city || '')
  const [barangay, setBarangay] = useState(initialValues.barangay || '')
  
  // State for selected objects (to get codes for data fetching)
  const [selectedRegionObj, setSelectedRegionObj] = useState(null)
  const [selectedProvinceObj, setSelectedProvinceObj] = useState(null)
  const [selectedCityObj, setSelectedCityObj] = useState(null)
  
  // State for dropdown visibility
  const [showRegionMenu, setShowRegionMenu] = useState(false)
  const [showProvinceMenu, setShowProvinceMenu] = useState(false)
  const [showCityMenu, setShowCityMenu] = useState(false)
  const [showBarangayMenu, setShowBarangayMenu] = useState(false)
  
  // State for search queries
  const [regionQuery, setRegionQuery] = useState('')
  const [provinceQuery, setProvinceQuery] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [barangayQuery, setBarangayQuery] = useState('')
  
  // Load all data
  const allRegions = useMemo(() => getRegions(), [])
  
  // Filtered data based on search (alphabetically sorted)
  const filteredRegions = useMemo(() => {
    const query = regionQuery.toLowerCase().trim()
    let filtered = allRegions
    
    if (query) {
      filtered = allRegions.filter(region => 
        region.name.toLowerCase().includes(query)
      )
    }
    
    return filtered
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 100) // Limit to first 100 for performance
  }, [allRegions, regionQuery])
  
  const filteredProvinces = useMemo(() => {
    if (!selectedRegionObj) return []
    
    const query = provinceQuery.toLowerCase().trim()
    let provinces = getProvincesByRegion(selectedRegionObj.code)
    
    if (query) {
      provinces = provinces.filter(province => 
        province.name.toLowerCase().includes(query)
      )
    }
    
    return provinces
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 100)
  }, [selectedRegionObj, provinceQuery])
  
  const filteredCities = useMemo(() => {
    if (!selectedProvinceObj) return []
    
    const query = cityQuery.toLowerCase().trim()
    let cities = getCitiesByProvince(selectedProvinceObj.code)
    
    if (query) {
      cities = cities.filter(city => 
        city.name.toLowerCase().includes(query)
      )
    }
    
    return cities
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 100)
  }, [selectedProvinceObj, cityQuery])
  
  const filteredBarangays = useMemo(() => {
    if (!selectedCityObj) return []
    
    const query = barangayQuery.toLowerCase().trim()
    let barangays = getBarangaysByCity(selectedCityObj.code)
    
    if (query) {
      barangays = barangays.filter(barangay => 
        barangay.name.toLowerCase().includes(query)
      )
    }
    
    return barangays
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 100)
  }, [selectedCityObj, barangayQuery])
  
  // Notify parent component of changes
  useEffect(() => {
    onLocationChange({
      region: region,
      province: province,
      city: cityMunicipality,
      barangay: barangay
    })
  }, [region, province, cityMunicipality, barangay, onLocationChange])
  
  const handleRegionSelect = useCallback((selectedRegion) => {
    setRegion(selectedRegion.name)
    setSelectedRegionObj(selectedRegion)
    setProvince('')
    setCityMunicipality('')
    setBarangay('')
    setSelectedProvinceObj(null)
    setSelectedCityObj(null)
    setShowRegionMenu(false)
    setRegionQuery('')
  }, [])
  
  const handleProvinceSelect = useCallback((selectedProvince) => {
    setProvince(selectedProvince.name)
    setSelectedProvinceObj(selectedProvince)
    setCityMunicipality('')
    setBarangay('')
    setSelectedCityObj(null)
    setShowProvinceMenu(false)
    setProvinceQuery('')
  }, [])
  
  const handleCitySelect = useCallback((selectedCity) => {
    setCityMunicipality(selectedCity.name)
    setSelectedCityObj(selectedCity)
    setBarangay('')
    setShowCityMenu(false)
    setCityQuery('')
  }, [])
  
  const handleBarangaySelect = useCallback((selectedBarangay) => {
    setBarangay(selectedBarangay.name)
    setShowBarangayMenu(false)
    setBarangayQuery('')
  }, [])
  
  const clearAllSelections = () => {
    setRegion('')
    setProvince('')
    setCityMunicipality('')
    setBarangay('')
    setSelectedRegionObj(null)
    setSelectedProvinceObj(null)
    setSelectedCityObj(null)
    setRegionQuery('')
    setProvinceQuery('')
    setCityQuery('')
    setBarangayQuery('')
  }
  
  const renderAutofillDropdown = (label, value, onSelect, showMenu, setShowMenu, query, setQuery, filteredData, disabled, onTextChange, error = false) => (
    <Menu
      visible={showMenu}
      onDismiss={() => setShowMenu(false)}
      anchor={
        <TouchableOpacity onPress={() => !disabled && setShowMenu(prev => !prev)}>
          <TextInput
            label={label}
            value={value}
            onChangeText={onTextChange}
            mode="outlined"
            style={[styles.input, style]}
            error={error}
            left={
              <TextInput.Icon 
                icon="magnify" 
                onPress={() => !disabled && setShowMenu(prev => !prev)}
                disabled={disabled}
              />
            }
            editable={!disabled}
            disabled={disabled}
            placeholder={`Search ${label.toLowerCase()}...`}
          />
        </TouchableOpacity>
      }
      contentStyle={{ 
        backgroundColor: colors.surface,
        maxHeight: 400,
        minHeight: 200,
        width: '100%',
        maxWidth: 400
      }}
      style={{
        marginTop: 8,
        marginHorizontal: 16
      }}
    >
      {filteredData.length === 0 ? (
        <Menu.Item
          title="No results found"
          disabled
          titleStyle={{ color: colors.onSurfaceVariant }}
        />
      ) : (
        <ScrollView 
          style={styles.menuContainer}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={10}
          initialNumToRender={20}
        >
          {filteredData.map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              onPress={() => {
                onSelect(item)
                setShowMenu(false)
              }}
              style={[styles.menuItem, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.menuItemText, { color: colors.onSurface }]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Menu>
  )
  
  return (
    <View style={styles.container}>
      <Text style={[fonts.titleMedium, { color: colors.primary, marginBottom: 16 }]}>
        Delivery Address
      </Text>
      
      {renderAutofillDropdown(
        "Region*",
        region,
        handleRegionSelect,
        showRegionMenu,
        setShowRegionMenu,
        regionQuery,
        setRegionQuery,
        filteredRegions,
        disabled,
        (text) => {
          setRegion(text)
          setRegionQuery(text)
        },
        errors.region
      )}
      
      {renderAutofillDropdown(
        "Province*",
        province,
        handleProvinceSelect,
        showProvinceMenu,
        setShowProvinceMenu,
        provinceQuery,
        setProvinceQuery,
        filteredProvinces,
        disabled || !selectedRegionObj,
        (text) => {
          setProvince(text)
          setProvinceQuery(text)
        },
        errors.province
      )}
      
      {renderAutofillDropdown(
        "City/Municipality*",
        cityMunicipality,
        handleCitySelect,
        showCityMenu,
        setShowCityMenu,
        cityQuery,
        setCityQuery,
        filteredCities,
        disabled || !selectedProvinceObj,
        (text) => {
          setCityMunicipality(text)
          setCityQuery(text)
        },
        errors.cityMunicipality
      )}
      
      {renderAutofillDropdown(
        "Barangay*",
        barangay,
        handleBarangaySelect,
        showBarangayMenu,
        setShowBarangayMenu,
        barangayQuery,
        setBarangayQuery,
        filteredBarangays,
        disabled || !selectedCityObj,
        (text) => {
          setBarangay(text)
          setBarangayQuery(text)
        },
        errors.barangay
      )}
      
      <TouchableOpacity 
        onPress={clearAllSelections}
        style={[styles.clearButton, { borderColor: colors.outline }]}
        disabled={disabled}
      >
        <IconButton icon="broom" size={20} iconColor={colors.onSurfaceVariant} />
        <Text style={[fonts.bodyMedium, { color: colors.onSurfaceVariant }]}>
          Clear All Selections
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  menuContainer: {
    maxHeight: 350,
    minHeight: 200,
  },
  menuItem: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
})

export default LocationAutofill