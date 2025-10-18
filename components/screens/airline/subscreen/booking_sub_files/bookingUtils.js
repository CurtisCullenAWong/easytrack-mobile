// ================================
// BOOKING UTILITY FUNCTIONS
// ================================

import { INPUT_LIMITS, VALIDATION_PATTERNS } from './bookingConstants'

/** Filter special characters depending on field type */
export const filterSpecialCharacters = (text, fieldType) => {
  if (typeof text !== 'string') return ''
  switch (fieldType) {
    case 'name':
      return text.replace(/[^A-Za-z\s\-']/g, '')
    case 'contact':
      return text.replace(/[^0-9]/g, '')
    case 'flightNumber':
      return text.replace(/[^A-Za-z0-9]/g, '')
    case 'postalCode':
      return text.replace(/[^0-9]/g, '')
    case 'quantity':
      return text.replace(/[^0-9]/g, '')
    case 'address':
      return text.replace(/[^A-Za-z0-9ñÑ\s\-\.\,\#\/''(\)&]/g, '')
    case 'itemDescription':
      return text.replace(/[^A-Za-z0-9\s\-\.\,\#]/g, '')
    default:
      return text.replace(/[^A-Za-z0-9\s]/g, '')
  }
}

/** Format a camelCase / camel-style field into a human readable label */
export const formatFieldName = (key) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())

/** Generate a reasonably unique tracking ID */
export const generateTrackingID = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const randomPart = [...Array(4)].map(() => Math.random().toString(36).slice(2, 3).toUpperCase()).join('')
  return `${year}${month}${day}MKTP${randomPart}`
}

/** Format phone/contact into the storage/display format used in the app */
export const formatContactNumber = (contact) => {
  const c = String(contact || '').replace(/[^0-9]/g, '')
  if (c.length === 10 && c.startsWith('9')) {
    return `+63 ${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`
  }
  if (c.length === 11 && c.startsWith('63')) {
    return `+${c}`
  }
  return c ? `+63 ${c}` : ''
}

/** Validate a single contract */
export const validateContract = (contract) => {
  const trim = (s) => String(s || "").trim()
  return {
    firstName:
      !trim(contract.firstName) ||
      trim(contract.firstName).length < INPUT_LIMITS.firstName.minLength ||
      trim(contract.firstName).length > INPUT_LIMITS.firstName.maxLength,
    lastName:
      !trim(contract.lastName) ||
      trim(contract.lastName).length < INPUT_LIMITS.lastName.minLength ||
      trim(contract.lastName).length > INPUT_LIMITS.lastName.maxLength,
    contact:
      !trim(contract.contact) ||
      !VALIDATION_PATTERNS.contact.test(trim(contract.contact)),
    flightNumber:
      !trim(contract.flightNumber) ||
      !VALIDATION_PATTERNS.flightNumber.test(trim(contract.flightNumber).toUpperCase()),
    itemDescription: (() => {
      const qty = parseInt(contract.quantity || "0") || 0
      const descs = Array.isArray(contract.itemDescriptions) ? contract.itemDescriptions.slice(0, qty) : []
      const hasEmpty = qty > 0 && descs.some((d) => !String(d || "").trim())
      const joined = descs.map((d, i) => `${i + 1}. ${String(d || "").trim()}\n`).join("")
      return qty <= 0 || hasEmpty || joined.length < INPUT_LIMITS.itemDescription.minLength || joined.length > INPUT_LIMITS.itemDescription.maxLength
    })(),
    quantity:
      !String(contract.quantity || "").trim() ||
      !VALIDATION_PATTERNS.quantity.test(String(contract.quantity || ""))
  }
}

/** Check for duplicate passenger names */
export const findDuplicateNames = (contracts) => {
  const nameMap = new Map()
  const duplicates = []
  
  contracts.forEach((contract, index) => {
    const fullName = `${contract.firstName?.trim()} ${contract.lastName?.trim()}`.toLowerCase()
    if (fullName.trim() && fullName !== ' ') {
      if (nameMap.has(fullName)) {
        duplicates.push({ index, name: fullName })
      } else {
        nameMap.set(fullName, index)
      }
    }
  })
  
  return duplicates
}

/** Calculate total delivery fee based on contracts and base fee */
export const calculateTotalDeliveryFee = (contracts, baseDeliveryFee) => {
  return contracts.reduce((total, contract) => {
    const qty = parseInt(contract.quantity || '0') || 0
    const setsOfThree = Math.ceil(qty / 3)
    return total + (baseDeliveryFee * setsOfThree)
  }, 0)
}

/** Calculate total luggage quantity across all contracts */
export const calculateTotalLuggage = (contracts) => {
  return contracts.reduce((sum, c) => sum + Number(c.quantity || 0), 0)
}
