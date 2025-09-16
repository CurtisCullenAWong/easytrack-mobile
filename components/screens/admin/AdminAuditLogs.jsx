import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { ScrollView, View, RefreshControl, StyleSheet } from 'react-native'
import { DataTable, Text, useTheme, Surface, Searchbar, Menu, Button, ActivityIndicator, Portal, Dialog } from 'react-native-paper'
import Header from '../../customComponents/Header'
import useSnackbar from '../../hooks/useSnackbar'
import { supabase } from '../../../lib/supabaseAdmin'

const COLUMN_WIDTH = 180

const AdminAuditLogs = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [logs, setLogs] = useState([])
  const [page, setPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('table_name')
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)

  const [eventMenuVisible, setEventMenuVisible] = useState(false)
  const [eventFilter, setEventFilter] = useState('all')

  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('descending')

  // Details modal state
  const [detailsVisible, setDetailsVisible] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [actionByLoading, setActionByLoading] = useState(false)
  const [actionByInfo, setActionByInfo] = useState(null)

  const filterOptions = [
    { label: 'Table', value: 'table_name' },
    { label: 'Event', value: 'event_type' },
    { label: 'Action By', value: 'action_by' },
  ]

  const eventOptions = [
    { label: 'All Events', value: 'all' },
    { label: 'INSERT', value: 'INSERT' },
    { label: 'UPDATE', value: 'UPDATE' },
    { label: 'DELETE', value: 'DELETE' },
  ]

  const columns = [
    { key: 'id', label: 'ID', width: 100 },
    { key: 'table_name', label: 'Table', width: 160 },
    { key: 'event_type', label: 'Event', width: 120 },
    { key: 'created_at', label: 'Created At', width: 200 },
    { key: 'action_by', label: 'Action By', width: 230 },
  ]

  const formatLog = (log) => ({
    id: log.id,
    table_name: log.table_name,
    event_type: log.event_type,
    created_at: log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A',
    action_by: log.action_by || 'System',
    action_by_uuid: log.action_by || null,
    row_data: log.row_data,
    old_data: log.old_data,
  })

  const fetchLogs = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      const { data, error } = await query
      if (error) throw error

      setLogs((data || []).map(formatLog))
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      showSnackbar('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchLogs().finally(() => setRefreshing(false))
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [])

  // Realtime subscription to audit_logs
  useEffect(() => {
    const channel = supabase
      .channel('audit_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (payload) => {
        // Update list optimistically for small volumes; otherwise refetch
        setLogs((prev) => {
          const formatted = formatLog(payload.new || payload.old)
          if (payload.eventType === 'INSERT') {
            return [formatted, ...prev].slice(0, 500)
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map((l) => (l.id === formatted.id ? formatted : l))
          }
          if (payload.eventType === 'DELETE') {
            return prev.filter((l) => l.id !== (payload.old?.id))
          }
          return prev
        })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSort = (column) => {
    setSortDirection(prev => (sortColumn === column && prev === 'ascending' ? 'descending' : 'ascending'))
    setSortColumn(column)
  }

  const getSortIcon = (column) => (sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : '')

  const filteredAndSortedLogs = useMemo(() => {
    const filtered = logs.filter((log) => {
      if (eventFilter !== 'all' && log.event_type !== eventFilter) return false
      if (searchQuery) {
        const searchValue = String(log[searchColumn] || '').toLowerCase()
        const query = searchQuery.toLowerCase()
        if (!searchValue.includes(query)) return false
      }
      return true
    })

    const sorted = [...filtered].sort((a, b) => {
      const valA = a[sortColumn]
      const valB = b[sortColumn]

      if (sortColumn === 'created_at') {
        if (valA === 'N/A') return sortDirection === 'ascending' ? -1 : 1
        if (valB === 'N/A') return sortDirection === 'ascending' ? 1 : -1
        return sortDirection === 'ascending'
          ? new Date(valA) - new Date(valB)
          : new Date(valB) - new Date(valA)
      }

      if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
      if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
      return 0
    })

    return sorted
  }, [logs, eventFilter, searchQuery, searchColumn, sortColumn, sortDirection])

  const from = page * itemsPerPage
  const to = Math.min((page + 1) * itemsPerPage, filteredAndSortedLogs.length)
  const paginatedLogs = filteredAndSortedLogs.slice(from, to)

  const openDetails = async (log) => {
    setSelectedLog(log)
    setActionByInfo(null)
    setDetailsVisible(true)

    if (!log.action_by_uuid) return

    try {
      setActionByLoading(true)

      // Fetch email using Admin API (GoTrue)
      const { data: userRes, error: adminErr } = await supabase.auth.admin.getUserById(log.action_by_uuid)
      if (adminErr) console.error('Admin getUserById error:', adminErr)
      const email = userRes?.user?.email || null

      // Fetch from public.profiles for name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, middle_initial, last_name, suffix, role_id (role_name), email')
        .eq('id', log.action_by_uuid)
        .single()
      if (profileError) throw profileError

      const fullName = profileData
        ? `${profileData.first_name || ''} ${profileData.middle_initial || ''} ${profileData.last_name || ''} ${profileData.suffix || ''}`.replace(/\s+/g, ' ').trim()
        : null

      setActionByInfo({
        id: log.action_by_uuid,
        email: email || profileData?.email || null,
        fullName: fullName || null,
        roleId: profileData?.role_id?.role_name || null,
      })
    } catch (err) {
      console.error('Error fetching action-by info:', err)
    } finally {
      setActionByLoading(false)
    }
  }

  const closeDetails = () => {
    setDetailsVisible(false)
    setSelectedLog(null)
    setActionByInfo(null)
  }

  const pretty = (obj) => {
    if (!obj) return '—'
    try {
      return JSON.stringify(obj, null, 2)
    } catch (e) {
      return String(obj)
    }
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <Header navigation={navigation} title='Audit Logs' />
      {SnackbarElement}

      <View style={styles.container}>
        <Surface style={[styles.filtersSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.filtersRow}>
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>Search Column</Text>
              <Menu
                visible={filterMenuVisible}
                onDismiss={() => setFilterMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    icon="filter-variant"
                    onPress={() => setFilterMenuVisible(true)}
                    style={[styles.filterButton, { borderColor: colors.outline }]}
                    contentStyle={styles.buttonContent}
                    labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                  >
                    {filterOptions.find(opt => opt.value === searchColumn)?.label || 'Select Column'}
                  </Button>
                }
                contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
              >
                {filterOptions.map(option => (
                  <Menu.Item
                    key={option.value}
                    onPress={() => {
                      setSearchColumn(option.value)
                      setFilterMenuVisible(false)
                    }}
                    title={option.label}
                    titleStyle={[{ color: searchColumn === option.value ? colors.primary : colors.onSurface }, fonts.bodyLarge]}
                    leadingIcon={searchColumn === option.value ? 'check' : undefined}
                  />
                ))}
              </Menu>
            </View>

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.onSurface }, fonts.bodyMedium]}>Event Filter</Text>
              <Menu
                visible={eventMenuVisible}
                onDismiss={() => setEventMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    icon="history"
                    onPress={() => setEventMenuVisible(true)}
                    style={[styles.filterButton, { borderColor: colors.outline }]}
                    contentStyle={styles.buttonContent}
                    labelStyle={[styles.buttonLabel, { color: colors.onSurface }]}
                  >
                    {eventOptions.find(o => o.value === eventFilter)?.label}
                  </Button>
                }
                contentStyle={[styles.menuContent, { backgroundColor: colors.surface }]}
              >
                {eventOptions.map(option => (
                  <Menu.Item
                    key={option.value}
                    onPress={() => {
                      setEventFilter(option.value)
                      setEventMenuVisible(false)
                    }}
                    title={option.label}
                    titleStyle={[{ color: eventFilter === option.value ? colors.primary : colors.onSurface }, fonts.bodyLarge]}
                    leadingIcon={eventFilter === option.value ? 'check' : undefined}
                  />
                ))}
              </Menu>
            </View>
          </View>

          <Searchbar
            placeholder={`Search by ${filterOptions.find(opt => opt.value === searchColumn)?.label}`}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchbar, { backgroundColor: colors.surfaceVariant }]}
            iconColor={colors.onSurfaceVariant}
            inputStyle={[styles.searchInput, { color: colors.onSurfaceVariant }]}
          />
        </Surface>

        <Surface style={[styles.resultsSurface, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }, fonts.titleMedium]}>Audit Logs</Text>
            {!loading ? (
              <Text style={[styles.resultsCount, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                {filteredAndSortedLogs.length} record{filteredAndSortedLogs.length !== 1 ? 's' : ''}
              </Text>
            ) : (
              <ActivityIndicator size={18} color={colors.primary} />
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
              <DataTable.Header style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
                <DataTable.Title style={[styles.actionColumn, { justifyContent: 'center' }]}>
                  <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>Actions</Text>
                </DataTable.Title>
                {columns.map(({ key, label, width }) => (
                  <DataTable.Title
                    key={key}
                    style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}
                    onPress={() => handleSort(key)}
                  >
                    <View style={styles.sortableHeader}>
                      <Text style={[styles.headerText, { color: colors.onSurface }, fonts.labelLarge]}>{label}</Text>
                      <Text style={[styles.sortIcon, { color: colors.onSurface }]}>{getSortIcon(key)}</Text>
                    </View>
                  </DataTable.Title>
                ))}
              </DataTable.Header>

              {loading ? (
                <DataTable.Row>
                  <DataTable.Cell style={styles.noDataCell}>
                    <Text style={[styles.noDataText, { color: colors.onSurfaceVariant }, fonts.bodyLarge]}>
                      Loading logs...
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ) : (
                (paginatedLogs.length === 0 ? (
                  <DataTable.Row>
                    <DataTable.Cell style={styles.noDataCell}>
                      <Text style={[styles.noDataText, { color: colors.onSurfaceVariant }, fonts.bodyLarge]}>
                        No logs found
                      </Text>
                    </DataTable.Cell>
                  </DataTable.Row>
                ) : (
                  paginatedLogs.map((log) => (
                    <DataTable.Row key={log.id} style={styles.tableRow}>
                      <DataTable.Cell style={[styles.actionColumn, { justifyContent: 'center' }]}>
                        <Button
                          mode="outlined"
                          icon="file-search"
                          onPress={() => openDetails(log)}
                          style={[styles.actionButton, { borderColor: colors.primary }]}
                          contentStyle={styles.buttonContent}
                          labelStyle={[styles.buttonLabel, { color: colors.primary }]}
                        >
                          Details
                        </Button>
                      </DataTable.Cell>
                      {columns.map(({ key, width }) => (
                        <DataTable.Cell key={key} style={[styles.tableColumn, { width: width || COLUMN_WIDTH, justifyContent: 'center' }]}> 
                          <Text style={[styles.cellText, { color: colors.onSurface }, fonts.bodyMedium]} selectable>
                            {log[key]}
                          </Text>
                        </DataTable.Cell>
                      ))}
                    </DataTable.Row>
                  ))
                ))
              )}
            </DataTable>
          </ScrollView>

          {filteredAndSortedLogs.length > 0 && (
            <View style={[styles.paginationContainer, { backgroundColor: colors.surfaceVariant }]}>
              <DataTable.Pagination
                page={page}
                numberOfPages={Math.ceil(filteredAndSortedLogs.length / itemsPerPage)}
                onPageChange={setPage}
                label={`${from + 1}-${to} of ${filteredAndSortedLogs.length}`}
                labelStyle={[styles.paginationLabel, { color: colors.onSurface }, fonts.bodyMedium]}
                showFirstPageButton
                showLastPageButton
                showFastPaginationControls
                numberOfItemsPerPageList={[5, 10, 20, 50]}
                numberOfItemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                selectPageDropdownLabel={'Rows per page'}
                style={styles.pagination}
                theme={{
                  colors: {
                    onSurface: colors.onSurface,
                    text: colors.onSurface,
                    elevation: { level2: colors.surface },
                  },
                  fonts: {
                    bodyMedium: fonts.bodyMedium,
                    labelMedium: fonts.labelMedium,
                  },
                }}
              />
            </View>
          )}
        </Surface>
      </View>

      <Portal>
        <Dialog visible={detailsVisible} onDismiss={closeDetails} style={[styles.dialog, { backgroundColor: colors.surface }]}> 
          <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>Audit Log Details</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {selectedLog && (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>ID: {selectedLog.id}</Text>
                  <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>Table: {selectedLog.table_name}</Text>
                  <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>Event: {selectedLog.event_type}</Text>
                  <Text style={[{ color: colors.onSurface }, fonts.bodyMedium]}>Created: {selectedLog.created_at}</Text>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={[styles.sectionLabel, { color: colors.onSurface }, fonts.titleSmall]}>Action By</Text>
                  {actionByLoading ? (
                    <ActivityIndicator size={18} color={colors.primary} />
                  ) : (
                    <View style={{ gap: 2 }}>
                      <Text style={[{ color: colors.onSurfaceVariant }, fonts.bodySmall]}>UUID: {selectedLog.action_by_uuid || '—'}</Text>
                      <Text style={[{ color: colors.onSurfaceVariant }, fonts.bodySmall]}>Email: {actionByInfo?.email || '—'}</Text>
                      <Text style={[{ color: colors.onSurfaceVariant }, fonts.bodySmall]}>Name: {actionByInfo?.fullName || '—'}</Text>
                      {actionByInfo?.roleId != null && (
                        <Text style={[{ color: colors.onSurfaceVariant }, fonts.bodySmall]}>Role: {actionByInfo.roleId}</Text>
                      )}
                    </View>
                  )}
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={[styles.sectionLabel, { color: colors.onSurface }, fonts.titleSmall]}>Row Data</Text>
                  <ScrollView style={[styles.jsonBox, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.codeText, { color: colors.onSurface }]} selectable>
                      {pretty(selectedLog.row_data)}
                    </Text>
                  </ScrollView>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={[styles.sectionLabel, { color: colors.onSurface }, fonts.titleSmall]}>Old Data</Text>
                  <ScrollView style={[styles.jsonBox, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.codeText, { color: colors.onSurface }]} selectable>
                      {pretty(selectedLog.old_data)}
                    </Text>
                  </ScrollView>
                </View>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={closeDetails}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { padding: 16, gap: 16 },
  filtersSurface: { padding: 16, borderRadius: 12 },
  filtersRow: { flexDirection: 'row', gap: 16 },
  filterGroup: { flex: 1, minWidth: 0 },
  filterLabel: { marginBottom: 8, fontWeight: '500' },
  filterButton: { borderRadius: 8, minHeight: 40 },
  menuContent: { width: '100%', left: 0, right: 0 },
  buttonContent: { height: 40 },
  buttonLabel: { fontSize: 14, fontWeight: '600' },
  searchbar: { borderRadius: 8, marginTop: 12 },
  searchInput: { fontSize: 16 },
  resultsSurface: { borderRadius: 12, overflow: 'hidden' },
  resultsHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontWeight: '600' },
  resultsCount: { },
  table: { flex: 1 },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.12)' },
  tableRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.08)' },
  actionColumn: { width: 140, paddingVertical: 12 },
  tableColumn: { paddingVertical: 12 },
  sortableHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortIcon: { fontSize: 12 },
  headerText: { fontWeight: '600' },
  cellText: { textAlign: 'center' },
  noDataCell: { justifyContent: 'center', alignItems: 'center', paddingVertical: 32, flex: 1 },
  noDataText: { textAlign: 'center' },
  paginationContainer: { borderTopWidth: 1, borderTopColor: 'rgba(0, 0, 0, 0.12)' },
  pagination: { justifyContent: 'space-evenly' },
  paginationLabel: { fontWeight: '500' },
  dialog: { borderRadius: 8, maxWidth: 700, width: '94%', alignSelf: 'center' },
  dialogTitle: { fontSize: 20, fontWeight: '600', paddingHorizontal: 24, paddingTop: 24 },
  dialogContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  dialogActions: { paddingHorizontal: 24, paddingBottom: 24, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  sectionLabel: { fontWeight: '600' },
  jsonBox: { maxHeight: 220, borderRadius: 8, padding: 10 },
  codeText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
})

export default AdminAuditLogs
