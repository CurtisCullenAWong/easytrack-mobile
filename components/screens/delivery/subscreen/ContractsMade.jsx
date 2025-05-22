import React, { useState, useEffect } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Button, Card, Avatar, Divider, IconButton, useTheme } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import useSnackbar from '../../../../components/hooks/useSnackbar'

const ContractsMade = () => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [currentTime, setCurrentTime] = useState('')
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const updateTime = () =>
      setCurrentTime(
        new Date().toLocaleString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Manila',
        })
      )
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('contract')
        .select(`
          *,
          contract_status:contract_status_id (status_name),
          luggage_info:luggage_information_id (
            luggage_owner_name,
            case_number,
            item_description,
            weight,
            contact_number
          )
        `)
        .eq('airline_uid', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setContracts(data || [])
    } catch (error) {
      console.error('Error fetching contracts:', error)
      showSnackbar('Error loading contracts: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const ContractCard = ({ contract }) => (
    <Card style={[styles.contractCard, { backgroundColor: colors.surface }]}>
      <Card.Content>
        <View style={styles.contractCardHeader}>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>CONTRACT ID</Text>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>{contract.id}</Text>
        </View>
        <Divider />
        <View style={styles.passengerInfoContainer}>
          <Avatar.Image
            size={40}
            source={require('../../../../assets/profile-placeholder.png')}
            style={styles.avatarImage}
          />
          <View>
            <Text style={[fonts.labelSmall, { fontWeight: 'bold', color: colors.primary }]}>
              {contract.luggage_info?.luggage_owner_name || 'N/A'}
            </Text>
            <Text style={[fonts.bodySmall, { color: colors.onSurfaceVariant }]}>
              Case #{contract.luggage_info?.case_number || 'N/A'}
            </Text>
          </View>
        </View>
        <Divider />
        <View style={styles.statusContainer}>
          <Text style={[fonts.labelSmall, styles.statusLabel]}>STATUS:</Text>
          <Text style={[fonts.bodySmall, styles.statusValue, { color: colors.primary }]}>
            {contract.contract_status?.status_name || 'Unknown'}
          </Text>
        </View>
        <Divider />
        <View style={styles.locationContainer}>
          {[
            { location: contract.pickup_location, label: 'Pickup', color: colors.primary },
            { location: contract.current_location, label: 'Current', color: colors.secondary },
            { location: contract.drop_off_location, label: 'Drop-off', color: colors.error }
          ].map((loc, idx) => (
            <View key={idx} style={styles.locationRow}>
              <IconButton icon="map-marker" size={20} iconColor={loc.color} />
              <View style={styles.locationTextContainer}>
                <Text style={[fonts.labelSmall, { color: loc.color }]}>{loc.label}</Text>
                <Text style={[fonts.bodySmall, styles.locationText]}>{loc.location || 'Not set'}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.detailsContainer}>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
            Created: {new Date(contract.created_at).toLocaleString()}
          </Text>
          <Text style={[fonts.labelSmall, { color: colors.onSurfaceVariant }]}>
            Updated: {new Date(contract.updated_at).toLocaleString()}
          </Text>
        </View>
        <Button 
          mode="contained" 
          onPress={() => console.log('Track Delivery')} 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
        >
          Track Delivery
        </Button>
        <Button 
          mode="contained" 
          onPress={() => console.log('Show Details')} 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
        >
          Show Details
        </Button>
        <Button 
          mode="contained" 
          onPress={() => console.log('Cancel')} 
          style={[styles.actionButton, { backgroundColor: colors.error }]}
        >
          Cancel Contract
        </Button>
      </Card.Content>
    </Card>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {SnackbarElement}
      <FlatList
        ListHeaderComponent={
          <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
            <Card style={[styles.timeCard, { backgroundColor: colors.surface, elevation: colors.elevation.level3 }]}>
              <Card.Content style={styles.timeCardContent}>
                <Text style={fonts.titleSmall}>{currentTime}</Text>
              </Card.Content>
            </Card>
          </View>
        }
        data={contracts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ContractCard contract={item} />}
        contentContainerStyle={styles.flatListContent}
        refreshing={loading}
        onRefresh={fetchContracts}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 16,
  },
  timeCard: {
    borderRadius: 10,
    marginVertical: 10,
    marginHorizontal: 16,
  },
  timeCardContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  contractCard: {
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 10,
    borderRadius: 12,
    elevation: 2,
  },
  contractCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  passengerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarImage: {
    marginRight: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  statusLabel: {
    fontWeight: 'bold',
  },
  statusValue: {
    fontWeight: 'bold',
  },
  locationContainer: {
    paddingVertical: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  locationText: {
    flex: 1,
  },
  detailsContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  actionButton: {
    borderRadius: 25,
    marginTop: 10,
    alignSelf: 'center',
    width: '80%',
  },
  flatListContent: {
    paddingBottom: 20,
  },
})

export default ContractsMade
