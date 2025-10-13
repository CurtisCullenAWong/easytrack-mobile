import React from 'react'
import { View, StyleSheet } from 'react-native'
import {
  Portal,
  Dialog,
  Button,
  TextInput,
  Text,
  useTheme,
  Menu,
} from 'react-native-paper'

const AddDeliveryRateModal = ({
  visible,
  onDismiss,
  title,
  description,
  city,
  setCity,
  cityError,
  price,
  setPrice,
  priceError,
  selectedRegion,
  setSelectedRegion,
  regionError,
  regions,
  loading,
  onConfirm,
  currencySymbol = '',
}) => {
  const { colors, fonts } = useTheme()
  const [menuVisible, setMenuVisible] = React.useState(false)
  const [menuAnchorWidth, setMenuAnchorWidth] = React.useState(0)

  const regionName = selectedRegion?.region || ''
  const fullCity = city && regionName ? `${city}, ${regionName}` : city || ''

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[styles.dialog, { backgroundColor: colors.surface }]}
      >
        <Dialog.Title style={[{ color: colors.onSurface }, fonts.headlineSmall]}>
          {title}
        </Dialog.Title>
        <Dialog.Content>
          <Text style={[{ color: colors.onSurfaceVariant, marginBottom: 16 }, fonts.bodyMedium]}>
            {description}
          </Text>

          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setMenuVisible((prev) => !prev)}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout
                  setMenuAnchorWidth(width)
                }}
                style={[styles.input, { height: 56, justifyContent: 'center' }]}
                contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}
                error={!!regionError}
                icon="chevron-down"
              >
                {selectedRegion ? selectedRegion.region : 'Select Region'}
              </Button>
            }
            contentStyle={{ width: menuAnchorWidth, backgroundColor: colors.surface }}
          >
            {regions.map((region) => (
              <Menu.Item
                key={region.id}
                onPress={() => {
                  setSelectedRegion(region)
                  setMenuVisible(false)
                }}
                title={region.region}
              />
            ))}
          </Menu>
          {!!regionError && <Text style={styles.errorText}>{regionError}</Text>}

          <TextInput
            label="City"
            value={city}
            onChangeText={setCity}
            error={!!cityError}
            style={styles.input}
            mode="outlined"
            placeholder="e.g., Manila"
          />
          {!!cityError && <Text style={styles.errorText}>{cityError}</Text>}

          <TextInput
            label="Price"
            value={price}
            onChangeText={setPrice}
            error={!!priceError}
            style={styles.input}
            keyboardType="numeric"
            maxLength={7}
            mode="outlined"
            left={<TextInput.Affix text={currencySymbol} />}
          />
          {!!priceError && <Text style={styles.errorText}>{priceError}</Text>}
        {fullCity ? (
            <Text
                style={[
                { color: colors.onSurfaceVariant, marginTop: 6, marginLeft: 4 },
                fonts.bodySmall,
                ]}
            >
                Full location: <Text style={{ fontWeight: '600' }}>{fullCity}</Text>
            </Text>
        ) : null}
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>
            Cancel
          </Button>
          <Button onPress={onConfirm} loading={loading} disabled={loading}>
            Add
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 12,
  },
  input: {
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
})

export default AddDeliveryRateModal
