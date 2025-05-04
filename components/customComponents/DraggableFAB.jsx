import React, { useState } from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import { IconButton, Searchbar, useTheme } from 'react-native-paper'

const DraggableFAB = ({ onFilter, onSort }) => {
  const { colors, fonts } = useTheme()
  const [containerVisible, setContainerVisible] = useState(false)
  const [searchText, setSearchText] = useState('')

  const toggleContainer = () => {
    setContainerVisible(!containerVisible)
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          zIndex: 9999,
        }}
      >
        <TouchableOpacity onPress={toggleContainer} activeOpacity={0.8}>
          <View
            style={{
              width: 60,
              height: 60,
              backgroundColor: colors.primary,
              borderRadius: 30,
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 5,
            }}
          >
            <IconButton icon="cog" size={20} iconColor={colors.onPrimary} />
          </View>
        </TouchableOpacity>

        {containerVisible && (
          <View
            style={{
              marginTop: 10,
              width: 320,
              minHeight: 100,
              backgroundColor: colors.surface,
              borderRadius: 10,
              padding: 10,
              elevation: 2,
            }}
          >
            <Searchbar
              placeholder="Search"
              value={searchText}
              onChangeText={setSearchText}
              style={{
                marginBottom: 10,
                backgroundColor: colors.surface,
                borderRadius: 5,
              }}
            />

            <TouchableOpacity onPress={onFilter} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <IconButton icon="filter-variant" size={20} iconColor={colors.onSurface} />
              <Text style={{ ...fonts.bodyMedium, color: colors.onSurface }}>Filter By</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onSort} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <IconButton icon="sort" size={20} iconColor={colors.onSurface} />
              <Text style={{ ...fonts.bodyMedium, color: colors.onSurface }}>Sort By</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

export default DraggableFAB
