import React, { useState, useEffect } from 'react'
import { ScrollView, View } from 'react-native'
import { Searchbar, Button, DataTable, Text } from 'react-native-paper'
import Header from '../../customComponents/Header'
import { useTheme } from 'react-native-paper'

const AdminTrackLuggage = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [sortColumn, setSortColumn] = useState('trackingId')
    const [sortDirection, setSortDirection] = useState('ascending')
    const [luggages, setLuggages] = useState([])

    const { colors, fonts } = useTheme()

    const onChangeSearch = query => setSearchQuery(query)

    // const fetchLuggage = async () => {
    //     try {
    //         const response = await fetch('http://10.0.2.2:8000/api/accounts/?format=json')
    //         const data = await response.json()
    //         const transformed = data.map(item => ({
    //             trackingId: item.tracking_id,
    //             passengerName: `${item.first_name} ${item.last_name}`,
    //             status: item.status,
    //             location: item.current_location,
    //             destination: item.destination,
    //             bookedDate: new Date(item.created_at).toLocaleDateString(),
    //         }))
    //         setLuggages(transformed)
    //     } catch (error) {
    //         console.error('Failed to fetch luggage data:', error)
    //     }
    // }

    // useEffect(() => {
    //     fetchLuggage()
    // }, [])

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
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
            <Header navigation={navigation} />
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Searchbar
                    placeholder="Search by passenger"
                    onChangeText={onChangeSearch}
                    value={searchQuery}
                    style={{
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        ...fonts.bodyLarge,
                        elevation: 2,
                    }}
                />
                <Button
                    mode="outlined"
                    icon="filter-variant"
                    onPress={() => console.log('Filter')}
                    style={{ marginLeft: 8 }}
                >
                    Filter
                </Button>
            </View>

            <ScrollView horizontal>
                <DataTable>
                    <DataTable.Header>
                        {columns.map(({ key, label }) => (
                            <DataTable.Title
                                key={key}
                                onPress={() => handleSort(key)}
                                style={{ width: 130, justifyContent: 'center' }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ ...fonts.labelMedium, color: colors.text }}>{label}</Text>
                                    {sortColumn === key && (
                                        <Text style={{ marginLeft: 4, ...fonts.labelSmall, color: colors.text }}>
                                            {getSortIcon(key)}
                                        </Text>
                                    )}
                                </View>
                            </DataTable.Title>
                        ))}
                        <DataTable.Title style={{ width: 130, justifyContent: 'center' }}>
                            <Text style={{ ...fonts.labelMedium, color: colors.text }}>Actions</Text>
                        </DataTable.Title>
                    </DataTable.Header>

                    {filteredAndSorted.map((item, idx) => (
                        <DataTable.Row key={idx}>
                            {columns.map(({ key }) => (
                                <DataTable.Cell key={key} style={{ width: 130, justifyContent: 'center', paddingVertical: 8 }}>
                                    <Text style={{ color: colors.text }}>{item[key]}</Text>
                                </DataTable.Cell>
                            ))}
                            <DataTable.Cell numeric style={{ width: 130, justifyContent: 'center' }}>
                                <Button
                                    mode="outlined"
                                    icon="eye"
                                    compact
                                    onPress={() => navigation.navigate('TrackLuggage', { trackingId: item.trackingId })}
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

export default AdminTrackLuggage
