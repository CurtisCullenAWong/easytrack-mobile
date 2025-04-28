import React, { useState, useEffect } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { Searchbar, Button, DataTable, Text, useTheme } from 'react-native-paper'
import Header from '../../customComponents/Header'

const AdminTrackLuggage = ({ navigation }) => {
    const { colors, fonts } = useTheme()

    const [searchQuery, setSearchQuery] = useState('')
    const [sortColumn, setSortColumn] = useState('trackingId')
    const [sortDirection, setSortDirection] = useState('ascending')
    const [luggages, setLuggages] = useState([])

    const onChangeSearch = query => setSearchQuery(query)

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(prev => (prev === 'ascending' ? 'descending' : 'ascending'))
        } else {
            setSortColumn(column)
            setSortDirection('ascending')
        }
    }

    const getSortIcon = (column) =>
        sortColumn === column ? (sortDirection === 'ascending' ? '▲' : '▼') : null

    const filteredAndSorted = luggages
        .filter(item => item.passengerName.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const valA = a[sortColumn]
            const valB = b[sortColumn]
            if (valA < valB) return sortDirection === 'ascending' ? -1 : 1
            if (valA > valB) return sortDirection === 'ascending' ? 1 : -1
            return 0
        })

    const columns = [
        { key: 'trackingId', label: 'Tracking ID' },
        { key: 'passengerName', label: 'Passenger' },
        { key: 'status', label: 'Status' },
        { key: 'location', label: 'Current Location' },
        { key: 'destination', label: 'Destination' },
        { key: 'bookedDate', label: 'Booked Date' },
    ]

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header navigation={navigation} title={'Track Luggage'} />
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Searchbar
                    placeholder="Search by passenger"
                    onChangeText={onChangeSearch}
                    value={searchQuery}
                    style={[styles.searchbar, { backgroundColor: colors.surface }]}
                />
                <Button
                    mode="outlined"
                    icon="filter-variant"
                    onPress={() => console.log('Filter')}
                    style={[styles.filterButton, { borderColor: colors.primary }]}
                    labelStyle={{ color: colors.primary }}
                >
                    Filter
                </Button>
            </View>

            <ScrollView horizontal>
                <DataTable style={[styles.table, { backgroundColor: colors.surface }]}>
                    <DataTable.Header>
                        {columns.map(({ key, label }) => (
                            <DataTable.Title
                                key={key}
                                onPress={() => handleSort(key)}
                                style={[styles.columnHeader, { width: 130 }]}
                            >
                                <View style={styles.sortableHeader}>
                                    <Text style={[fonts.labelMedium, { color: colors.text }]}>{label}</Text>
                                    {sortColumn === key && (
                                        <Text style={[styles.sortIcon, { color: colors.text }]}>
                                            {getSortIcon(key)}
                                        </Text>
                                    )}
                                </View>
                            </DataTable.Title>
                        ))}
                        <DataTable.Title style={[styles.columnHeader, { width: 130 }]}>
                            <Text style={[fonts.labelMedium, { color: colors.text }]}>Actions</Text>
                        </DataTable.Title>
                    </DataTable.Header>

                    {filteredAndSorted.length === 0 ? (
                        <DataTable.Row>
                            <DataTable.Cell colSpan={columns.length + 1} style={styles.noDataCell}>
                                <Text style={[fonts.bodyLarge, { color: colors.onSurface, textAlign: 'center' }]}>
                                    No luggage available
                                </Text>
                            </DataTable.Cell>
                        </DataTable.Row>
                    ) : (
                        filteredAndSorted.map((item, idx) => (
                            <DataTable.Row key={idx}>
                                {columns.map(({ key }) => (
                                    <DataTable.Cell key={key} style={[styles.columnCell, { width: 130 }]}>
                                        <Text style={{ color: colors.text }}>{item[key]}</Text>
                                    </DataTable.Cell>
                                ))}
                                <DataTable.Cell numeric style={[styles.columnCell, { width: 130 }]}>
                                    <Button
                                        mode="outlined"
                                        icon="eye"
                                        compact
                                        onPress={() => navigation.navigate('TrackLuggage', { trackingId: item.trackingId })}
                                        style={styles.viewButton}
                                    >
                                        View
                                    </Button>
                                </DataTable.Cell>
                            </DataTable.Row>
                        ))
                    )}
                </DataTable>
            </ScrollView>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchbar: {
        flex: 1,
        borderRadius: 8,
        elevation: 2,
    },
    filterButton: {
        marginLeft: 8,
    },
    table: {
        paddingHorizontal: 16,
    },
    columnHeader: {
        justifyContent: 'center',
    },
    columnCell: {
        justifyContent: 'center',
        paddingVertical: 8,
    },
    sortableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sortIcon: {
        marginLeft: 4,
    },
    viewButton: {
        borderRadius: 4,
    },
    noDataCell: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
})

export default AdminTrackLuggage
