import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator 
} from 'react-native'
import { 
  Text, 
  Avatar, 
  IconButton, 
  useTheme, 
  Divider,
  Card,
  Appbar 
} from 'react-native-paper'
import { supabase } from '../../../lib/supabase'
import { useFocusEffect } from '@react-navigation/native'

const ViewMessage = ({ navigation, route }) => {
  const { colors, fonts } = useTheme()
  const { otherUserId, otherUserName } = route.params
  
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [statusMap, setStatusMap] = useState({})
  const [statusLabelById, setStatusLabelById] = useState({})
  
  const flatListRef = useRef(null)

  useEffect(() => {
    getCurrentUser()
    getOtherUser()
    fetchStatusMap()
  }, [])

  useEffect(() => {
    if (currentUser && otherUser) {
      fetchMessages()
      const unsubscribe = subscribeToMessages()
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe()
      }
    }
  }, [currentUser, otherUser])

  // When this screen is focused, mark unread incoming messages as Read (status_id = 3)
  useFocusEffect(
    useCallback(() => {
      if (!currentUser || !otherUser) return
      supabase
        .from('messages')
        .update({ status_id: 3, read_at: new Date().toISOString() })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', currentUser.id)
        .is('read_at', null)
        .then(() => {})
        .catch(() => {})
    }, [currentUser, otherUser, otherUserId])
  )

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

  const getOtherUser = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, pfp_id')
        .eq('id', otherUserId)
        .single()

      if (error) throw error
      setOtherUser(data)
    } catch (error) {
      console.error('Error getting other user:', error)
    }
  }

  // Load status_id mapping and labels from messages_status table
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
        // map id -> label for rendering
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

  const fetchMessages = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          read_at,
          status_id,
          sender_id,
          receiver_id
        `)
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])

      // Mark messages as read
      markMessagesAsRead()
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${currentUser.id}-${otherUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new
        const isRelated = (
          (msg.sender_id === currentUser.id && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === currentUser.id)
        )
        if (isRelated) {
          setMessages(prev => [...prev, msg])
          // If current user is the receiver, mark as delivered and read (since thread is open)
          if (msg.receiver_id === currentUser.id) {
            // Mark delivered immediately if mapping is available and message not already read
            if (statusMap.delivered && !msg.read_at) {
              supabase.from('messages')
                .update({ status_id: statusMap.delivered })
                .eq('id', msg.id)
                .then(() => {})
                .catch(() => {})
            }
            // Since user is viewing this thread, mark as read
            markMessagesAsRead()
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const updated = payload.new
        const isRelated = (
          (updated.sender_id === currentUser.id && updated.receiver_id === otherUserId) ||
          (updated.sender_id === otherUserId && updated.receiver_id === currentUser.id)
        )
        if (isRelated) {
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markMessagesAsRead = async () => {
    try {
      const updatePayload = { read_at: new Date().toISOString() }
      // Only set status_id when we have an ID for "Read"
      if (statusMap.read) {
        updatePayload.status_id = statusMap.read
      }

      const { error } = await supabase
        .from('messages')
        .update(updatePayload)
        .eq('sender_id', otherUserId)
        .eq('receiver_id', currentUser.id)
        .is('read_at', null)

      if (error) throw error
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !otherUser) return

    try {
      setSending(true)
      
      const insertPayload = {
        sender_id: currentUser.id,
        receiver_id: otherUser.id,
        content: newMessage.trim(),
      }
      // If we have a mapping for "Sent", use it; otherwise, rely on DB default
      if (statusMap.sent) {
        insertPayload.status_id = statusMap.sent
      }

      const { error } = await supabase
        .from('messages')
        .insert(insertPayload)

      if (error) throw error
      
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getAvatarSource = (user) => {
    if (user?.pfp_id) {
      return { uri: user.pfp_id }
    }
    return require('../../../assets/profile-placeholder.png')
  }

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender_id === currentUser?.id
    const showStatus = isOwnMessage
    const getStatusLabel = () => {
      if (item.read_at) {
        if (statusMap.read) return statusLabelById[statusMap.read]
        if (item.status_id) return statusLabelById[item.status_id] || ''
        return ''
      }
      const mapped = item.status_id ? statusLabelById[item.status_id] : undefined
      return mapped || ''
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        <Card style={[
          styles.messageCard,
          {
            backgroundColor: isOwnMessage ? colors.primary : colors.surfaceVariant,
            alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
            maxWidth: '80%'
          }
        ]}>
          <Card.Content style={styles.messageContent}>
            <Text selectable style={[
              styles.messageText,
              { 
                color: isOwnMessage ? colors.onPrimary : colors.onSurfaceVariant,
                ...fonts.default
              }
            ]}>
              {item.content}
            </Text>
            <View style={styles.messageMetaRow}>
              <Text style={[
                styles.messageTime,
                { 
                  color: isOwnMessage ? colors.onPrimary : colors.onSurfaceVariant,
                  ...fonts.labelSmall
                }
              ]}>
                {formatTime(item.created_at)}
              </Text>
              {showStatus && (
                <Text style={[
                  styles.messageStatus,
                  { color: isOwnMessage ? colors.onPrimary : colors.onSurfaceVariant, ...fonts.labelSmall }
                ]}>
                  {getStatusLabel()}
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.onBackground, marginTop: 16 }}>Loading messages...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Appbar.Header style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction color={colors.primary} onPress={() => navigation.navigate('MessagesHome')} />
        <Appbar.Content title={otherUserName} titleStyle={{ ...fonts.titleLarge, color: colors.onBackground, fontWeight: 'bold' }} />
        <TouchableOpacity onPress={() => navigation.navigate('ViewProfile', { userId: otherUserId })} style={{ marginRight: 12 }}>
          <Avatar.Image size={40} source={getAvatarSource(otherUser)} />
        </TouchableOpacity>
      </Appbar.Header>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />
      
      <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
      
      <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: colors.surfaceVariant,
              color: colors.onSurfaceVariant,
              borderColor: colors.outline,
              ...fonts.default
            }
          ]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.onSurfaceVariant}
          multiline
          maxLength={1000}
        />
        <IconButton
          icon="send"
          size={24}
          disabled={!newMessage.trim() || sending}
          onPress={sendMessage}
          style={[
            styles.sendButton,
            { 
              backgroundColor: newMessage.trim() ? colors.primary : colors.surfaceVariant 
            }
          ]}
          iconColor={newMessage.trim() ? colors.onPrimary : colors.onSurfaceVariant}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    marginRight: 16,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageCard: {
    elevation: 1,
  },
  messageContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  messageText: {
    marginBottom: 4,
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  messageTime: {
    alignSelf: 'flex-end',
  },
  messageStatus: {
    alignSelf: 'flex-end',
  },
  divider: {
    marginHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    margin: 0,
  },
})

export default ViewMessage
