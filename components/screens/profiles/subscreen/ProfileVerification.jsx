import React, { useState, useEffect } from 'react'
import { ScrollView, View, StyleSheet, Image } from 'react-native'
import { Text, Card, Button, TextInput, useTheme, Portal, Dialog, IconButton, Appbar, Menu } from 'react-native-paper'
import { supabase } from '../../../../lib/supabase'
import * as ImagePicker from 'expo-image-picker'

const Verification = ({ navigation }) => {
  const { colors, fonts } = useTheme()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [showImageSourceDialog, setShowImageSourceDialog] = useState(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [currentImageType, setCurrentImageType] = useState(null)
  const [idTypeMenuVisible, setIdTypeMenuVisible] = useState(false)
  const [idTypes, setIdTypes] = useState([])
  const [formData, setFormData] = useState({
    gov_id_type: '',
    gov_id_type_id: null,
    gov_id_number: '',
    gov_id_proof: null,
    vehicle_info: '',
    vehicle_plate_number: '',
    vehicle_or_cr: null
  })
  const [roleId, setRoleId] = useState(null)

  // Check verification status and fetch ID types on mount
  useEffect(() => {
    checkVerificationStatus()
    fetchIdTypes()
  }, [])

  const fetchIdTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('verify_info_type')
        .select('id, id_type_name')
        .order('id_type_name')

      if (error) throw error
      setIdTypes(data || [])
    } catch (error) {
      console.error('Error fetching ID types:', error)
    }
  }

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          verify_status_id,
          gov_id_type,
          gov_id_number,
          gov_id_proof,
          vehicle_info,
          vehicle_plate_number,
          vehicle_or_cr,
          role_id,
          verify_info_type:gov_id_type (id_type_name)
        `)
        .eq('id', user.id)
        .single()
        setRoleId(data?.role_id)

      if (error) throw error

      // If verification data exists, load it into the form
      if (data) {
        console.log('\nLoaded verification data:', data) // Debug log
        setFormData(prev => ({
          ...prev,
          gov_id_type: data.verify_info_type?.id_type_name || '',
          gov_id_type_id: data.gov_id_type || null,
          gov_id_number: data.gov_id_number || '',
          gov_id_proof: data.gov_id_proof || null,
          vehicle_info: data.vehicle_info || '',
          vehicle_plate_number: data.vehicle_plate_number || '',
          vehicle_or_cr: data.vehicle_or_cr || null
        }))
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
    }
  }

  const handleImageSource = async (source) => {
    setShowImageSourceDialog(false)
    
    try {
      const options = { 
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
        aspect: [4, 3],
      }

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)

      if (!result.canceled) {
        setFormData(prev => ({
          ...prev,
          [currentImageType]: result.assets[0].uri
        }))
      }
    } catch (error) {
      console.error('Error picking image:', error)
    }
  }

  const pickImage = (type) => {
    setCurrentImageType(type)
    setShowImageSourceDialog(true)
  }

  const removeImage = (type) => {
    setFormData(prev => ({
      ...prev,
      [type]: null
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('User not authenticated')
        return navigation.navigate('Login')
      }

      // TODO: Replace with actual backend upload
      // For now, just store the local URIs
      console.log('ID Proof would be uploaded to backend:', formData.gov_id_proof)
      console.log('OR/CR would be uploaded to backend:', formData.vehicle_or_cr)

      // Update verification status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          verify_status_id: 3,
          last_updated: Date.now(),
          gov_id_type: formData.gov_id_type_id,
          gov_id_number: formData.gov_id_number,
          gov_id_proof: formData.gov_id_proof,
          vehicle_info: formData.vehicle_info,
          vehicle_plate_number: formData.vehicle_plate_number,
          vehicle_or_cr: formData.vehicle_or_cr
        })
        .eq('id', user.id)
      console.log(formData)
      if (updateError) throw updateError

      navigation.navigate('Profile')
    } catch (error) {
      console.error('Error submitting verification:', error)
    } finally {
      setLoading(false)
    }
  }

  const ImagePreview = ({ uri, onRemove }) => {
    if (!uri) return null
    return (
      <View style={styles.imagePreviewContainer}>
        <Image 
          source={{ uri }} 
          style={styles.imagePreview}
          resizeMode="contain"
        />
        <IconButton
          icon="close-circle"
          size={20}
          iconColor={colors.error}
          style={[styles.removeImageButton, { backgroundColor: colors.surface }]}
          onPress={onRemove}
        />
      </View>
    )
  }


  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('Profile')} />
        <Appbar.Content 
          title="Account Verification" 
          titleStyle={[{ color: colors.onSurface, ...fonts.titleLarge }]}
        />
        <Appbar.Action 
          icon="content-save" 
          onPress={handleSubmit} 
          disabled={loading}
          color={colors.primary}
        />
      </Appbar.Header>

      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          {/* Government ID Section */}
          <Text style={[styles.label, { color: colors.onSurface, ...fonts.titleMedium }]}>
            Government ID Information
          </Text>
          
          <Menu
            visible={idTypeMenuVisible}
            onDismiss={() => setIdTypeMenuVisible(false)}
            anchor={
              <TextInput
                label="ID Type"
                value={formData.gov_id_type}
                editable={false}
                style={styles.input}
                mode="outlined"
                right={<TextInput.Icon icon="chevron-down" onPress={() => setIdTypeMenuVisible(true)} />}
                theme={{ colors: { primary: colors.primary } }}
              />
            }
            contentStyle={{ backgroundColor: colors.surface }}
          >
            {idTypes.map((type) => (
              <Menu.Item
                key={type.id}
                onPress={() => {
                  setFormData(prev => ({ 
                    ...prev, 
                    gov_id_type: type.id_type_name,
                    gov_id_type_id: type.id 
                  }))
                  setIdTypeMenuVisible(false)
                }}
                title={type.id_type_name}
                titleStyle={[
                  fonts.bodyLarge,
                  {
                    color: formData.gov_id_type === type.id_type_name ? colors.primary : colors.onSurface,
                  },
                ]}
                leadingIcon={formData.gov_id_type === type.id_type_name ? 'check' : undefined}
              />
            ))}
          </Menu>
          
          <TextInput
            label="ID Number"
            value={formData.gov_id_number}
            onChangeText={(text) => setFormData(prev => ({ ...prev, gov_id_number: text }))}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary } }}
          />

          <ImagePreview 
            uri={formData.gov_id_proof} 
            onRemove={() => removeImage('gov_id_proof')} 
          />

          <Button
            mode="outlined"
            onPress={() => pickImage('gov_id_proof')}
            style={styles.button}
            textColor={colors.primary}
          >
            {formData.gov_id_proof ? 'Change ID Proof' : 'Upload ID Proof'}
          </Button>
          {roleId === 3 ? (<></>):(<>
          {/* Vehicle Information Section */}
          <Text style={[styles.label, { color: colors.onSurface, ...fonts.titleMedium, marginTop: 20 }]}>
            Vehicle Information
          </Text>

          <TextInput
            label="Vehicle Description"
            value={formData.vehicle_info}
            onChangeText={(text) => setFormData(prev => ({ ...prev, vehicle_info: text }))}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary } }}
          />

          <TextInput
            label="Plate Number"
            value={formData.vehicle_plate_number}
            onChangeText={(text) => setFormData(prev => ({ ...prev, vehicle_plate_number: text }))}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary } }}
          />  

          <ImagePreview 
            uri={formData.vehicle_or_cr} 
            onRemove={() => removeImage('vehicle_or_cr')} 
          />

          <Button
            mode="outlined"
            onPress={() => pickImage('vehicle_or_cr')}
            style={styles.button}
            textColor={colors.primary}
          >
            {formData.vehicle_or_cr ? 'Change OR/CR Document' : 'Upload OR/CR Document'}
          </Button>
          </>)}
        </Card.Content>
      </Card>

      {/* Image Source Selection Dialog */}
      <Portal>
        <Dialog
          visible={showImageSourceDialog}
          onDismiss={() => setShowImageSourceDialog(false)}
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
              onPress={() => setShowImageSourceDialog(false)}
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
          visible={showPermissionDialog}
          onDismiss={() => setShowPermissionDialog(false)}
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
              onPress={() => setShowPermissionDialog(false)}
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
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
  },
  label: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 16,
  },
  imagePreviewContainer: {
    marginVertical: 8,
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
    aspectRatio: 16/9,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    elevation: 4,
  },
  verifiedContainer: {
    alignItems: 'center',
    padding: 24,
  },
  verifiedText: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  verifiedSubtext: {
    textAlign: 'center',
  },
})

export default Verification
