import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, View, StyleSheet, Image } from 'react-native'
import { useTheme, Appbar, Card, Text, Button, Divider, Checkbox, Portal, Modal, Dialog, TextInput, Menu, ProgressBar } from 'react-native-paper'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../../../../lib/supabase'
import { printPDF, sharePDF, createPDFFile, splitPDFFile } from '../../../../../utils/pdfUtils'
import * as FileSystem from 'expo-file-system/legacy'
const RESEND_API_KEY =  process.env.EXPO_PUBLIC_RESEND_API_KEY
import useSnackbar from '../../../../hooks/useSnackbar'
import Signature from 'react-native-signature-canvas'
// Optimized limits for different scenarios
export const RESEND_ATTACHMENT_LIMIT = Math.round(25 * 1024 * 1024) // 25MB for Resend API
export const GMAIL_ATTACHMENT_LIMIT = Math.round(25 * 1024 * 1024) // 25MB for Gmail
export const CHUNK_SIZE = Math.round(5 * 1024 * 1024) // 5MB chunks for processing
export const MAX_ATTACHMENTS_PER_EMAIL = 10 // Limit attachments per email

const CreateInvoice = () => {
  const { colors, fonts } = useTheme()
  const navigation = useNavigation()
  const route = useRoute()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const { summary } = route.params || {}
  const [sendProgress, setSendProgress] = useState(0)
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
  const [emailDialogVisible, setEmailDialogVisible] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [corporationEmails, setCorporationEmails] = useState([])
  const [menuVisible, setMenuVisible] = useState(false)
  const menuAnchorRef = useRef(null)

  // Data states
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null)
  const [pdfFileSize, setPdfFileSize] = useState(null)

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
        // Use normal sharePDF
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

  const handleOpenEmailDialog = () => {
    setEmailInput('')
    setEmailDialogVisible(true)
  }

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  const handleSendEmail = async () => {
    try {
      const email = (emailInput || '').trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showSnackbar('Please enter a valid email address');
        return;
      }

      setIsSendingEmail(true);
      setSendProgress(0);
      showSnackbar(`Preparing PDF(s) for ${email}...`, true);

      const transactions = buildTransactionsPayload();
      if (!transactions || transactions.length === 0) {
        showSnackbar('No transactions available');
        return;
      }

      // Create PDF
      setSendProgress(20);
      const pdfData = await createPDFFile(
        transactions,
        null,
        {
          prepared: preparedSignatureDataUrl,
          checked: checkedSignatureDataUrl,
          preparedRotation: preparedSignatureRotation,
          checkedRotation: checkedSignatureRotation,
        },
        { signatureOnFirstPage: true },
        buildInvoiceData()
      );

      if (!pdfData?.path) {
        showSnackbar('Failed to generate PDF');
        return;
      }

      // Split PDF if too large
      const fileInfo = await FileSystem.getInfoAsync(pdfData.path);
      let filesToSend = [];
      
      if (fileInfo.size > RESEND_ATTACHMENT_LIMIT) {
        showSnackbar(`PDF is large (${formatFileSize(fileInfo.size)}). Splitting into smaller parts...`);
        filesToSend = await splitPDFFile(pdfData.path, RESEND_ATTACHMENT_LIMIT);
      } else {
        filesToSend = [pdfData.path];
      }
      setSendProgress(60);

      // Create attachments
      const attachments = [];
      for (let i = 0; i < filesToSend.length; i++) {
        const base64 = await FileSystem.readAsStringAsync(filesToSend[i], {
          encoding: FileSystem.EncodingType.Base64,
        });

        attachments.push({
          filename: filesToSend.length > 1 ? `Invoice_part${i + 1}.pdf` : `Invoice.pdf`,
          content: base64,
        });

        setSendProgress(60 + Math.floor(((i + 1) / filesToSend.length) * 30));
      }

      if (attachments.length === 0) {
        showSnackbar('Failed to create any PDF attachments');
        return;
      }

      // 4) build and send email
      const body = {
        from: 'EasyTrack <easytrack@ghe-easytrack.org>',
        to: [email],
        subject: 'Your Invoice & SOA PDF',
        html: `<p>Please find the attached invoice and summary report (split into ${attachments.length} part(s)).</p>`,
        text: 'Please find your invoice attached.',
        attachments,
      };

      setSendProgress(90);
      let response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        showSnackbar(`Failed to send email: ${response.status} ${errText}`);
        setSendProgress(0);
        return;
      }

      setSendProgress(95);
      showSnackbar(`Email sent to ${email} with ${attachments.length} attachment(s).`, true);
      
      // Update summary status
      if (summary?.summary_id) {
        const { error: statusUpdateError } = await supabase
          .from('summary')
          .update({ summary_status_id: 2 })
          .eq('id', summary.summary_id);
        if (statusUpdateError) console.error('Error updating summary_status_id:', statusUpdateError);
      }
      
      setSendProgress(100);
      setEmailDialogVisible(false);
    } catch (error) {
      console.error('Error sending email:', error);
      showSnackbar(`Failed to send email: ${error.message}`);
    } finally {
      setIsSendingEmail(false);
      setSendProgress(0);
    }
  };

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
    const fetchCorporationEmails = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles_corporation')
          .select('corporation_email')
        if (error) throw error
        setCorporationEmails(data?.map(d => d.corporation_email).filter(Boolean) || [])
      } catch (err) {
        console.error('Error fetching corporation emails:', err)
      }
    }
    fetchCorporationEmails()
  }, [])
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
        // compute PDF size for display
        try {
          const pdfData = await createPDFFile(
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
          if (pdfData?.path) {
            const info = await FileSystem.getInfoAsync(pdfData.path)
            if (info && info.exists && typeof info.size === 'number') {
              setPdfFileSize(info.size)
            }
          }
        } catch (e) {
          console.warn('Failed to compute PDF size:', e)
        }
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

            {/* Invoice ID */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Invoice ID</Text>
            <Text style={[styles.value, { color: colors.primary }, fonts.titleMedium]}>
              {currentInvoiceId || 'Not assigned'}
            </Text>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

            {/* Summary ID */}
            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>Summary ID</Text>
            <Text style={[styles.value, { color: colors.onSurface }, fonts.titleMedium]}>{summary?.summary_id || 'N/A'}</Text>
            <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />

            <Text style={[styles.label, { color: colors.onSurfaceVariant }, fonts.bodyMedium]}>File Size</Text>
            {pdfFileSize != null && (
              <Text style={[{ color: colors.onSurfaceVariant, marginTop: 4 }, fonts.bodySmall]}>PDF size: {formatBytes(pdfFileSize)}</Text>
            )}
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

            <Button
              mode="contained"
              icon="email"
              onPress={handleOpenEmailDialog}
              disabled={(hasExistingSignatures && !certify)}
              style={{ marginTop: 8 }}
              contentStyle={{ height: 48 }}
            >
              Send Email
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
          <Dialog
            visible={emailDialogVisible}
            onDismiss={() => setEmailDialogVisible(false)}
            style={[styles.emailDialog, { backgroundColor: colors.surface }]}
          >
            <Dialog.Title style={[styles.emailDialogTitle, { color: colors.onSurface }]}>Send to email</Dialog.Title>
            <Dialog.Content style={styles.emailDialogContent}>
            <View>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                contentStyle={{ backgroundColor: colors.surface }}
                anchor={
                  <TextInput
                    mode="outlined"
                    label="Recipient email"
                    placeholder="name@example.com"
                    value={emailInput}
                    onChangeText={setEmailInput}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    style={styles.emailDialogInput}
                    disabled={isSendingEmail}
                    left={
                      corporationEmails.length > 0 ? (
                        <TextInput.Icon
                          icon="chevron-down"
                          onPress={() => setMenuVisible((prev) => !prev)}
                          forceTextInputFocus={false}
                        />
                      ) : null
                    }
                  />
                }
              >
                {corporationEmails.map((email, idx) => (
                  <Menu.Item
                    key={idx}
                    onPress={() => {
                      setEmailInput(email)
                      setMenuVisible(false)
                    }}
                    title={email}
                  />
                ))}
              </Menu>
              {isSendingEmail && (
                <View style={{ paddingVertical: 10 }}>
                  <ProgressBar progress={sendProgress / 100} color={colors.primary} />
                  <Text style={{ textAlign: 'center', marginTop: 5 }}>
                    {sendProgress}% Sending...
                  </Text>
                </View>
              )}
            </View>
            </Dialog.Content>
            <Dialog.Actions style={styles.emailDialogActions}>
              <Button onPress={() => setEmailDialogVisible(false)} disabled={isSendingEmail} textColor={colors.primary}>Cancel</Button>
              <Button onPress={handleSendEmail} loading={isSendingEmail} disabled={isSendingEmail} textColor={colors.primary}>
                {isSendingEmail ? 'Sending...' : 'Send'}
              </Button>
            </Dialog.Actions>
          </Dialog>
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
  emailDialog: { borderRadius: 12 },
  emailDialogTitle: { fontWeight: 'bold' },
  emailDialogContent: { paddingTop: 8 },
  emailDialogInput: { marginTop: 4 },
  emailDialogActions: { paddingHorizontal: 16, paddingBottom: 8 },
})

export default CreateInvoice