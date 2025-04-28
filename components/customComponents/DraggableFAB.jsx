import React, { useState } from 'react'
import { View, TouchableOpacity, Text, PanResponder, Dimensions, Animated } from 'react-native'
import { IconButton, Searchbar } from 'react-native-paper'
import { useTheme } from 'react-native-paper'

const DraggableFAB = ({ onFilter, onSort }) => {
  const { colors, fonts } = useTheme()
  const { width, height } = Dimensions.get('window')
  
  const [containerVisible, setContainerVisible] = useState(false)
  const [searchText, setSearchText] = useState('')

  // Animated values for smooth dragging
  const pan = useState(new Animated.ValueXY({ x: 10, y: 95 }))[0]

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (e, gestureState) => {
      const maxRight = width - 60
      const maxBottom = height - 60

      let newX = gestureState.moveX
      let newY = gestureState.moveY

      if (newX > maxRight) newX = maxRight
      if (newY > maxBottom) newY = maxBottom

      Animated.spring(pan, {
        toValue: { x: newX, y: newY },
        useNativeDriver: false,
        bounciness: 5, // Adds a bounce effect at the edges
      }).start()
    },
    onPanResponderRelease: () => {
      // Snap back to nearest valid position after dragging
      Animated.spring(pan, {
        toValue: { x: pan.x.__getValue(), y: pan.y.__getValue() }, // Ensure position is locked
        useNativeDriver: false,
      }).start()
    },
  })

  const toggleContainer = () => {
    setContainerVisible(!containerVisible)
  }

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: pan.x,
          top: pan.y,
          zIndex: 9999,
        }}
        {...panResponder.panHandlers}
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
              elevation: 5, // Small shadow
            }}
          >
            <IconButton icon="cog" size={20} iconColor={colors.onPrimary} />
          </View>
        </TouchableOpacity>

        {containerVisible && (
          <Animated.View
            style={{
              marginTop: 10,
              width: 200,
              minHeight: 100,
              backgroundColor: colors.surface,
              borderRadius: 10,
              padding: 10,
              elevation: 2,
              opacity: containerVisible ? 1 : 0, // Fade-in effect
              transform: [
                { scale: containerVisible ? 1 : 0.95 }, // Smooth scaling effect
              ],
            }}
          >
            {/* Replacing TextInput with Searchbar from React Native Paper */}
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
          </Animated.View>
        )}
      </Animated.View>
    </View>
  )
}

export default DraggableFAB
