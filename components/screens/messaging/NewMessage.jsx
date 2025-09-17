import React, { useEffect, useState } from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { Text, Avatar, Card, TextInput, useTheme, ActivityIndicator, Divider, Appbar } from 'react-native-paper'
import { supabase } from '../../../lib/supabase'

const NewMessage = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [search, setSearch] = useState('')
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchProfiles()
    }
  }, [currentUser])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser(user)
    } catch (e) {
      console.error('Error getting user', e)
    }
  }

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          pfp_id,
          email,
          role_id,
          roles:role_id ( role_name )
        `)
        .neq('id', currentUser.id)
        .order('first_name', { ascending: true })
  
      const { data, error } = await query
      if (error) throw error
      setProfiles(data || [])
    } catch (e) {
      console.error('Error fetching profiles', e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = profiles.filter(p => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase()
    return fullName.includes(q) || (p.email || '').toLowerCase().includes(q)
  })

  const getDisplayName = (p) => {
    if (p.first_name && p.last_name) return `${p.first_name} ${p.last_name}`
    if (p.first_name) return p.first_name
    return p.email || 'Unknown User'
  }

  const getAvatar = (p) => {
    if (p.pfp_id) return { uri: p.pfp_id }
    return null
  }

  const openChat = (p) => {
    navigation.navigate('ViewMessage', { otherUserId: p.id, otherUserName: getDisplayName(p) })
  }

  const renderItem = ({ item, index }) => (
    <View>
      <TouchableOpacity onPress={() => openChat(item)}>
        <Card style={[styles.card, { backgroundColor: colors.surface, elevation: colors.elevation?.level1 || 1 }]}>
          <Card.Content style={styles.row}>
            {getAvatar(item) ? (
              <Avatar.Image size={44} source={getAvatar(item)} />
            ) : (
              <Avatar.Text 
                size={44} 
                label={item?.first_name ? item.first_name[0].toUpperCase() : 'U'}
                style={{ backgroundColor: colors.primary }}
                labelStyle={{ color: colors.onPrimary }}
              />
            )}
            <View style={styles.info}>
              <Text selectable style={[{ color: colors.onSurface }, fonts.titleMedium]}>{getDisplayName(item)}</Text>
              {item.email ? (
              <Text selectable style={[{ color: colors.onSurfaceVariant }, fonts.bodySmall]}>
              {item.email}
              {item.roles?.role_name ? ` • ${item.roles.role_name}` : ""}
              </Text>
              ) : null}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
      {index !== filtered.length - 1 && <Divider style={{ marginHorizontal: 10 }} />}
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction color={colors.primary} onPress={() => navigation.goBack()} />
        <Appbar.Content title="New Message" titleStyle={{ ...fonts.titleLarge, color: colors.onBackground, fontWeight: 'bold' }} />
      </Appbar.Header>

      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email"
          placeholderTextColor={colors.onSurfaceVariant}
          style={[styles.search, { backgroundColor: colors.surface, color: colors.onSurface }]}
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContent}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ marginTop: 8, color: colors.onBackground }}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { paddingHorizontal: 12, paddingVertical: 10 },
  search: { borderRadius: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { marginLeft: 12, flex: 1 },
  card: { marginHorizontal: 10, marginVertical: 4 },
})

export default NewMessage
