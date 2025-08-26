import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, View, StyleSheet, Image } from 'react-native'
import { useTheme, Appbar, Card, Text, Button, Divider, Checkbox, Portal, Modal } from 'react-native-paper'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../../../../lib/supabaseAdmin'
import { printPDF, sharePDF } from '../../../../../utils/pdfUtils'
import useSnackbar from '../../../../hooks/useSnackbar'
import Signature from 'react-native-signature-canvas'

const CreateInvoice = () => {
  const { colors, fonts } = useTheme()
  const navigation = useNavigation()
  const route = useRoute()
  const { showSnackbar, SnackbarElement } = useSnackbar()

  const { summary } = route.params || {}

  // Signature states
  const [preparedSignatureDataUrl, setPreparedSignatureDataUrl] = useState('')
  const [checkedSignatureDataUrl, setCheckedSignatureDataUrl] = useState('')
  const [preparedSignatureRotation, setPreparedSignatureRotation] = useState(0)
  const [checkedSignatureRotation, setCheckedSignatureRotation] = useState(0)
  const [preparedSignatureSize, setPreparedSignatureSize] = useState(null)
  const [checkedSignatureSize, setCheckedSignatureSize] = useState(null)
  
  // UI states
  const [signatureVisible, setSignatureVisible] = useState(false)
  const [activeSigner, setActiveSigner] = useState(null)
  const [certify, setCertify] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  
  // Data states
  const [summaryStatusId, setSummaryStatusId] = useState(null)
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null)
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState('')

  const signatureRef = useRef(null)

  // Computed values for better UI state management
  const hasInvoiceAssigned = useMemo(() => Boolean(currentInvoiceId), [currentInvoiceId])
  const isReceipted = useMemo(() => summaryStatusId === 2, [summaryStatusId])
  const canEditSignatures = true

  // Invoice ID generation utilities
  const generateInvoiceIdFormat = () => {
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
    
    return `INV${year}${month}${day}${randomPart}`
  }

  // Check if invoice ID exists in summary table
  const checkInvoiceIdExists = async (invoiceId) => {
    try {
      const { data, error } = await supabase
        .from('summary')
        .select('id')
        .eq('invoice_id', invoiceId)
        .single()
      
      if (error && error.code === 'PGRST116') {
        // No record found, invoice_id is unique
        return false
      } else if (error) {
        throw error
      }
      
      // Record found, invoice_id already exists
      return true
    } catch (error) {
      console.error('Error checking invoice ID existence:', error)
      throw error
    }
  }

  // Generate a unique invoice ID that doesn't exist in the summary table
  const generateUniqueInvoiceId = async () => {
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      const newInvoiceId = generateInvoiceIdFormat()
      
      try {
        const exists = await checkInvoiceIdExists(newInvoiceId)
        if (!exists) {
          return newInvoiceId
        }
      } catch (error) {
        console.error(`Error checking invoice ID on attempt ${attempts + 1}:`, error)
        throw error
      }
      
      attempts++
    }
    
    throw new Error('Failed to generate unique invoice ID after maximum attempts')
  }

  // Ensure the displayed invoice ID is unique, generate new one if needed
  const ensureUniqueInvoiceId = async (invoiceId) => {
    try {
      const exists = await checkInvoiceIdExists(invoiceId)
      if (!exists) {
        return invoiceId
      }
      
      // If the displayed ID exists, generate a new unique one
      return await generateUniqueInvoiceId()
    } catch (error) {
      console.error('Error ensuring unique invoice ID:', error)
      throw error
    }
  }

  // Signature handling functions
  const handleSignatureSave = useCallback((signatureDataUrl, signerType) => {
    if (signerType === 'checked') {
      setCheckedSignatureDataUrl(signatureDataUrl)
      Image.getSize(
        signatureDataUrl,
        (width, height) => setCheckedSignatureSize({ width, height }),
        () => setCheckedSignatureSize(null)
      )
    } else {
      setPreparedSignatureDataUrl(signatureDataUrl)
      Image.getSize(
        signatureDataUrl,
        (width, height) => setPreparedSignatureSize({ width, height }),
        () => setPreparedSignatureSize(null)
      )
    }
    setSignatureVisible(false)
  }, [])

  const clearSignature = useCallback((signerType) => {
    if (signerType === 'checked') {
      setCheckedSignatureDataUrl('')
      setCheckedSignatureSize(null)
    } else {
      setPreparedSignatureDataUrl('')
      setPreparedSignatureSize(null)
    }
  }, [])

  const rotateSignature = useCallback((signerType) => {
    if (signerType === 'checked') {
      setCheckedSignatureRotation((r) => (r + 90) % 360)
    } else {
      setPreparedSignatureRotation((r) => (r + 90) % 360)
    }
  }, [])

  const handleConfirm = async () => {
    if (!summary?.summary_id) {
      showSnackbar('Missing summary reference')
      return
    }
    if (hasInvoiceAssigned) {
      showSnackbar('Invoice ID already assigned')
      return
    }
    setConfirmationVisible(true)
  }

  const performStatusUpdate = async () => {
    try {
      setIsSubmitting(true)
      
      // Permanently assign an invoice ID and mark as receipted
      const uniqueInvoiceId = await ensureUniqueInvoiceId(generatedInvoiceId)

      // Atomic update: only set invoice_id if it is currently NULL
      const { data: updatedRow, error: updateError } = await supabase
        .from('summary')
        .update({ invoice_id: uniqueInvoiceId })
        .eq('id', summary.summary_id)
        .is('invoice_id', null)
        .select('id, invoice_id')
        .single()

      if (updateError) {
        // If no row was updated because invoice_id is already set, fetch and use the existing ID
        if (updateError.code === 'PGRST116') {
          const { data: existing, error: fetchError } = await supabase
            .from('summary')
            .select('invoice_id')
            .eq('id', summary.summary_id)
            .single()
          if (fetchError) throw fetchError
          if (existing?.invoice_id) {
            setCurrentInvoiceId(existing.invoice_id)
            showSnackbar('Invoice ID already assigned. Using existing ID.', true)
            return
          }
          // Fallback: if still no invoice_id, surface a friendly error
          throw new Error('Unable to assign or retrieve Invoice ID')
        }
        throw updateError
      }

      setSummaryStatusId(2)
      setCurrentInvoiceId(updatedRow?.invoice_id || uniqueInvoiceId)
      showSnackbar('Invoice ID permanently assigned', true)
    } catch (err) {
      console.error(err)
      showSnackbar(`Failed to update summary: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const buildTransactionsPayload = () => [{ summary_id: summary?.summary_id }]

  const buildInvoiceData = () => {
    const now = new Date()
    const due = new Date(now)
    due.setDate(due.getDate() + 30)
    return {
      invoice_id: currentInvoiceId || generatedInvoiceId,
      summary_id: summary?.summary_id,
      date: now.toISOString(),
      due_date: due.toISOString(),
    }
  }

  const handlePrint = async () => {
    try {
      if (!certify) {
        showSnackbar('Please certify the information to proceed')
        return
      }
      if (!hasInvoiceAssigned) {
        showSnackbar('Please assign an Invoice ID before printing or sharing')
        return
      }
      await printPDF(
        buildTransactionsPayload(),
        null,
        {
          prepared: preparedSignatureDataUrl,
          checked: checkedSignatureDataUrl,
          preparedRotation: preparedSignatureRotation,
          checkedRotation: checkedSignatureRotation,
        },
        { signatureOnFirstPage: true },
        null,
        buildInvoiceData()
      )
    } catch (error) {
      console.error('Error printing PDF:', error)
      showSnackbar(`Failed to print PDF: ${error.message}`)
    }
  }

  const handleShare = async () => {
    try {
      if (!certify) {
        showSnackbar('Please certify the information to proceed')
        return
      }
      if (!hasInvoiceAssigned) {
        showSnackbar('Please assign an Invoice ID before printing or sharing')
        return
      }
      await sharePDF(
        buildTransactionsPayload(),
        null,
        {
          prepared: preparedSignatureDataUrl,
          checked: checkedSignatureDataUrl,
          preparedRotation: preparedSignatureRotation,
          checkedRotation: checkedSignatureRotation,
        },
        { signatureOnFirstPage: true },
        buildInvoiceData()
      )
    } catch (error) {
      console.error('Error sharing PDF:', error)
      showSnackbar(`Failed to share PDF: ${error.message}`)
    }
  }

  // Signature component renderer
  const renderSignatureSection = (signerType, signatureDataUrl, signatureSize, signatureRotation) => {
    const isChecked = signerType === 'checked'
    const signerLabel = isChecked ? 'Checked by' : 'Prepared by'
    
    // Always render signature sections; allow editing regardless of assignment

    return (
      <>
        <Text style={[styles.label, { color: colors.onSurfaceVariant, marginTop: isChecked ? 12 : 0 }, fonts.bodySmall]}>
          {signerLabel}
        </Text>
        {signatureDataUrl ? (
          <View style={styles.signaturePreviewContainer}>
            <Image
              source={{ uri: signatureDataUrl }}
              style={[
                styles.signaturePreview,
                signatureSize
                  ? {
                      width: '100%',
                      height: undefined,
                      aspectRatio:
                        [90, 270].includes(((signatureRotation % 360) + 360) % 360)
                          ? signatureSize.height / signatureSize.width
                          : signatureSize.width / signatureSize.height,
                    }
                  : { minHeight: 120 },
                { transform: [{ rotate: `${signatureRotation}deg` }] },
              ]}
              resizeMode="contain"
              onLoad={(e) => {
                const src = e?.nativeEvent?.source
                if (src?.width && src?.height) {
                  if (isChecked) {
                    setCheckedSignatureSize({ width: src.width, height: src.height })
                  } else {
                    setPreparedSignatureSize({ width: src.width, height: src.height })
                  }
                }
              }}
            />
            <View style={{ height: 8 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button 
                mode="text" 
                onPress={() => clearSignature(signerType)}
                disabled={!canEditSignatures}
              >
                Clear
              </Button>
              <Button
                mode="text"
                onPress={() => rotateSignature(signerType)}
                disabled={!canEditSignatures}
              >
                Rotate 90°
              </Button>
            </View>
          </View>
        ) : (
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => { setActiveSigner(signerType); setSignatureVisible(true) }}
            style={{ marginTop: 4 }}
            disabled={!canEditSignatures}
          >
            Write signature ({signerLabel})
          </Button>
        )}
      </>
    )
  }

  useEffect(() => {
    const fetchSummaryStatus = async () => {
      try {
        if (!summary?.summary_id) return
        const { data, error } = await supabase
          .from('summary')
          .select('summary_status_id, invoice_id')
          .eq('id', summary.summary_id)
          .single()
        if (error) throw error
        setSummaryStatusId(data?.summary_status_id ?? 1)
        setCurrentInvoiceId(data?.invoice_id ?? null)
      } catch (err) {
        console.error('Error fetching summary status:', err)
      }
    }
    fetchSummaryStatus()
  }, [summary?.summary_id])

  useFocusEffect(
    useCallback(() => {
      // Generate new invoice ID on focus
      setGeneratedInvoiceId(generateInvoiceIdFormat())
      
      // Reset signature states
      setPreparedSignatureDataUrl('')
      setPreparedSignatureSize(null)
      setPreparedSignatureRotation(0)

      setCheckedSignatureDataUrl('')
      setCheckedSignatureSize(null)
      setCheckedSignatureRotation(0)

      setCertify(false)

      if (signatureRef.current) {
        signatureRef.current.clearSignature()
      }

      return () => {
        if (signatureRef.current) {
          signatureRef.current.clearSignature()
        }
      }
    }, [])
  )
    
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: colors.surface }]}>
        <Appbar.BackAction onPress={() => navigation.navigate('TransactionManagement', {segment:'completed'})} />
        <Appbar.Content title="View Invoice" titleStyle={[styles.headerTitle, { color: colors.onSurface }]} />
      </Appbar.Header>

      {SnackbarElement}

      <View style={styles.content}>
        <Card style={{ backgroundColor: colors.surface }}>
          <Card.Content>
            {/* Summary ID */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Summary ID</Text>
            <Text style={[styles.value, { color: colors.onSurface }, fonts.titleMedium]}>{summary?.summary_id || 'N/A'}</Text>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

            {/* Invoice ID */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Invoice ID</Text>
            <Text style={[styles.value, { color: colors.primary }, fonts.titleMedium]}>
              {currentInvoiceId || generatedInvoiceId}
            </Text>
            {hasInvoiceAssigned && (
              <Text style={[styles.value, { color: colors.onSurfaceVariant, fontSize: 12 }, fonts.bodySmall]}>
                (Current assigned invoice)
              </Text>
            )}
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

            {/* Signatures */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Signatures</Text>
            
            {/* Prepared by signature */}
            {renderSignatureSection('prepared', preparedSignatureDataUrl, preparedSignatureSize, preparedSignatureRotation)}
            
            {/* Checked by signature */}
            {renderSignatureSection('checked', checkedSignatureDataUrl, checkedSignatureSize, checkedSignatureRotation)}

            {/* Certification - always available */}
            <View style={styles.checkboxRow}>
              <Checkbox
                status={certify ? 'checked' : 'unchecked'}
                onPress={() => setCertify(prev => !prev)}
                color={colors.primary}
                disabled={!canEditSignatures}
              />
              <Text style={[{ color: colors.onSurfaceVariant, flex: 1 }, fonts.bodySmall]}>
                I certify that the above information is correct. My handwritten signature is valid for this invoice.
              </Text>
            </View>

            {/* Include e-signatures toggle removed; signatures are always allowed */}

            <View style={{ height: 8 }} />

            {/* Notice if invoice already assigned */}
            {hasInvoiceAssigned && (
              <></>
            )}
            {/* Confirm Button */}
            {!hasInvoiceAssigned && (
              <Button
                mode="contained"
                onPress={handleConfirm}
                disabled={isSubmitting}
                loading={isSubmitting}
                style={{ marginTop: 16 }}
                contentStyle={{ height: 48 }}
              >
                Permanently Assign Invoice ID
              </Button>
            )}
            {/* Print / Share buttons - always available */}
            <Button
              mode="outlined"
              icon="printer"
              onPress={handlePrint}
              disabled={!certify || !hasInvoiceAssigned}
              style={{ marginTop: 4 }}
              contentStyle={{ height: 48 }}
            >
              Print
            </Button>

            <Button
              mode="outlined"
              icon="share"
              onPress={handleShare}
              disabled={!certify || !hasInvoiceAssigned}
              style={{ marginTop: 8 }}
              contentStyle={{ height: 48 }}
            >
              Share
            </Button>
          </Card.Content>
        </Card>
      </View>
      <Portal>
          <Modal
            visible={signatureVisible}
            onDismiss={() => setSignatureVisible(false)}
            contentContainerStyle={[styles.fullscreenModal, { backgroundColor: colors.surface }]}
          >
            <View style={styles.signatureModalContent}>
              <Text style={[{ marginBottom: 8, color: colors.onSurface, paddingHorizontal: 16 }, fonts.titleMedium]}>
                {activeSigner === 'checked' ? 'Write signature (Checked by)' : 'Write signature (Prepared by)'}
              </Text>
              <View style={styles.fullscreenSignaturePad}>
                <Signature
                  ref={signatureRef}
                  style={{ flex: 1 }}
                  onOK={(sig) => handleSignatureSave(sig, activeSigner)}
                  onEmpty={() => {}}
                  descriptionText=""
                  webStyle="html,body{height:100%;margin:0;padding:0;background:transparent}.m-signature-pad{box-shadow:none;border:0;height:100%;max-height:100%;background:transparent}.m-signature-pad--footer{display:none}.m-signature-pad--body{border:0;height:100%;background:transparent}.m-signature-pad--body canvas{width:100%!important;height:100%!important;background:transparent}"
                  backgroundColor="rgba(0,0,0,0)"
                  imageType="image/png"
                  trimWhitespace
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 16 }}>
                <Button mode="outlined" onPress={() => signatureRef.current?.clearSignature()}>Clear</Button>
                <Button mode="contained" onPress={() => signatureRef.current?.readSignature()}>Save</Button>
              </View>
              <Button mode="text" onPress={() => setSignatureVisible(false)} style={{ marginTop: 8, paddingHorizontal: 16, paddingBottom: 16 }}>Close</Button>
            </View>
          </Modal>

          {/* Confirmation Dialog for Permanent Assignment */}
          <Modal
            visible={confirmationVisible}
            onDismiss={() => setConfirmationVisible(false)}
            contentContainerStyle={[styles.confirmationModal, { backgroundColor: colors.surface }]}
          >
            <View style={styles.confirmationContent}>
              <Text style={[styles.confirmationTitle, { color: colors.onSurface }, fonts.titleLarge]}>
                Confirm Action
              </Text>
              <Text style={[styles.confirmationMessage, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>
                This will permanently assign an Invoice ID and mark the summary as receipted. This action cannot be undone.
              </Text>
              <View style={styles.confirmationButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setConfirmationVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    setConfirmationVisible(false)
                    performStatusUpdate()
                  }}
                  style={{ flex: 1, marginLeft: 8 }}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Confirm
                </Button>
              </View>
            </View>
          </Modal>
      </Portal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  divider: { marginVertical: 12 },
  label: { marginBottom: 4 },
  value: { marginBottom: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  signaturePreviewContainer: { marginTop: 8, alignItems: 'center' },
  signaturePreview: { width: '100%', height: 120, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ddd' },
  fullscreenModal: { flex: 1, margin: 0, borderRadius: 0, paddingTop: 16 },
  signatureModalContent: { flex: 1 },
  fullscreenSignaturePad: { flex: 1, minHeight: '75%' },
  confirmationModal: { margin: 20, borderRadius: 8 },
  confirmationContent: { padding: 24 },
  confirmationTitle: { marginBottom: 16, textAlign: 'center' },
  confirmationMessage: { marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  confirmationButtons: { flexDirection: 'row', gap: 8 },
})

export default CreateInvoice