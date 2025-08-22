import React, { useState, useEffect, useCallback } from "react"
import { useFocusEffect } from "@react-navigation/native"
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native"
import {
  Avatar,
  Card,
  Text,
  Divider,
  useTheme,
  ActivityIndicator,
  FAB,
  TextInput,
} from "react-native-paper"
import { supabase } from "../../../lib/supabase"
import Header from "../../customComponents/Header"

// --- Helper Functions ---
const formatTime = (timestamp) => {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now - date) / (1000 * 60 * 60)

  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  if (diffInHours < 48) return "Yesterday"
  return date.toLocaleDateString()
}

const getDisplayName = (user) =>
  user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.first_name || "Unknown User"

const getAvatarSource = (user) =>
  user?.pfp_id
    ? { uri: user.pfp_id }
    : require("../../../assets/profile-placeholder.png")

// --- UI Components ---
const EmptyState = ({ title, subtitle, colors }) => (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyText, { color: colors.onBackground }]}>
      {title}
    </Text>
    <Text style={[styles.emptySubtext, { color: colors.onSurfaceVariant }]}>
      {subtitle}
    </Text>
  </View>
)

const ConversationCard = ({
  conversation,
  navigation,
  colors,
  fonts,
  index,
  total,
}) => (
  <View key={conversation.id}>
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("ViewMessage", {
          otherUserId: conversation.id,
          otherUserName: getDisplayName(conversation.otherUser),
        })
      }
    >
      <Card
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            elevation: colors.elevation?.level2 || 2,
          },
        ]}
      >
        <Card.Content style={styles.cardContent}>
          <Avatar.Image size={48} source={getAvatarSource(conversation.otherUser)} />
          <View style={styles.cardTextContainer}>
            <Text
              style={[
                styles.nameText,
                { color: colors.onSurface, ...fonts.titleMedium },
              ]}
            >
              {getDisplayName(conversation.otherUser)}
            <Text
              style={[
                { color: colors.onSurfaceVariant, ...fonts.bodySmall }
              ]}
            >
              {' • '+conversation.otherUser?.roles?.role_name || ""}
            </Text>
            </Text>
            
            <View style={styles.previewRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.lastMessage,
                  {
                    color: conversation.isRead
                      ? colors.onSurfaceVariant
                      : colors.onSurface,
                    fontWeight: conversation.isRead ? "normal" : "bold",
                    ...fonts.default,
                  },
                ]}
              >
                {conversation.lastMessage}
              </Text>

              {!!conversation.lastStatus && conversation.isOwnLast && (
                <Text
                  style={[
                    styles.statusText,
                    { color: colors.onSurfaceVariant, ...fonts.labelSmall },
                  ]}
                >
                  {conversation.lastStatus}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.metaContainer}>
            <Text
              style={[
                styles.timeText,
                { color: colors.onSurfaceVariant, ...fonts.labelMedium },
              ]}
            >
              {formatTime(conversation.lastMessageTime)}
            </Text>

            <View
              style={[
                styles.readIndicator,
                {
                  backgroundColor:
                    conversation.unreadCount > 0
                      ? colors.primary
                      : colors.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.readIndicatorText,
                  {
                    color:
                      conversation.unreadCount > 0
                        ? colors.onPrimary
                        : colors.onSurfaceVariant,
                  },
                ]}
              >
                {conversation.unreadCount > 0 ? conversation.unreadCount : ""}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>

    {index !== total - 1 && (
      <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
    )}
  </View>
)

// --- Main Component ---
const Messages = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [statusMap, setStatusMap] = useState({})
  const [statusLabelById, setStatusLabelById] = useState({})
  const [search, setSearch] = useState("")

  useEffect(() => {
    getCurrentUser()
    fetchStatusMap()
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!currentUser) return
      markSentAsDeliveredForMe().finally(fetchConversations)
      const unsubscribe = subscribeToMessages()
      return () => unsubscribe?.()
    }, [currentUser])
  )

  // --- API Calls ---
  const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser()
    if (data?.user) setCurrentUser(data.user)
    if (error) console.error(error)
  }

  const fetchStatusMap = async () => {
    try {
      const { data } = await supabase.from("messages_status").select("id, status")
      if (!data) return
      const labels = {}
      const map = {}
      data.forEach((row) => {
        labels[row.id] = row.status
        const key = row.status.toLowerCase()
        if (key.includes("sent")) map.sent = row.id
        if (key.includes("deliver")) map.delivered = row.id
        if (key.includes("read") || key.includes("seen")) map.read = row.id
      })
      setStatusLabelById(labels)
      setStatusMap(map)
    } catch (e) {
      console.error("Status map error:", e)
    }
  }

  const fetchConversations = async () => {
    if (!currentUser) return
    try {
      setLoading(true)
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`
          id, content, created_at, read_at, status_id, sender_id, receiver_id,
          sender:sender_id (
            id, first_name, last_name, pfp_id, role_id,
            roles:role_id ( role_name )
          ),
          receiver:receiver_id (
            id, first_name, last_name, pfp_id, role_id,
            roles:role_id ( role_name )
          )
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false })
  
      if (error) throw error
      setConversations(buildConversationMap(messages))
    } catch (e) {
      console.error("Fetch conversations error:", e)
    } finally {
      setLoading(false)
    }
  }

  const markSentAsDeliveredForMe = async () => {
    try {
      await supabase
        .from("messages")
        .update({ status_id: statusMap.delivered })
        .eq("receiver_id", currentUser.id)
        .eq("status_id", statusMap.sent)
    } catch (e) {
      console.error("Delivery update error:", e)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${currentUser.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () =>
        fetchConversations()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  // --- Helpers ---
  const buildConversationMap = (messages) => {
    const map = new Map()
    messages.forEach((msg) => {
      const otherUserId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id
      const otherUser = msg.sender_id === currentUser.id ? msg.receiver : msg.sender
      const isOwn = msg.sender_id === currentUser.id
      const isUnread = msg.receiver_id === currentUser.id && !msg.read_at
      const statusLabel = statusLabelById[msg.status_id] || ""

      if (!map.has(otherUserId)) {
        map.set(otherUserId, {
          id: otherUserId,
          otherUser,
          lastMessage: msg.content,
          lastMessageTime: msg.created_at,
          isOwnLast: isOwn,
          isRead: !isUnread,
          unreadCount: isUnread ? 1 : 0,
          lastStatus: isOwn ? statusLabel : "",
        })
      } else {
        const convo = map.get(otherUserId)
        if (new Date(msg.created_at) > new Date(convo.lastMessageTime)) {
          Object.assign(convo, {
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            isOwnLast: isOwn,
            isRead: !isUnread,
            lastStatus: isOwn ? statusLabel : "",
          })
        }
        if (isUnread) convo.unreadCount++
      }
    })
    return Array.from(map.values())
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchConversations()
    setRefreshing(false)
  }

  // --- Filters ---
  const filtered = conversations.filter((c) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      getDisplayName(c.otherUser).toLowerCase().includes(q) ||
      (c.lastMessage || "").toLowerCase().includes(q)
    )
  })

  // --- Render ---
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.onBackground, marginTop: 16 }}>
          Loading conversations...
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header navigation={navigation} title="Messages" />

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or message"
          placeholderTextColor={colors.onSurfaceVariant}
          style={[styles.search, { backgroundColor: colors.surface }]}
        />
      </View>

      {/* Conversations */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 88 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <EmptyState
            title={conversations.length === 0 ? "No conversations yet" : "No matches"}
            subtitle={
              conversations.length === 0
                ? "Start a conversation by messaging someone"
                : "Try a different search"
            }
            colors={colors}
          />
        ) : (
          filtered.map((c, i) => (
            <ConversationCard
              key={c.id}
              conversation={c}
              navigation={navigation}
              colors={colors}
              fonts={fonts}
              index={i}
              total={filtered.length}
            />
          ))
        )}
      </ScrollView>

      <FAB
        icon="message-plus"
        onPress={() => navigation.navigate("NewMessage")}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  searchWrap: { paddingHorizontal: 12, paddingVertical: 8 },
  search: { borderRadius: 10 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  emptySubtext: { fontSize: 14, textAlign: "center" },
  card: { marginVertical: 4, marginHorizontal: 10 },
  cardContent: { flexDirection: "row", alignItems: "center" },
  cardTextContainer: { marginLeft: 12, flex: 1 },
  nameText: { flex: 1 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  metaContainer: { alignItems: "flex-end", justifyContent: "center", marginLeft: 8, gap: 6 },
  readIndicator: { borderRadius: 10, paddingHorizontal: 8, height: 20, justifyContent: "center" },
  readIndicatorText: { fontSize: 12, fontWeight: "bold" },
  lastMessage: { flex: 1 },
  timeText: { marginLeft: 8 },
  divider: { marginHorizontal: 10 },
  fab: { position: "absolute", right: 16, bottom: 24 },
})

export default Messages