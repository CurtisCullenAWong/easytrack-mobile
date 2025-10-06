import React, { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useTheme, Text, Button, Appbar, Card, Portal, Dialog, Divider } from 'react-native-paper'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../../../../lib/supabase'
import useSnackbar from '../../../../hooks/useSnackbar'

const GenerateInvoice = () => {
  const { colors, fonts } = useTheme()
  const navigation = useNavigation()
  const route = useRoute()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [currentTime, setCurrentTime] = useState('')
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState('')
  const [generatedSummaryId, setGeneratedSummaryId] = useState('')

  const { summaryData, transactions, pendingContracts } = route.params

  // Generate computer-generated IDs
  const generateIds = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    // Generate 4 random alphanumeric characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let randomPart = ''
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return {
      summaryId: `SUM${year}${month}${day}${randomPart}`,
      invoiceId: `INV${year}${month}${day}${randomPart}`
    }
  }

  // Check if ID exists in summary table
  const checkIdExists = async (id, field = 'id') => {
    try {
      const { data, error } = await supabase
        .from('summary')
        .select('id')
        .eq(field, id)
        .single()
      
      if (error && error.code === 'PGRST116') {
        // No record found, ID is unique
        return false
      } else if (error) {
        throw error
      }
      
      // Record found, ID already exists
      return true
    } catch (error) {
      console.error(`Error checking ${field} existence:`, error)
      throw error
    }
  }

  // Generate unique IDs that don't exist in the summary table
  const generateUniqueIds = async () => {
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      const { summaryId, invoiceId } = generateIds()
      
      try {
        const summaryExists = await checkIdExists(summaryId, 'id')
        const invoiceExists = await checkIdExists(invoiceId, 'invoice_id')
        
        if (!summaryExists && !invoiceExists) {
          return { summaryId, invoiceId }
        }
      } catch (error) {
        console.error(`Error checking IDs on attempt ${attempts + 1}:`, error)
        throw error
      }
      
      attempts++
    }
    
    throw new Error('Failed to generate unique IDs after maximum attempts')
  }

  const handleConfirmSummary = async () => {
    if (!pendingContracts || pendingContracts.length === 0) {
      showSnackbar('No contracts selected for summary generation')
      return
    }

    setConfirmDialogVisible(true)
  }

  const confirmGenerateSummary = async () => {
    try {
      setIsProcessing(true)
      
      // Generate unique IDs
      const { summaryId, invoiceId } = await generateUniqueIds()
      
      const { error: summaryError } = await supabase
        .from('summary')
        .insert({
          id: summaryId,
          invoice_id: invoiceId
        })
        .select()
        .single()

      if (summaryError) {
        throw summaryError
      }

      const { error: updateError } = await supabase
        .from('contracts')
        .update({ summary_id: summaryId })
        .in('id', pendingContracts)

      if (updateError) {
        throw updateError
      }

      const successMessage = `Summary generated successfully with Summary ID: ${summaryId} and Invoice ID: ${invoiceId}`
      showSnackbar(successMessage, true)
      
      // Navigate back to TransactionManagement
      navigation.navigate('TransactionManagement', { segment: 'pending' })
      
    } catch (error) {
      console.error('Error generating summary:', error)
      showSnackbar(`Failed to generate summary: ${error.message}`)
    } finally {
      setIsProcessing(false)
      setConfirmDialogVisible(false)
    }
  }

  // Reset form fields when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Generate new IDs on focus
      const { summaryId, invoiceId } = generateIds()
      setGeneratedSummaryId(summaryId)
      setGeneratedInvoiceId(invoiceId)
    }, [])
  )

  useEffect(() => {
    const updateTime = () => setCurrentTime(
      new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' })
    )
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toFixed(2)}`
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: colors.surface }]}>
        <Appbar.BackAction onPress={() => navigation.navigate('TransactionManagement')} />
        <Appbar.Content title="Transaction Summary" titleStyle={[styles.headerTitle, { color: colors.onSurface }]} />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {SnackbarElement}

        {/* Time Card */}
        <Card style={[styles.timeCard, { backgroundColor: colors.surfaceVariant }]}>
          <Card.Content style={styles.timeCardContent}>
            <Text style={[styles.timeLabel, { color: colors.onSurfaceVariant }, fonts.labelMedium]}>
              Current Time
            </Text>
            <Text style={[styles.timeText, { color: colors.onSurface }, fonts.titleMedium]}>
              {currentTime}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.content}>
          {/* Summary Preview Card */}
          <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.primary }, fonts.titleLarge]}>
                  Summary Preview
                </Text>
              </View>
              
              <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

              <View style={styles.summaryDetails}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                    Total Transactions:
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.onSurface }, fonts.bodyLarge]}>
                    {summaryData.totalTransactions}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                    Summarized Amount:
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.onSurface }, fonts.bodyLarge]}>
                    {formatCurrency(summaryData.totalAmount)}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                    + Total Surcharge:
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.error }, fonts.bodyLarge]}>
                    {formatCurrency(summaryData.totalSurcharge)}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                    - Total Discount:
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.onSurface }, fonts.bodyLarge]}>
                    {formatCurrency(summaryData.totalDiscount)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                    = Accumulated total:
                  </Text>
                <Text style={[styles.summaryValue, { color: colors.primary }, fonts.bodyLarge]}>
                {formatCurrency(summaryData.totalAmount + summaryData.totalSurcharge - summaryData.totalDiscount)}</Text>
                </View>
              </View>

              <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
              
              <View style={styles.statusBreakdown}>
                <Text style={[styles.statusTitle, { color: colors.onSurface }, fonts.titleSmall]}>
                  Status Breakdown:
                </Text>
                {Object.entries(summaryData.statusCounts).map(([status, count]) => (
                  <View key={status} style={styles.statusRow}>
                    <Text style={[styles.statusLabel, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                      {status}:
                    </Text>
                    <Text style={[styles.statusCount, { color: colors.onSurface }, fonts.bodyLarge]}>
                      {count}
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.actionsCard, { backgroundColor: colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <Text style={[styles.actionText, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                Review the summary details above. Click "Generate Summary and Invoice" to create the summary and tag the selected contracts.
              </Text>
              
              {/* ID Preview Section */}
              <View style={styles.idPreviewSection}>
                <Text style={[styles.idPreviewTitle, { color: colors.onSurface }, fonts.titleSmall]}>
                  Generated IDs Preview
                </Text>
                <Text style={[styles.idPreviewDescription, { color: colors.onSurfaceVariant }, fonts.bodySmall]}>
                  The following unique IDs will be generated for this summary:
                </Text>
                
                <View style={styles.idPreviewContainer}>
                  <View style={styles.idPreviewRow}>
                    <Text style={[styles.idPreviewLabel, { color: colors.onSurfaceVariant }, fonts.bodySmall]}>
                      Summary ID:
                    </Text>
                    <Text style={[styles.idPreviewValue, { color: colors.primary }, fonts.bodyMedium]}>
                      {generatedSummaryId}
                    </Text>
                  </View>
                  
                  <View style={styles.idPreviewRow}>
                    <Text style={[styles.idPreviewLabel, { color: colors.onSurfaceVariant }, fonts.bodySmall]}>
                      Invoice ID:
                    </Text>
                    <Text style={[styles.idPreviewValue, { color: colors.secondary }, fonts.bodyMedium]}>
                      {generatedInvoiceId}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.idNoteContainer}>
                  <Text style={[styles.idNoteText, { color: colors.primary }, fonts.bodySmall]}>
                    ✓ Summary will be marked as receipted with both IDs assigned
                  </Text>
                </View>
              </View>
              
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  icon="file-document-outline"
                  onPress={handleConfirmSummary}
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: colors.onPrimary }]}
                  disabled={isProcessing}
                >
                  Generate Summary and Invoice
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Selected Contracts Card */}
          <Card style={[styles.transactionsCard, { backgroundColor: colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.primary }, fonts.titleLarge]}>
                  Selected Contracts
                </Text>
                <Text style={[styles.contractCount, { color: colors.onSurfaceVariant }, fonts.bodySmall]}>
                  {transactions.length} contracts
                </Text>
              </View>
              
              <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
              
              <Text style={[styles.actionText, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                The following contracts will be tagged with a summary ID upon confirmation.
              </Text>
              
              <View style={styles.transactionsList}>
                {transactions.map((transaction, index) => (
                  <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: colors.outline }]}>
                    <View style={styles.transactionHeader}>
                      <Text style={[styles.transactionId, { color: colors.onSurface }, fonts.bodyMedium]}>
                        Contract ID: {transaction.id}
                      </Text>
                      <Text style={[styles.transactionAmount, { color: colors.primary }, fonts.bodyLarge]}>
                        {formatCurrency((transaction.delivery_charge || 0) + (transaction.delivery_surcharge || 0) - (transaction.delivery_discount || 0))}
                      </Text>
                    </View>
                    <Text style={[styles.transactionDetails, { color: colors.onSurfaceVariant }, fonts.bodySmall]}>
                      {transaction.luggage_owner}
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <Portal>
        <Dialog 
          visible={confirmDialogVisible} 
          onDismiss={() => setConfirmDialogVisible(false)}
          style={[styles.dialog, { backgroundColor: colors.surface }]}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: colors.onSurface }]}>
            Confirm Summary Generation
          </Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.dialogText, { color: colors.onSurface }, fonts.bodyMedium]}>
              Are you sure you want to generate a summary for {pendingContracts?.length || 0} pending contracts?
            </Text>
            
            <View style={styles.dialogIdPreview}>
              <Text style={[styles.dialogIdLabel, { color: colors.onSurfaceVariant }, fonts.bodySmall]}>
                Summary ID: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{generatedSummaryId}</Text>
              </Text>
              <Text style={[styles.dialogIdLabel, { color: colors.onSurfaceVariant }, fonts.bodySmall]}>
                Invoice ID: <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>{generatedInvoiceId}</Text>
              </Text>
            </View>
            
            <Text style={[styles.dialogText, { color: colors.onSurface }, fonts.bodyMedium]}>
              This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button 
              onPress={() => setConfirmDialogVisible(false)}
              textColor={colors.primary}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onPress={confirmGenerateSummary} 
              loading={isProcessing}
              textColor={colors.primary}
            >
              {isProcessing ? 'Generating...' : 'Generate Summary and Invoice'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 2,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  timeCard: {
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
  },
  timeCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  timeLabel: {
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  summaryCard: {
    borderRadius: 12,
    elevation: 3,
  },
  actionsCard: {
    borderRadius: 12,
    elevation: 3,
  },
  transactionsCard: {
    borderRadius: 12,
    elevation: 3,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  contractCount: {
    fontWeight: '500',
  },
  divider: {
    marginVertical: 16,
  },
  summaryDetails: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontWeight: '500',
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  statusBreakdown: {
    gap: 8,
  },
  statusTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  statusLabel: {
    fontWeight: '500',
  },
  statusCount: {
    fontWeight: 'bold',
  },
  actionText: {
    lineHeight: 22,
    marginBottom: 20,
  },
  idPreviewSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  idPreviewTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  idPreviewDescription: {
    lineHeight: 18,
    marginBottom: 16,
  },
  idPreviewContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  idPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  idPreviewLabel: {
    fontWeight: '500',
  },
  idPreviewValue: {
    fontWeight: 'bold',
  },
  idNoteContainer: {
    padding: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  idNoteText: {
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
    height: 52,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionsList: {
    marginTop: 16,
  },
  transactionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionId: {
    fontWeight: 'bold',
  },
  transactionAmount: {
    fontWeight: 'bold',
  },
  transactionDetails: {
    marginTop: 2,
  },
  dialog: {
    borderRadius: 12,
  },
  dialogTitle: {
    fontWeight: 'bold',
  },
  dialogText: {
    lineHeight: 22,
  },
  dialogIdPreview: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  dialogIdLabel: {
    marginBottom: 4,
  },
  dialogActions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
})

export default GenerateInvoice 