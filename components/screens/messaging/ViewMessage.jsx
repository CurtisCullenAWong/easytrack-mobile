import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import {
  Text,
  Avatar,
  IconButton,
  useTheme,
  Divider,
  Card,
  Appbar,
  Icon,
} from "react-native-paper"
import { supabase } from "../../../lib/supabase"
import { useFocusEffect } from "@react-navigation/native"

const ViewMessage = ({ navigation, route }) => {
  const { colors, fonts } = useTheme()
  const { otherUserId, otherUserName } = route.params

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [statusMap, setStatusMap] = useState({})
  const [statusLabelById, setStatusLabelById] = useState({})

  const flatListRef = useRef(null)

  // ------------------------------
  // LIFECYCLE
  // ------------------------------
  useEffect(() => {
    getCurrentUser()
    getOtherUser()
    fetchStatusMap()
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (currentUser && otherUser) {
        fetchMessages()
        const unsubscribe = subscribeToMessages()
        return () => {
          if (typeof unsubscribe === "function") unsubscribe()
        }
      }
    }, [currentUser, otherUser])
  )

  // Mark unread messages as read when opening chat
  useFocusEffect(
    useCallback(() => {
      if (!currentUser || !otherUser || !statusMap.read) return
      supabase
        .from("messages")
        .update({ status_id: statusMap.read, read_at: new Date().toISOString() })
        .eq("sender_id", otherUserId)
        .eq("receiver_id", currentUser.id)
        .is("read_at", null)
    }, [currentUser, otherUser, otherUserId, statusMap.read])
  )

  // ------------------------------
  // DATA FETCH
  // ------------------------------
  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) setCurrentUser(user)
    } catch (error) {
      console.error("Error getting current user:", error)
    }
  }

  const getOtherUser = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, pfp_id")
        .eq("id", otherUserId)
        .single()

      if (error) throw error
      setOtherUser(data)
    } catch (error) {
      console.error("Error getting other user:", error)
    }
  }

  const fetchStatusMap = async () => {
    try {
      const { data, error } = await supabase
        .from("messages_status")
        .select("id, status")
      if (error) throw error

      const map = {}
      const labels = {}
      (data || []).forEach((row) => {
        labels[row.id] = row.status
        // Map specific status IDs: 1 = sent, 2 = delivered, 3 = read
        if (row.id === 1) map.sent = row.id
        if (row.id === 2) map.delivered = row.id
        if (row.id === 3) map.read = row.id
      })

      setStatusMap(map)
      setStatusLabelById(labels)
    } catch (_) {
      // keep defaults
    }
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          read_at,
          status_id,
          sender_id,
          receiver_id
        `)
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
        )
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages(data || [])

      markMessagesAsRead()
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  // ------------------------------
  // REALTIME UPDATES
  // ------------------------------
  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${currentUser.id}-${otherUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new
          const isRelated =
            (msg.sender_id === currentUser.id &&
              msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId &&
              msg.receiver_id === currentUser.id)

          if (isRelated) {
            setMessages((prev) => [...prev, msg])

            if (msg.receiver_id === currentUser.id) {
              if (!msg.read_at) {
                // Use fallback value if status map is not loaded: 2 = delivered
                const deliveredStatus = statusMap.delivered || 2
                supabase
                  .from("messages")
                  .update({ status_id: deliveredStatus })
                  .eq("id", msg.id)
              }
              markMessagesAsRead()
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new
          const isRelated =
            (updated.sender_id === currentUser.id &&
              updated.receiver_id === otherUserId) ||
            (updated.sender_id === otherUserId &&
              updated.receiver_id === currentUser.id)

          if (isRelated) {
            setMessages((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
            )
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  // ------------------------------
  // HELPERS
  // ------------------------------
  const markMessagesAsRead = async () => {
    try {
      const payload = { read_at: new Date().toISOString() }
      // Use fallback value if status map is not loaded: 3 = read
      payload.status_id = statusMap.read || 3

      await supabase
        .from("messages")
        .update(payload)
        .eq("sender_id", otherUserId)
        .eq("receiver_id", currentUser.id)
        .is("read_at", null)
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !otherUser) return
    try {
      setSending(true)
      const payload = {
        sender_id: currentUser.id,
        receiver_id: otherUser.id,
        content: newMessage.trim(),
      }
      // Use fallback value if status map is not loaded: 1 = sent
      payload.status_id = statusMap.sent || 1

      await supabase.from("messages").insert(payload)
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

  const formatDateHeader = (timestamp) => {
    const today = new Date()
    const date = new Date(timestamp)

    const isToday =
      date.toDateString() === new Date().toDateString()
    const isYesterday =
      date.toDateString() ===
      new Date(today.setDate(today.getDate() - 1)).toDateString()

    if (isToday) return "Today"
    if (isYesterday) return "Yesterday"

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getAvatarSource = (user) =>
    user?.pfp_id
      ? { uri: user.pfp_id }
      : null

  const getStatusColor = (statusId, colors, isOwn) => {
    if (!isOwn) return colors.onSurfaceVariant
    
    switch (statusId) {
      case 1: // Sent
        return colors.onPrimary
      case 2: // Delivered
        return colors.onPrimary
      case 3: // Read
        return colors.onPrimary
      default:
        return colors.onPrimary
    }
  }

  const getStatusIcon = (statusId, isOwn) => {
    if (!isOwn) return null
    
    switch (statusId) {
      case 1: // Sent
        return "check"
      case 2: // Delivered
        return "check-all"
      case 3: // Read
        return "check-all"
      default:
        return null
    }
  }

  // ------------------------------
  // RENDER
  // ------------------------------
  const renderMessage = ({ item, index }) => {
    const isOwn = item.sender_id === currentUser?.id
    const prev = messages[index - 1]
    const showDateHeader =
      !prev ||
      formatDateHeader(prev.created_at) !==
        formatDateHeader(item.created_at)

    const getStatusLabel = () => {
      if (item.read_at) return statusLabelById[statusMap.read] || "Read"
      return item.status_id ? statusLabelById[item.status_id] || "" : ""
    }

    const getCurrentStatusId = () => {
      if (item.read_at) return statusMap.read || 3
      return item.status_id || 1
    }

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={[styles.dateHeaderText, { color: colors.onSurfaceVariant }]}>
              {formatDateHeader(item.created_at)}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
          ]}
        >
          <Card
            style={[
              styles.messageCard,
              {
                backgroundColor: isOwn ? colors.primary : colors.surfaceVariant,
                alignSelf: isOwn ? "flex-end" : "flex-start",
                maxWidth: "80%",
              },
            ]}
          >
            <Card.Content style={styles.messageContent}>
              <Text
                selectable
                style={[
                  styles.messageText,
                  {
                    color: isOwn ? colors.onPrimary : colors.onSurfaceVariant,
                    ...fonts.default,
                  },
                ]}
              >
                {item.content}
              </Text>
              <View style={styles.messageMetaRow}>
                <Text
                  style={[
                    styles.messageTime,
                    {
                      color: isOwn ? colors.onPrimary : colors.onSurfaceVariant,
                      ...fonts.labelSmall,
                    },
                  ]}
                >
                  {formatTime(item.created_at)}
                </Text>
                {getStatusLabel() && (
                  <View style={styles.statusContainer}>
                    {getStatusIcon(getCurrentStatusId(), isOwn) && (
                      <Icon
                        source={getStatusIcon(getCurrentStatusId(), isOwn)}
                        size={12}
                        color={getStatusColor(getCurrentStatusId(), colors, isOwn)}
                        style={styles.statusIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.messageStatus,
                        {
                          color: getStatusColor(getCurrentStatusId(), colors, isOwn),
                          ...fonts.labelSmall,
                        },
                      ]}
                    >
                      {getStatusLabel()}
                    </Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        </View>
      </>
    )
  }

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.onBackground, marginTop: 16 }}>
          Loading messages...
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Appbar.Header style={{ backgroundColor: colors.background }}>
        <Appbar.BackAction
          color={colors.primary}
          onPress={() => navigation.navigate("MessagesHome")}
        />
        <Appbar.Content
          title={otherUserName}
          titleStyle={{
            ...fonts.titleLarge,
            color: colors.onBackground,
            fontWeight: "bold",
          }}
        />
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ViewProfile", { userId: otherUserId })
          }
          style={{ marginRight: 12 }}
        >
          {getAvatarSource(otherUser) ? (
            <Avatar.Image size={40} source={getAvatarSource(otherUser)} />
          ) : (
            <Avatar.Text 
              size={40} 
              label={otherUser?.first_name ? otherUser.first_name[0].toUpperCase() : 'U'}
              style={{ backgroundColor: colors.primary }}
              labelStyle={{ color: colors.onPrimary }}
            />
          )}
        </TouchableOpacity>
      </Appbar.Header>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
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
              ...fonts.default,
            },
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
              backgroundColor: newMessage.trim()
                ? colors.primary
                : colors.surfaceVariant,
            },
          ]}
          iconColor={newMessage.trim() ? colors.onPrimary : colors.onSurfaceVariant}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

// ------------------------------
// STYLES
// ------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  messagesList: { flex: 1 },
  messagesContent: { paddingVertical: 16, paddingHorizontal: 16 },

  dateHeader: { alignItems: "center", marginVertical: 10 },
  dateHeaderText: { fontSize: 12, fontWeight: "600" },

  messageContainer: { marginVertical: 4 },
  ownMessageContainer: { alignItems: "flex-end" },
  otherMessageContainer: { alignItems: "flex-start" },

  messageCard: { elevation: 1 },
  messageContent: { paddingVertical: 8, paddingHorizontal: 12 },
  messageText: { marginBottom: 4 },

  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  messageTime: { alignSelf: "flex-end" },
  statusContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4 
  },
  messageStatus: { alignSelf: "flex-end" },
  statusIcon: { marginRight: 2 },

  divider: { marginHorizontal: 16 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
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
  sendButton: { margin: 0 },
})

export default ViewMessage
