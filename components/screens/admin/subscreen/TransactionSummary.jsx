import React, { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, Alert, Image } from 'react-native'
import { useTheme, Text, Button, TextInput, Portal, Dialog, Appbar, Card } from 'react-native-paper'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import Header from '../../../customComponents/Header'
import { supabase } from '../../../../lib/supabaseAdmin'
import { printPDF, sharePDF } from '../../../../utils/pdfUtils'
import useSnackbar from '../../../hooks/useSnackbar'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'

const TransactionSummary = () => {
  const { colors, fonts } = useTheme()
  const navigation = useNavigation()
  const route = useRoute()
  const { showSnackbar, SnackbarElement } = useSnackbar()
  const [currentTime, setCurrentTime] = useState('')

  const { summaryData, transactions } = route.params
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceImage, setInvoiceImage] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dialogs, setDialogs] = useState({
    imageSource: false,
    permission: false
  })

  // Reset form fields when screen is focused
  useFocusEffect(
    useCallback(() => {
      setInvoiceNumber('')
      setInvoiceImage(null)
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

  const handleImageSource = async (source) => {
    setDialogs(prev => ({ ...prev, imageSource: false }))
    
    try {
      const options = { 
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
        aspect: [3, 4],
      }

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled) {
        setInvoiceImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error picking image:', error)
      showSnackbar('Error picking image: ' + error.message)
    }
  }

  const uploadInvoiceImage = async () => {
    if (!invoiceImage?.startsWith('file://')) {
      return null
    }
  
    try {
      const bucket = 'invoices'
      const fileName = `${invoiceNumber}.png`
      const filePath = `/${fileName}`

      // Delete existing file if it exists
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([filePath])

      // Ignore delete error if file doesn't exist
      if (deleteError && !deleteError.message.includes('not found')) {
        console.error('Error deleting existing file:', deleteError)
      }

      const base64 = await FileSystem.readAsStringAsync(invoiceImage, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const contentType = 'image/png'
      
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, decode(base64), { 
          contentType,
          upsert: true
        })
    
      if (error) {
        showSnackbar('Error uploading image: ' + error.message)
        return null
      }

      // Get a signed URL that's valid for a long time (e.g., 1 year)
      const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 31536000)

      if (signedUrlError) {
        throw signedUrlError
      }

      return signedUrl
    } catch (error) {
      showSnackbar('Error uploading image: ' + error.message)
      return null
    }
  }

  const pickImage = () => {
    setDialogs(prev => ({ ...prev, imageSource: true }))
  }

  const handleAssignInvoice = async () => {
    try {
      if (!invoiceNumber.trim()) {
        showSnackbar('Please enter an invoice number')
        return
      }

      if (!invoiceImage) {
        showSnackbar('Please upload an invoice image')
        return
      }

      setUploading(true)

      // Upload invoice image if selected
      const invoiceImageUrl = await uploadInvoiceImage()

      // Calculate total charge
      const totalCharge = transactions.reduce((sum, t) => {
        const baseAmount = (t.delivery_charge || 0) + (t.surcharge || 0)
        const discountedAmount = baseAmount * (1 - ((t.discount || 0) / 100))
        return sum + discountedAmount
      }, 0)

      // Calculate due date (30 days from now)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      // Insert into payment table
      const { data: payment, error: paymentError } = await supabase
        .from('payment')
        .insert({
          id: invoiceNumber,
          total_charge: totalCharge,
          due_date: dueDate.toISOString(),
          invoice_image: invoiceImageUrl
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Update all contracts with the invoice number
      const { error: contractError } = await supabase
        .from('contract')
        .update({ payment_id: invoiceNumber })
        .in('id', transactions.map(t => t.id))

      if (contractError) throw contractError

      showSnackbar('Invoice assigned successfully', true)
      
      // Navigate back to TransactionManagement with completed receipts segment
      navigation.navigate('TransactionManagement', { segment: 'completed' })
    } catch (error) {
      console.error('Error assigning invoice:', error)
      showSnackbar('Failed to assign invoice: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const ImagePreview = ({ uri }) => {
    if (!uri) return null
    return (
      <View style={styles.imagePreviewContainer}>
        <Image 
          source={{ uri }} 
          style={styles.imagePreview}
          resizeMode="contain"
        />
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('TransactionManagement')} />
        <Appbar.Content title="Transaction Summary" />
      </Appbar.Header>
      {SnackbarElement}

      <Card style={[styles.timeCard, { backgroundColor: colors.surface, elevation: colors.elevation.level3 }]}>
        <Card.Content style={styles.timeCardContent}>
          <Text style={fonts.titleSmall}>{currentTime}</Text>
        </Card.Content>
      </Card>

      <View style={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryText, { color: colors.onSurface }]}>
            Total Transactions: {summaryData.totalTransactions}
          </Text>
          <Text style={[styles.summaryText, { color: colors.onSurface }]}>
            Total Amount: {formatCurrency(summaryData.totalAmount)}
          </Text>
          <Text style={[styles.summaryText, { color: colors.onSurface }]}>
            Total Surcharge: {formatCurrency(summaryData.totalSurcharge)}
          </Text>
          <Text style={[styles.summaryText, { color: colors.onSurface }]}>
            Total Discount: {formatCurrency(summaryData.totalDiscount)}
          </Text>
          
          <Text style={[styles.summaryText, { color: colors.onSurface, marginTop: 16 }]}>
            Status Breakdown:
          </Text>
          {Object.entries(summaryData.statusCounts).map(([status, count]) => (
            <Text key={status} style={[styles.summaryText, { color: colors.onSurface, marginLeft: 16 }]}>
              {status}: {count}
            </Text>
          ))}
        </View>

        <View style={[styles.invoiceCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            Assign Invoice Number
          </Text>
          <TextInput
            label="Invoice Number"
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            mode="outlined"
            style={styles.invoiceInput}
            placeholder="Enter invoice number - YYYYMMDDxx"
          />
          
          <Button
            mode="outlined"
            onPress={pickImage}
            style={styles.uploadButton}
            icon="camera"
          >
            {invoiceImage ? 'Change Invoice Image' : 'Upload Invoice Image'}
          </Button>

          <ImagePreview uri={invoiceImage} />

          <Button
            mode="contained"
            onPress={handleAssignInvoice}
            style={styles.assignButton}
            disabled={!invoiceNumber.trim() || !invoiceImage || uploading}
            loading={uploading}
          >
            Assign Invoice
          </Button>
        </View>
      </View>

      {/* Image Source Selection Dialog */}
      <Portal>
        <Dialog
          visible={dialogs.imageSource}
          onDismiss={() => setDialogs(prev => ({ ...prev, imageSource: false }))}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>
            Choose Image Source
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
              Select where you want to get the image from
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => handleImageSource('camera')}
              textColor={colors.primary}
            >
              Camera
            </Button>
            <Button
              onPress={() => handleImageSource('gallery')}
              textColor={colors.primary}
            >
              Gallery
            </Button>
            <Button
              onPress={() => setDialogs(prev => ({ ...prev, imageSource: false }))}
              textColor={colors.error}
            >
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Permission Dialog */}
      <Portal>
        <Dialog
          visible={dialogs.permission}
          onDismiss={() => setDialogs(prev => ({ ...prev, permission: false }))}
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title style={{ color: colors.onSurface, ...fonts.titleLarge }}>
            Permission Required
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: colors.onSurfaceVariant, ...fonts.bodyMedium }}>
              Please grant camera permissions to take photos
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDialogs(prev => ({ ...prev, permission: false }))}
              textColor={colors.primary}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timeCard: {
    borderRadius: 10,
    marginVertical: 10,
    marginHorizontal: 16,
  },
  timeCardContent: {
    alignItems: 'center',
    paddingVertical: 10,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  invoiceInput: {
    marginBottom: 16,
  },
  uploadButton: {
    marginBottom: 16,
  },
  imagePreviewContainer: {
    marginVertical: 8,
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
    aspectRatio: 3/4,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  assignButton: {
    marginTop: 8,
  },
})

export default TransactionSummary 