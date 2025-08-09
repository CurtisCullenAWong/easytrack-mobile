import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, StyleSheet, Image } from 'react-native'
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

  const [signatureDataUrl, setSignatureDataUrl] = useState('')
  const [signatureVisible, setSignatureVisible] = useState(false)
  const [certify, setCertify] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [summaryStatusId, setSummaryStatusId] = useState(null)


  const generatedInvoiceId = useMemo(() => {
    const now = new Date()
    const yyyy = String(now.getFullYear())
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `INV-${yyyy}${mm}${dd}-${rand}`
  }, [])

  const signatureRef = useRef(null)

  const handleConfirm = async () => {
    if (!summary?.summary_id) {
      showSnackbar('Missing summary reference')
      return
    }

    const nextStatusId = summaryStatusId === 1 ? 2 : 1

    if (nextStatusId === 2) {
      if (!signatureDataUrl) {
        showSnackbar('Please provide your signature')
        return
      }
      if (!certify) {
        showSnackbar('Please certify the information to proceed')
        return
      }
    }

    try {
      setIsSubmitting(true)
      const { error } = await supabase
        .from('summary')
        .update({ summary_status_id: nextStatusId })
        .eq('id', summary.summary_id)
      if (error) throw error
      setSummaryStatusId(nextStatusId)
      if (nextStatusId === 2) {
        showSnackbar('Marked as receipted', true)
        navigation.navigate('TransactionManagement', { segment: 'completed' })
      } else {
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

  const canGenerateOutputs = useMemo(() => Boolean(signatureDataUrl) && certify, [signatureDataUrl, certify])

  const buildTransactionsPayload = () => [{ summary_id: summary?.summary_id }]

  // Ephemeral signature only; do not persist to storage

  const handlePrint = async () => {
    try {
      if (!canGenerateOutputs) {
        showSnackbar('Provide signature and certification first')
        return
      }
      await printPDF(buildTransactionsPayload(), null, signatureDataUrl, { signatureOnFirstPage: true })
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
      await sharePDF(buildTransactionsPayload(), null, signatureDataUrl, { signatureOnFirstPage: true })
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
          .select('summary_status_id')
          .eq('id', summary.summary_id)
          .single()
        if (error) throw error
        setSummaryStatusId(data?.summary_status_id ?? 1)
      } catch (err) {
        console.error('Error fetching summary status:', err)
      }
    }
    fetchSummaryStatus()
  }, [summary?.summary_id])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: colors.surface }]}>
        <Appbar.BackAction onPress={() => navigation.navigate('TransactionManagement', {segment:'completed'})} />
        <Appbar.Content title="Create Invoice" titleStyle={[styles.headerTitle, { color: colors.onSurface }]} />
      </Appbar.Header>

      {SnackbarElement}

      <View style={styles.content}>
        <Card style={{ backgroundColor: colors.surface }}>
          <Card.Content>
            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Summary ID</Text>
            <Text style={[styles.value, { color: colors.onSurface }, fonts.titleMedium]}>{summary?.summary_id || 'N/A'}</Text>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Generated Invoice ID</Text>
            <Text style={[styles.value, { color: colors.primary }, fonts.titleMedium]}>{generatedInvoiceId}</Text>

            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Signature</Text>
            {signatureDataUrl ? (
              <View style={styles.signaturePreviewContainer}>
                <Image source={{ uri: signatureDataUrl }} style={styles.signaturePreview} resizeMode="contain" />
                <View style={{ height: 8 }} />
                <Button mode="text" onPress={() => setSignatureDataUrl('')}>Clear signature</Button>
              </View>
            ) : (
              <Button mode="outlined" icon="pencil" onPress={() => setSignatureVisible(true)} style={{ marginTop: 4 }}>
                Write signature
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
          contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.surface }]}
        >
          <Text style={[{ marginBottom: 8, color: colors.onSurface }, fonts.titleMedium]}>Write your signature</Text>
          <View style={styles.signaturePad}>
            <Signature
              ref={signatureRef}
              onOK={(sig) => {
                setSignatureDataUrl(sig)
                setSignatureVisible(false)
              }}
              onEmpty={() => {}}
              descriptionText=""
              webStyle=".m-signature-pad{box-shadow:none;border:1px solid #ccc}.m-signature-pad--footer{display:none}"
              backgroundColor="#ffffff"
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Button mode="outlined" onPress={() => signatureRef.current?.clearSignature()}>Clear</Button>
            <Button mode="contained" onPress={() => signatureRef.current?.readSignature()}>Save</Button>
          </View>
          <Button mode="text" onPress={() => setSignatureVisible(false)} style={{ marginTop: 8 }}>Close</Button>
        </Modal>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  divider: { marginVertical: 12 },
  label: { marginBottom: 4 },
  value: { marginBottom: 8 },
  input: { marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  signaturePreviewContainer: { marginTop: 8, alignItems: 'center' },
  signaturePreview: { width: '100%', height: 120, backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#ddd' },
  modalContainer: { margin: 16, padding: 16, borderRadius: 12 },
  signaturePad: { height: 220 },
})

export default CreateInvoice


