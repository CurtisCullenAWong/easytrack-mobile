export const validateProfileForm = (form, showSnackbar) => {
  if (!form.first_name.trim()) {
    showSnackbar('First name and / or second name is required')
    return false
  }
  if (!form.last_name.trim()) {
    showSnackbar('Last name and / or suffix is required')
    return false
  }
  if (form.contact_number && !/^9\d{9}$/.test(form.contact_number)) {
    showSnackbar('Contact number must be in format: 9xxxxxxxxx')
    return false
  }
  if (!form.emergency_contact_name.trim()) {
    showSnackbar('Emergency contact name is required')
    return false
  }
  if (form.emergency_contact_number && !/^9\d{9}$/.test(form.emergency_contact_number)) {
    showSnackbar('Emergency contact number must be in format: 9xxxxxxxxx')
    return false
  }
  if (form.birth_date) {
    const age = new Date().getFullYear() - form.birth_date.getFullYear()
    if (age < 18) {
      showSnackbar('Must be at least 18 years old')
      return false
    }
  }
  return true
}

export const sanitizeText = (text) => {
  // Remove special characters except spaces, hyphens, and periods
  return text.replace(/[^a-zA-Z\s\-\.]/g, '')
}

export const sanitizeName = (text) => {
  // Remove special characters except spaces and hyphens
  // Allow apostrophes for names like O'Connor
  return text.replace(/[^a-zA-Z\s\-']/g, '')
}

export const sanitizePhoneNumber = (number) => {
  // Remove all non-digit characters
  const cleaned = number.replace(/\D/g, '')
  // If number starts with 63, remove it
  if (cleaned.startsWith('63')) {
    return cleaned.substring(2)
  }
  // If number starts with 0, remove it
  if (cleaned.startsWith('0')) {
    return cleaned.substring(1)
  }
  // Ensure number starts with 9 and is exactly 10 digits
  if (cleaned.length > 0 && !cleaned.startsWith('9')) {
    return '9' + cleaned.substring(0, 9)
  }
  return cleaned.substring(0, 10)
}

export const handleTextChange = (field, value) => {
  let sanitizedValue = value
  switch (field) {
    case 'first_name':
    case 'last_name':
    case 'name_suffix':
    case 'emergency_contact_name':
      sanitizedValue = sanitizeName(value)
      // Capitalize first letter of each word
      sanitizedValue = sanitizedValue.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
      break
    case 'middle_initial':
      // Remove spaces and only take the first character
      sanitizedValue = sanitizeText(value).replace(/\s+/g, '').charAt(0).toUpperCase()
      break
    case 'contact_number':
    case 'emergency_contact_number':
      sanitizedValue = sanitizePhoneNumber(value)
      break
    default:
      sanitizedValue = sanitizeText(value)
  }
  return sanitizedValue
} 