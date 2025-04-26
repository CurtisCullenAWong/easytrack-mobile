import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

const Analytics = ({ navigation }) => {
    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.hamburger}>
                    <Icon name="bars" size={24} color="#5D8736" />
                </TouchableOpacity>
                <Image source={require('../../../assets/icon-w_o-name.png')} style={styles.logo} />
                <TouchableOpacity>
                    <Icon name="user-circle" size={28} color="#5D8736" />
                </TouchableOpacity>
            </View>

            {/* Analytics Section */}
            <Text style={styles.sectionTitle}>Analytics</Text>

            <View style={styles.analyticsContainer}>
                {/* Sales Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sales <Text style={styles.greenText}>+3.2% ↑</Text></Text>
                    <Text style={styles.cardValue}>$3.75M</Text>
                    <Text style={styles.cardSubText}>Compared to ($3.63M last year)</Text>
                </View>

                {/* Orders Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>No. of Orders <Text style={styles.greenText}>+5.1% ↑</Text></Text>
                    <Text style={styles.cardValue}>12,500</Text>
                    <Text style={styles.cardSubText}>Compared to (11,800 last year)</Text>
                </View>
            </View>

            <View style={styles.analyticsContainer}>
                <View style={styles.smallCard}>
                    <Text style={styles.cardTitle}>No. of States</Text>
                    <Text style={styles.cardValue}>49</Text>
                </View>
                <View style={styles.smallCard}>
                    <Text style={styles.cardTitle}>No. of Cities</Text>
                    <Text style={styles.cardValue}>735</Text>
                </View>
                <View style={styles.smallCard}>
                    <Text style={styles.cardTitle}>Delivery Period</Text>
                    <Text style={styles.cardValue}>3.45</Text>
                </View>
            </View>

            {/* Logistics Performance */}
            <View style={styles.performanceCard}>
                <Text style={styles.sectionTitle}>Logistics Performance</Text>
                <View style={styles.circleChart}>
                    <Text style={styles.chartNumber}>25,600</Text>
                    <Text style={styles.chartLabel}>Deliveries this year</Text>
                </View>
                <View style={styles.performanceStats}>
                    <Text style={styles.statItem}><Icon name="circle" size={10} color="green" /> On time: 4.3k</Text>
                    <Text style={styles.statItem}><Icon name="circle" size={10} color="blue" /> Early Delivery: 3.8k</Text>
                    <Text style={styles.statItem}><Icon name="circle" size={10} color="orange" /> Late Delivery: 2.1k</Text>
                </View>
            </View>

            {/* Logistics Performance by Sales Volume */}
            <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>Logistics Performance by Sales Volume</Text>
                <Image source={require('../../../assets/logistics-performance-chart.png')} style={styles.chartImage} />
            </View>

            {/* Sales Performance History */}
            <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>Logistics Performance History</Text>
                <View style={styles.toggleButtons}>
                    <TouchableOpacity style={styles.toggleButton}><Text style={styles.toggleText}>Weekly</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleButton, styles.activeToggle]}><Text style={styles.toggleText}>Monthly</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.toggleButton}><Text style={styles.toggleText}>Yearly</Text></TouchableOpacity>
                </View>
                <Image source={require('../../../assets/performance-history-chart.png')} style={styles.chartImage} />
            </View>

            {/* Sales Report */}
            <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>Sales Report <Text style={styles.smallText}>2023-2024</Text></Text>
                <Image source={require('../../../assets/sales-report-chart.png')} style={styles.chartImage} />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    hamburger: {
        padding: 10,
    },
    logo: {
        width: 50,
        height: 50,
        resizeMode: 'contain',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        margin: 15,
    },
    analyticsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
    },
    card: {
        backgroundColor: '#F9F9F9',
        padding: 15,
        marginBottom: 15,
        borderRadius: 10,
        width: '48%',
        elevation: 3,
    },
    smallCard: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 10,
        width: '30%',
        elevation: 3,
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#5D8736',
    },
    cardValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    cardSubText: {
        fontSize: 12,
        color: '#777',
        marginTop: 5,
    },
    greenText: {
        color: 'green',
        fontWeight: 'bold',
    },
    performanceCard: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 10,
        margin: 15,
        elevation: 3,
    },
    circleChart: {
        alignItems: 'center',
        marginVertical: 15,
    },
    chartNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    chartLabel: {
        fontSize: 14,
        color: '#777',
    },
    performanceStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 10,
    },
    statItem: {
        fontSize: 14,
        color: '#333',
    },
    chartCard: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 10,
        margin: 15,
        elevation: 3,
    },
    chartImage: {
        width: '100%',
        height: 200,
        resizeMode: 'contain',
    },
    toggleButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 10,
    },
    toggleButton: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#5D8736',
        borderRadius: 5,
        marginHorizontal: 5,
    },
    activeToggle: {
        backgroundColor: '#5D8736',
    },
    toggleText: {
        fontSize: 14,
        color: '#333',
    },
    smallText: {
        fontSize: 12,
        color: '#777',
    },
});

export default Analytics;