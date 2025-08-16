/*  Descriptions:
background — The main background color of the app, typically used for the overall page background.
onBackground — Text or icon color used for elements placed on the background, ensuring sufficient contrast for readability.

surface — The background color for UI containers and elements that need to stand out against the background.
onSurface — Text or icon color used for elements on surfaces, ensuring sufficient contrast for readability.

primary — The color for key elements like buttons, links, and highlights that need to stand out in the UI.
onPrimary — Text or icon color used for elements on primary-colored backgrounds, ensuring good contrast for readability.
primaryContainer — The background color for containers that highlight primary elements (e.g., button containers).
onPrimaryContainer — Text or icon color used on primary containers, ensuring sufficient contrast for visibility.

secondary — The color for secondary UI elements, such as secondary buttons or accent elements.
onSecondary — Text or icon color used on secondary-colored elements, ensuring good contrast for visibility.
secondaryContainer — The background color for containers holding secondary elements.
onSecondaryContainer — Text or icon color used on secondary containers to ensure proper contrast.

tertiary — The color for less prominent elements, usually used for accents or tertiary actions.
onTertiary — Text or icon color used for elements on tertiary-colored backgrounds for contrast.
tertiaryContainer — The background color for containers that hold tertiary elements.
onTertiaryContainer — Text or icon color used on tertiary containers for readability and contrast.

error — The background color for error messages and alerts to indicate problems.
onError — Text color used on elements within error-colored backgrounds for contrast and readability.
errorContainer — The background color used for containers that display error messages.
onErrorContainer — Text or icon color used on error containers, ensuring readability against error backgrounds.

surfaceVariant — A background color alternative to the main surface color, often used for inputs or forms.
onSurfaceVariant — Text or icon color used for elements on surface variant backgrounds to maintain contrast.

outline — The color used for borders and dividers, providing subtle separation between UI elements.
*/

export const colorConfigLight = {
    primary: '#2E7D32', onPrimary: '#FFFFFF', primaryContainer: '#A5D6A7', onPrimaryContainer: '#0B3D0B',
    secondary: '#66BB6A', onSecondary: '#FFFFFF', secondaryContainer: '#C8E6C9', onSecondaryContainer: '#0B3D0B',
    tertiary: '#81C784', onTertiary: '#FFFFFF', tertiaryContainer: '#D0E8D0', onTertiaryContainer: '#1B5E20',
    error: '#C62828', onError: '#FFFFFF', errorContainer: '#F9DEDC', onErrorContainer: '#5B1212',
    background: '#F3F8F2', onBackground: '#1A1A1A', surface: '#FFFFFF', onSurface: '#1A1A1A',
    surfaceVariant: '#DDE7DC', onSurfaceVariant: '#374137',
    outline: '#7B8C7B',
}


export const colorConfigDark = {
    primary: '#81C784', onPrimary: '#002910', primaryContainer: '#388E3C', onPrimaryContainer: '#C8E6C9',
    secondary: '#A5D6A7', onSecondary: '#0B3D0B', secondaryContainer: '#4CAF50', onSecondaryContainer: '#E8F5E9',
    tertiary: '#66BB6A', onTertiary: '#002910', tertiaryContainer: '#2E7D32', onTertiaryContainer: '#D0E8D0',
    error: '#EF5350', onError: '#370000', errorContainer: '#8C1D18', onErrorContainer: '#F9DEDC',
    background: '#121712', onBackground: '#E1E1E1',
    surface: '#1B1F1B', onSurface: '#E1E1E1',
    surfaceVariant: '#2D322D', onSurfaceVariant: '#B5BEB5',
    outline: '#5E6A5E',
}