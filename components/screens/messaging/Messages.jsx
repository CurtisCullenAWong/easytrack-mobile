import React, { useState, useEffect } from 'react'
import { ScrollView, View, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { Avatar, Card, Text, Divider, useTheme, ActivityIndicator, FAB, TextInput } from 'react-native-paper'
import { supabase } from '../../../lib/supabase'
import Header from '../../customComponents/Header'
const Messages = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [statusMap, setStatusMap] = useState({})
  const [statusLabelById, setStatusLabelById] = useState({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    getCurrentUser()
    fetchStatusMap()
  }, [])

  useEffect(() => {
    if (currentUser) {
      // Set status_id to 2 for all messages sent to me that are still in status 1
      const markSentAsDeliveredForMe = async () => {
        try {
          await supabase
            .from('messages')
            .update({ status_id: 2 })
            .eq('receiver_id', currentUser.id)
            .eq('status_id', 1)
        } catch (_) {
          // no-op
        }
      }

      markSentAsDeliveredForMe().finally(() => {
        fetchConversations()
      })
      const unsubscribe = subscribeToMessages()
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe()
      }
    }
  }, [currentUser])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
      }
    } catch (error) {
      console.error('Error getting current user:', error)
    }
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      
      // Get conversations where current user is either sender or receiver
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          read_at,
          status_id,
          sender_id,
          receiver_id,
          sender:sender_id(id, first_name, last_name, pfp_id),
          receiver:receiver_id(id, first_name, last_name, pfp_id)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group messages by conversation (other user)
      const conversationMap = new Map()

      messages.forEach(message => {
        const otherUserId = message.sender_id === currentUser.id
          ? message.receiver_id
          : message.sender_id

        const otherUser = message.sender_id === currentUser.id
          ? message.receiver
          : message.sender

        const isOwn = message.sender_id === currentUser.id

        // Determine read and status label for this message
          const isMessageUnreadForMe = message.receiver_id === currentUser.id && !message.read_at
          const messageStatusLabel = message.read_at
            ? (
                statusMap.read
                  ? statusLabelById[statusMap.read]
                  : (message.status_id ? (statusLabelById[message.status_id] || '') : '')
              )
            : (message.status_id ? (statusLabelById[message.status_id] || '') : '')

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: otherUserId,
            otherUser,
            lastMessage: message.content,
            lastMessageTime: message.created_at,
            isOwnLast: isOwn,
            // if the latest known message is to me and unread, conversation is unread
            isRead: !isMessageUnreadForMe,
            // track unread count per conversation
            unreadCount: isMessageUnreadForMe ? 1 : 0,
            // only show status for my own last message
            lastStatus: isOwn ? messageStatusLabel : ''
          })
        } else {
          const conversation = conversationMap.get(otherUserId)
          // update last message metadata if this message is newer
          if (new Date(message.created_at) > new Date(conversation.lastMessageTime)) {
            conversation.lastMessage = message.content
            conversation.lastMessageTime = message.created_at
            conversation.isOwnLast = isOwn
            conversation.isRead = !isMessageUnreadForMe
            conversation.lastStatus = isOwn ? messageStatusLabel : ''
          }
          // accumulate unread count regardless of recency
          if (isMessageUnreadForMe) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1
          }
        }
      })

      setConversations(Array.from(conversationMap.values()))
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to realtime changes for messages related to the current user
  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-conversations-${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new
        const isRelated = msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id
        if (!isRelated) return

        // If current user is the receiver, mark as delivered immediately
        if (msg.receiver_id === currentUser.id && statusMap.delivered && msg.status_id !== statusMap.delivered && !msg.read_at) {
          try {
            await supabase.from('messages').update({ status_id: statusMap.delivered }).eq('id', msg.id)
          } catch (_) {}
        }

        // Refresh conversations to update preview, unread counts, and status badges
        fetchConversations()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const updated = payload.new
        const isRelated = updated.sender_id === currentUser.id || updated.receiver_id === currentUser.id
        if (!isRelated) return
        fetchConversations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  // Load status_id mapping from messages_status table
  const fetchStatusMap = async () => {
    try {
      const { data, error } = await supabase
        .from('messages_status')
        .select('id, status')
      if (error) throw error
      const next = { ...statusMap }
      const nextLabels = { ...statusLabelById }
      ;(data || []).forEach(row => {
        const key = (row.status || '').toLowerCase()
        nextLabels[row.id] = row.status || nextLabels[row.id] || ''
        if (key.includes('sent')) next.sent = row.id
        if (key.includes('deliver')) next.delivered = row.id
        if (key.includes('read') || key.includes('seen')) next.read = row.id
      })
      setStatusMap(next)
      setStatusLabelById(nextLabels)
    } catch (_) {
      // keep defaults on failure
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchConversations()
    setRefreshing(false)
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const getDisplayName = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    } else if (user.first_name) {
      return user.first_name
    } else {
      return 'Unknown User'
    }
  }

  const getAvatarSource = (user) => {
    if (user.pfp_id) {
      return { uri: user.pfp_id }
    }
    return require('../../../assets/profile-placeholder.png')
  }

  const filteredConversations = conversations.filter((conversation) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const name = getDisplayName(conversation.otherUser).toLowerCase()
    const last = (conversation.lastMessage || '').toLowerCase()
    return name.includes(q) || last.includes(q)
  })

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.onBackground, marginTop: 16 }}>Loading conversations...</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header navigation={navigation} title={'Messages'} />
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or message"
          placeholderTextColor={colors.onSurfaceVariant}
          style={[styles.search, { backgroundColor: colors.surface, color: colors.onSurface }]}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 88 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.onBackground }]}>
              No conversations yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.onSurfaceVariant }]}>
              Start a conversation by messaging someone
            </Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.onBackground }]}>No matches</Text>
            <Text style={[styles.emptySubtext, { color: colors.onSurfaceVariant }]}>Try a different search</Text>
          </View>
        ) : (
          filteredConversations.map((conversation, index) => (
            <View key={conversation.id}>
              <TouchableOpacity 
                onPress={() => navigation.navigate('ViewMessage', { 
                  otherUserId: conversation.id,
                  otherUserName: getDisplayName(conversation.otherUser)
                })}
              >
                <Card style={[styles.card, { backgroundColor: colors.surface, elevation: colors.elevation?.level2 || 2 }]}>
                  <Card.Content style={styles.cardContent}>
                    <Avatar.Image 
                      size={48} 
                      source={getAvatarSource(conversation.otherUser)} 
                    />
                    <View style={styles.cardTextContainer}>
                      <View style={styles.nameContainer}>
                        <Text style={[styles.nameText, { color: colors.onSurface, ...fonts.titleMedium }]}>
                          {getDisplayName(conversation.otherUser)}
                        </Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text 
                          selectable
                          numberOfLines={1} 
                          style={[
                            styles.lastMessage, 
                            { 
                              color: conversation.isRead ? colors.onSurfaceVariant : colors.onSurface,
                              fontWeight: conversation.isRead ? 'normal' : 'bold',
                              ...fonts.default 
                            }
                          ]}
                        >
                          {conversation.lastMessage}
                        </Text>
                        {!!conversation.lastStatus && conversation.isOwnLast && (
                          <Text style={[styles.statusText, { color: colors.onSurfaceVariant, ...fonts.labelSmall }]}>
                            {conversation.lastStatus}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.metaContainer}>
                      <Text style={[styles.timeText, { color: colors.onSurfaceVariant, ...fonts.labelMedium }]}>
                        {formatTime(conversation.lastMessageTime)}
                      </Text>
                      <View
                        style={[
                          styles.readIndicator,
                          { backgroundColor: conversation.unreadCount > 0 ? colors.primary : colors.surfaceVariant },
                        ]}
                      >
                        <Text
                          style={[
                            styles.readIndicatorText,
                            { color: conversation.unreadCount > 0 ? colors.onPrimary : colors.onSurfaceVariant },
                          ]}
                        >
                          {conversation.unreadCount > 0 ? String(conversation.unreadCount) : ''}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
              {index !== filteredConversations.length - 1 && (
                <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
              )}
            </View>
          ))
        )}
      </ScrollView>

      <FAB
        icon="message-plus"
        onPress={() => navigation.navigate('NewMessage')}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 10,
  },
  searchWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  search: {
    borderRadius: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    marginVertical: 4,
    marginHorizontal: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameText: {
    flex: 1,
  },
  metaContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    marginLeft: 8,
  },
  readIndicator: {
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  readIndicatorText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastMessage: {
    marginTop: 4,
  },
  previewRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeText: {
    marginLeft: 8,
  },
  divider: {
    marginHorizontal: 10,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
})

export default Messages