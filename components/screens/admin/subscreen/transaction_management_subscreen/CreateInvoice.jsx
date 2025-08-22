import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, View, StyleSheet, Image } from 'react-native'
import { useTheme, Appbar, Card, Text, Button, Divider, Checkbox, Portal, Modal } from 'react-native-paper'
import { useNavigation, useRoute } from '@react-navigation/native'
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

  const [preparedSignatureDataUrl, setPreparedSignatureDataUrl] = useState('')
  const [checkedSignatureDataUrl, setCheckedSignatureDataUrl] = useState('')
  const [preparedSignatureRotation, setPreparedSignatureRotation] = useState(0) // degrees: 0,90,180,270
  const [checkedSignatureRotation, setCheckedSignatureRotation] = useState(0)
  const [preparedSignatureSize, setPreparedSignatureSize] = useState(null) // { width, height }
  const [checkedSignatureSize, setCheckedSignatureSize] = useState(null)
  const [signatureVisible, setSignatureVisible] = useState(false)
  const [activeSigner, setActiveSigner] = useState(null) // 'prepared' | 'checked'
  const [certify, setCertify] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [summaryStatusId, setSummaryStatusId] = useState(null)
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null)

  // Function to generate a unique invoice ID that doesn't exist in the summary table
  const generateUniqueInvoiceId = async () => {
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      const now = new Date()
      const yyyy = String(now.getFullYear())
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const hh = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      const ms = String(now.getMilliseconds()).padStart(3, '0')
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const newInvoiceId = `INV-${yyyy}${mm}${dd}-${hh}${min}${ss}${ms}-${rand}`
      
      // Check if this invoice_id already exists in the summary table
      const { data, error } = await supabase
        .from('summary')
        .select('id')
        .eq('invoice_id', newInvoiceId)
        .single()
      
      if (error && error.code === 'PGRST116') {
        // No record found, this invoice_id is unique
        return newInvoiceId
      } else if (error) {
        throw error
      }
      
      // If we get here, the invoice_id already exists, try again
      attempts++
    }
    
    throw new Error('Failed to generate unique invoice ID after maximum attempts')
  }

  const generatedInvoiceId = useMemo(() => {
    const now = new Date()
    const yyyy = String(now.getFullYear())
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `INV-${yyyy}${mm}${dd}-${hh}${min}${ss}${ms}-${rand}`
  }, [])

  const signatureRef = useRef(null)

  const handleConfirm = async () => {
    if (!summary?.summary_id) {
      showSnackbar('Missing summary reference')
      return
    }

    const nextStatusId = summaryStatusId === 1 ? 2 : 1

    if (nextStatusId === 2) {
      if (!preparedSignatureDataUrl || !checkedSignatureDataUrl) {
        showSnackbar('Please provide both signatures')
        return
      }
      if (!certify) {
        showSnackbar('Please certify the information to proceed')
        return
      }
    }

    try {
      setIsSubmitting(true)
      
      let updateData = { summary_status_id: nextStatusId }
      
      if (nextStatusId === 2) {
        // Mark as receipted - generate and set unique invoice_id
        const uniqueInvoiceId = await generateUniqueInvoiceId()
        updateData.invoice_id = uniqueInvoiceId
      } else {
        // Unmark as receipted - set invoice_id to null
        updateData.invoice_id = null
      }
      
      const { error } = await supabase
        .from('summary')
        .update(updateData)
        .eq('id', summary.summary_id)
        
      if (error) throw error
      
      setSummaryStatusId(nextStatusId)
      if (nextStatusId === 2) {
        setCurrentInvoiceId(updateData.invoice_id)
        showSnackbar('Marked as receipted', true)
        navigation.navigate('TransactionManagement', { segment: 'completed' })
      } else {
        setCurrentInvoiceId(null)
        showSnackbar('Unmarked as receipted', true)
        navigation.navigate('TransactionManagement', { segment: 'completed' })
      }
    } catch (err) {
      console.error(err)
      showSnackbar(`Failed to update summary: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canGenerateOutputs = useMemo(
    () => Boolean(preparedSignatureDataUrl) && Boolean(checkedSignatureDataUrl) && certify,
    [preparedSignatureDataUrl, checkedSignatureDataUrl, certify]
  )

  const buildTransactionsPayload = () => [{ summary_id: summary?.summary_id }]

  // Ephemeral signature only; do not persist to storage

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
      if (!canGenerateOutputs) {
        showSnackbar('Provide signature and certification first')
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
      if (!canGenerateOutputs) {
        showSnackbar('Provide signature and certification first')
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
            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Summary ID</Text>
            <Text style={[styles.value, { color: colors.onSurface }, fonts.titleMedium]}>{summary?.summary_id || 'N/A'}</Text>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Invoice ID</Text>
            <Text style={[styles.value, { color: colors.primary }, fonts.titleMedium]}>
              {currentInvoiceId || generatedInvoiceId}
            </Text>
            {currentInvoiceId && (
              <Text style={[styles.value, { color: colors.onSurfaceVariant, fontSize: 12 }, fonts.bodySmall]}>
                (Current assigned invoice)
              </Text>
            )}

            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Signatures</Text>

            {/* Prepared by */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodySmall]}>Prepared by</Text>
            {preparedSignatureDataUrl ? (
              <View style={styles.signaturePreviewContainer}>
                <Image
                  source={{ uri: preparedSignatureDataUrl }}
                  style={[
                    styles.signaturePreview,
                    preparedSignatureSize
                      ? {
                          width: '100%',
                          height: undefined,
                          aspectRatio:
                            [90, 270].includes(((preparedSignatureRotation % 360) + 360) % 360)
                              ? preparedSignatureSize.height / preparedSignatureSize.width
                              : preparedSignatureSize.width / preparedSignatureSize.height,
                        }
                      : { minHeight: 120 },
                    { transform: [{ rotate: `${preparedSignatureRotation}deg` }] },
                  ]}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const src = e?.nativeEvent?.source
                    if (src?.width && src?.height) {
                      setPreparedSignatureSize({ width: src.width, height: src.height })
                    }
                  }}
                />
                <View style={{ height: 8 }} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Button mode="text" onPress={() => { setPreparedSignatureDataUrl(''); setPreparedSignatureSize(null) }}>Clear</Button>
                  <Button
                    mode="text"
                    onPress={() => setPreparedSignatureRotation((r) => (r + 90) % 360)}
                  >
                    Rotate 90°
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="pencil"
                onPress={() => { setActiveSigner('prepared'); setSignatureVisible(true) }}
                style={{ marginTop: 4 }}
              >
                Write signature (Prepared by)
              </Button>
            )}

            {/* Checked by */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant, marginTop: 12 }, fonts.bodySmall]}>Checked by</Text>
            {checkedSignatureDataUrl ? (
              <View style={styles.signaturePreviewContainer}>
                <Image
                  source={{ uri: checkedSignatureDataUrl }}
                  style={[
                    styles.signaturePreview,
                    checkedSignatureSize
                      ? {
                          width: '100%',
                          height: undefined,
                          aspectRatio:
                            [90, 270].includes(((checkedSignatureRotation % 360) + 360) % 360)
                              ? checkedSignatureSize.height / checkedSignatureSize.width
                              : checkedSignatureSize.width / checkedSignatureSize.height,
                        }
                      : { minHeight: 120 },
                    { transform: [{ rotate: `${checkedSignatureRotation}deg` }] },
                  ]}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const src = e?.nativeEvent?.source
                    if (src?.width && src?.height) {
                      setCheckedSignatureSize({ width: src.width, height: src.height })
                    }
                  }}
                />
                <View style={{ height: 8 }} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Button mode="text" onPress={() => { setCheckedSignatureDataUrl(''); setCheckedSignatureSize(null) }}>Clear</Button>
                  <Button
                    mode="text"
                    onPress={() => setCheckedSignatureRotation((r) => (r + 90) % 360)}
                  >
                    Rotate 90°
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="pencil"
                onPress={() => { setActiveSigner('checked'); setSignatureVisible(true) }}
                style={{ marginTop: 4 }}
              >
                Write signature (Checked by)
              </Button>
            )}

            <View style={styles.checkboxRow}>
              <Checkbox
                status={certify ? 'checked' : 'unchecked'}
                onPress={() => setCertify(prev => !prev)}
                color={colors.primary}
              />
              <Text style={[{ color: colors.onSurfaceVariant, flex: 1 }, fonts.bodySmall]}>
                I certify that the above information is correct. My handwritten signature is valid for this invoice.
              </Text>
            </View>

            <View style={{ height: 8 }} />

            <Button
              mode="outlined"
              icon="printer"
              onPress={handlePrint}
              disabled={!canGenerateOutputs}
              style={{ marginTop: 4 }}
              contentStyle={{ height: 48 }}
            >
              Print
            </Button>

            <Button
              mode="outlined"
              icon="share"
              onPress={handleShare}
              disabled={!canGenerateOutputs}
              style={{ marginTop: 8 }}
              contentStyle={{ height: 48 }}
            >
              Share
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              disabled={isSubmitting}
              loading={isSubmitting}
              style={{ marginTop: 16 }}
              contentStyle={{ height: 48 }}
            >
              {summaryStatusId === 1 ? 'Mark as Receipted' : 'Unmark as Receipted'}
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
                  onOK={(sig) => {
                    if (activeSigner === 'checked') {
                      setCheckedSignatureDataUrl(sig)
                      Image.getSize(
                        sig,
                        (width, height) => setCheckedSignatureSize({ width, height }),
                        () => setCheckedSignatureSize(null)
                      )
                    } else {
                      setPreparedSignatureDataUrl(sig)
                      Image.getSize(
                        sig,
                        (width, height) => setPreparedSignatureSize({ width, height }),
                        () => setPreparedSignatureSize(null)
                      )
                    }
                    setSignatureVisible(false)
                  }}
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