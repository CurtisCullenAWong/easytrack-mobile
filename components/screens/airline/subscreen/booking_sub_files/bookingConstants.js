// ================================
// BOOKING CONSTANTS & VALIDATION
// ================================

/** Initial contract template */
export const INITIAL_CONTRACT = {
  firstName: "",
  middleInitial: "",
  lastName: "",
  contact: "",
  flightNumber: "",
  itemDescription: "",
  itemDescriptions: [],
  quantity: "1",
  deliveryAddress: "",
  addressLine1: "",
  addressLine2: "",
  province: "",
  cityMunicipality: "",
  barangay: "",
  postalCode: "",
  street: "",
  villageBuilding: "",
  roomUnitNo: "",
  landmarkEntrance: "",
  errors: {
    firstName: false,
    lastName: false,
    contact: false,
    flightNumber: false,
    itemDescription: false,
    quantity: false,
    addressLine1: false,
    province: false,
    cityMunicipality: false,
    barangay: false,
    postalCode: false,
    street: false,
    villageBuilding: false,
    landmarkEntrance: false
  }
}

/** Input limits and validation patterns */
export const INPUT_LIMITS = {
  firstName: { maxLength: 50, minLength: 2 },
  middleInitial: { maxLength: 1 },
  lastName: { maxLength: 50, minLength: 2 },
  contact: { maxLength: 10, minLength: 10 },
  flightNumber: { maxLength: 8, minLength: 3 },
  itemDescription: { maxLength: 500, minLength: 6 },
  quantity: { maxLength: 2, minLength: 1 },
  province: { maxLength: 50, minLength: 2 },
  cityMunicipality: { maxLength: 50, minLength: 2 },
  barangay: { maxLength: 50, minLength: 2 },
  postalCode: { maxLength: 4, minLength: 4 },
  street: { maxLength: 50, minLength: 2 },
  villageBuilding: { maxLength: 50, minLength: 2 },
  roomUnitNo: { maxLength: 50 },
  landmarkEntrance: { maxLength: 100 }
}

export const VALIDATION_PATTERNS = {
  contact: /^9\d{9}$/,
  flightNumber: /^[A-Za-z0-9]{3,8}$/,
  postalCode: /^\d{4}$/,
  quantity: /^(?:[1-9]|1[0-5])$/,
  province: /^[A-Za-z\s\-\.]+$/,
  cityMunicipality: /^[A-Za-z\s\-\.]+$/,
  barangay: /^[A-Za-z0-9\s\-\.\,\#]+$/,
  street: /^[A-Za-z0-9\s\-\.\,\#]+$/,
  villageBuilding: /^[A-Za-z0-9\s\-\.\,\#]+$/,
  roomUnitNo: /^[A-Za-z0-9\s\-\.\,\#]*$/,
  landmarkEntrance: /^[A-Za-z0-9\s\-\.\,\#]*$/
}

export const TERMINAL_OPTIONS = [
  { label: 'Terminal 1', lat: 14.508963226090515, lng: 121.00417400814496 },
  { label: 'Terminal 2', lat: 14.511166725278645, lng: 121.01288969053523 },
  { label: 'Terminal 3', lat: 14.5201168528943, lng: 121.01377520505147 },
]

export const MAX_CONTRACTS = 15
export const MAX_LUGGAGE_PER_CONTRACT = 15
export const PICKUP_BAYS_COUNT = 20
