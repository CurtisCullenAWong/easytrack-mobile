import React, { useState } from 'react'
import { View, ScrollView, StyleSheet, Alert } from 'react-native'
import { useTheme, Text, Button, TextInput, Appbar } from 'react-native-paper'
import { useNavigation, useRoute } from '@react-navigation/native'
import { supabase } from '../../../lib/supabaseAdmin'
import { printPDF, sharePDF } from '../../../utils/pdfUtils'
import useSnackbar from '../../../components/hooks/useSnackbar'

const TransactionSummary = () => {
  const { colors, fonts } = useTheme()
  const navigation = useNavigation()
  const route = useRoute()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const { summaryData, transactions } = route.params
  const [invoiceNumber, setInvoiceNumber] = useState('')

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2)}`
  }

  const handleAssignInvoice = async () => {
    try {
      if (!invoiceNumber.trim()) {
        showSnackbar('Please enter an invoice number')
        return
      }

      // Update all contracts with the invoice number
      const { error } = await supabase
        .from('contract')
        .update({ payment_id: invoiceNumber })
        .in('id', transactions.map(t => t.id))

      if (error) throw error

      showSnackbar('Invoice number assigned successfully', true)
      navigation.goBack()
    } catch (error) {
      console.error('Error assigning invoice number:', error)
      showSnackbar('Failed to assign invoice number: ' + error.message)
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={{ backgroundColor: colors.surface }}>     
        <Appbar.BackAction onPress={() => navigation.navigate('TransactionManagement')} />
        <Appbar.Content 
          title="Transaction Summary" 
          titleStyle={[fonts.titleLarge, { color: colors.onSurface }]}
        />
      </Appbar.Header>
      {SnackbarElement}
      <View style={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryText, fonts.bodyLarge, { color: colors.onSurface }]}>
            Total Transactions: {summaryData.totalTransactions}
          </Text>
          <Text style={[styles.summaryText, fonts.bodyLarge, { color: colors.onSurface }]}>
            Total Amount: {formatCurrency(summaryData.totalAmount)}
          </Text>
          <Text style={[styles.summaryText, fonts.bodyLarge, { color: colors.onSurface }]}>
            Total Surcharge: {formatCurrency(summaryData.totalSurcharge)}
          </Text>
          <Text style={[styles.summaryText, fonts.bodyLarge, { color: colors.onSurface }]}>
            Total Discount: {formatCurrency(summaryData.totalDiscount)}
          </Text>
          
          <Text style={[styles.summaryText, fonts.titleMedium, { color: colors.onSurface, marginTop: 16 }]}>
            Status Breakdown:
          </Text>
          {Object.entries(summaryData.statusCounts).map(([status, count]) => (
            <Text key={status} style={[styles.summaryText, fonts.bodyLarge, { color: colors.onSurface, marginLeft: 16 }]}>
              {status}: {count}
            </Text>
          ))}
        </View>

        <View style={[styles.invoiceCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, fonts.titleMedium, { color: colors.primary }]}>
            Assign Invoice Number
          </Text>
          <TextInput
            label="Invoice Number"
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            mode="outlined"
            style={styles.invoiceInput}
            placeholder="Enter invoice number"
            theme={{ colors: { primary: colors.primary } }}
          />
          <Button
            mode="contained"
            onPress={handleAssignInvoice}
            style={[styles.assignButton, { backgroundColor: colors.primary }]}
            labelStyle={[fonts.labelLarge, { color: colors.onPrimary }]}
            disabled={!invoiceNumber.trim()}
          >
            Assign Invoice
          </Button>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            icon="printer"
            mode="outlined"
            onPress={async () => {
              try {
                await printPDF(transactions, summaryData)
              } catch (error) {
                Alert.alert('Error', error.message)
              }
            }}
            style={[styles.actionButton, { borderColor: colors.primary }]}
            labelStyle={[fonts.labelLarge, { color: colors.primary }]}
          >
            Print
          </Button>
          <Button
            icon="share"
            mode="outlined"
            onPress={async () => {
              try {
                await sharePDF(transactions, summaryData)
              } catch (error) {
                Alert.alert('Error', error.message)
              }
            }}
            style={[styles.actionButton, { borderColor: colors.primary }]}
            labelStyle={[fonts.labelLarge, { color: colors.primary }]}
          >
            Share/View
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  invoiceCard: {
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 16,
  },
  summaryText: {
    lineHeight: 24,
    marginBottom: 8,
  },
  invoiceInput: {
    marginBottom: 16,
  },
  assignButton: {
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  actionButton: {
    minWidth: 120,
  },
})

export default TransactionSummary 