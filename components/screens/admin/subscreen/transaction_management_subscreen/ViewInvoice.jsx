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
  
  // Data states
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null)

  const signatureRef = useRef(null)

  // Computed values for better UI state management
  const canEditSignatures = true
  const hasExistingSignatures = useMemo(() => 
    Boolean(preparedSignatureDataUrl || checkedSignatureDataUrl), 
    [preparedSignatureDataUrl, checkedSignatureDataUrl]
  )

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

  const buildTransactionsPayload = () => [{ summary_id: summary?.summary_id }]

  const buildInvoiceData = () => {
    const now = new Date()
    const due = new Date(now)
    due.setDate(due.getDate() + 30)
    return {
      invoice_id: currentInvoiceId,
      summary_id: summary?.summary_id,
      date: now.toISOString(),
      due_date: due.toISOString(),
    }
  }

  const handlePrint = async () => {
    try {
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
        setCurrentInvoiceId(data?.invoice_id ?? null)
      } catch (err) {
        console.error('Error fetching summary status:', err)
      }
    }
    fetchSummaryStatus()
  }, [summary?.summary_id])

  useFocusEffect(
    useCallback(() => {
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
              {currentInvoiceId || 'Not assigned'}
            </Text>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

            {/* Signatures */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Signatures</Text>
            
            {/* Prepared by signature */}
            {renderSignatureSection('prepared', preparedSignatureDataUrl, preparedSignatureSize, preparedSignatureRotation)}
            
            {/* Checked by signature */}
            {renderSignatureSection('checked', checkedSignatureDataUrl, checkedSignatureSize, checkedSignatureRotation)}

            {/* Certification - only visible when there are signatures */}
            {hasExistingSignatures && (
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
            )}

            <View style={{ height: 8 }} />

            {/* Print / Share buttons - only available if invoice ID is assigned */}
            <Button
              mode="outlined"
              icon="printer"
              onPress={handlePrint}
              disabled={(hasExistingSignatures && !certify)}
              style={{ marginTop: 4 }}
              contentStyle={{ height: 48 }}
            >
              Print
            </Button>

            <Button
              mode="outlined"
              icon="share"
              onPress={handleShare}
              disabled={(hasExistingSignatures && !certify)}
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
})

export default CreateInvoice