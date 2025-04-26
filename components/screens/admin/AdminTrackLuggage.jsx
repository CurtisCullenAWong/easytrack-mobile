import React, { useState, useEffect } from 'react'
import {
    ScrollView,
    StyleSheet,
    View,
} from 'react-native'
import {
    useTheme,
    Searchbar,
    Button,
    IconButton,
    DataTable,
    Text,
} from 'react-native-paper'
import Header from '../../customComponents/Header'

const AdminLuggageTracking = ({ navigation }) => {
    const { colors, fonts } = useTheme()

    const [searchQuery, setSearchQuery] = useState('')
    const [sortColumn, setSortColumn] = useState('trackingId')
    const [sortDirection, setSortDirection] = useState('ascending')
    const [luggages, setLuggages] = useState([])

    const onChangeSearch = query => setSearchQuery(query)

    const fetchLuggage = async () => {
        try {
            const response = await fetch('http://10.0.2.2:8000/api/accounts/?format=json')
            const data = await response.json()

            const transformed = data.map(item => ({
                trackingId: item.tracking_id,
                passengerName: `${item.first_name} ${item.last_name}`,
                status: item.status,
                location: item.current_location,
                destination: item.destination,
                bookedDate: new Date(item.created_at).toLocaleDateString(),
            }))

            setLuggages(transformed)
        } catch (error) {
            console.error('Failed to fetch luggage data:', error)
        }
    }

    useEffect(() => {
        fetchLuggage()
    }, [])

    const handleSort = column => {
        if (sortColumn === column) {
            setSortDirection(prev => (prev === 'ascending' ? 'descending' : 'ascending'))
        } else {
            setSortColumn(column)
            setSortDirection('ascending')
        }
    }

    const getSortIcon = column =>
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
        <ScrollView style={{ backgroundColor: colors.background, flex: 1 }}>
            <Header navigation={navigation} />
            <View style={styles.container}>
                <Searchbar
                    placeholder="Search by passenger"
                    onChangeText={onChangeSearch}
                    value={searchQuery}
                    style={[styles.searchbar, { backgroundColor: colors.surface }]}
                    inputStyle={{ fontFamily: fonts.regular.fontFamily }}
                />
                <Button
                    mode="outlined"
                    icon="filter-variant"
                    onPress={() => console.log('Filter')}
                    style={styles.filterButton}
                    labelStyle={{ fontFamily: fonts.medium.fontFamily, fontSize: 14 }}
                >
                    Filter
                </Button>
            </View>

            <ScrollView horizontal>
                <DataTable style={styles.table}>
                    <DataTable.Header>
                        {columns.map(({ key, label }) => (
                            <DataTable.Title
                                key={key}
                                style={styles.columnHeader}
                                onPress={() => handleSort(key)}
                            >
                                <View style={styles.sortableHeader}>
                                    <Text variant="labelMedium">{label}</Text>
                                    {sortColumn === key && (
                                        <Text variant="labelSmall" style={styles.sortIcon}>
                                            {getSortIcon(key)}
                                        </Text>
                                    )}
                                </View>
                            </DataTable.Title>
                        ))}
                        <DataTable.Title style={styles.columnHeader} numeric>
                            <Text variant="labelMedium">Actions</Text>
                        </DataTable.Title>
                    </DataTable.Header>

                    {filteredAndSorted.map((item, idx) => (
                        <DataTable.Row key={idx}>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text>{item.trackingId}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text>{item.passengerName}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text>{item.status}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text>{item.location}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text>{item.destination}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell style={styles.columnCell}>
                                <Text>{item.bookedDate}</Text>
                            </DataTable.Cell>
                            <DataTable.Cell numeric style={styles.columnCell}>
                                <Button
                                    mode="outlined"
                                    icon="eye"
                                    compact
                                    onPress={() => navigation.navigate('TrackLuggage', { trackingId: item.trackingId })}
                                    labelStyle={{ fontSize: 16, fontFamily: fonts.medium.fontFamily }}
                                >
                                    View
                                </Button>
                            </DataTable.Cell>
                        </DataTable.Row>
                    ))}
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
    },
    filterButton: {
        marginLeft: 8,
    },
    table: {
        paddingHorizontal: 16,
    },
    columnHeader: {
        width: 130,
        justifyContent: 'center',
    },
    columnCell: {
        width: 130,
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
})

export default AdminLuggageTracking
