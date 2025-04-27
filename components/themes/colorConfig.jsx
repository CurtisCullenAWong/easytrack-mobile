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
    primary: '#388E3C', onPrimary: '#FFFFFF', primaryContainer: '#C8E6C9', onPrimaryContainer: '#1B5E20',
    secondary: '#81C784', onSecondary: '#FFFFFF', secondaryContainer: '#E6F4EA', onSecondaryContainer: '#2E7D32',
    tertiary: '#A5D6A7', onTertiary: '#1B5E20', tertiaryContainer: '#E8F5E9', onTertiaryContainer: '#2E7D32',
    error: '#D32F2F', onError: '#FFFFFF', errorContainer: '#F9DEDC', onErrorContainer: '#410E0B',
    background: '#F1F8E9', onBackground: '#1B1B1B', surface: '#FFFFFF', onSurface: '#1B1B1B',
    surfaceVariant: '#E0E0E0', onSurfaceVariant: '#4D4D4D', outline: '#8E8E8E',
}

export const colorConfigDark = {
    primary: '#66BB6A', onPrimary: '#003910', primaryContainer: '#338A3E', onPrimaryContainer: '#C8E6C9',
    secondary: '#A5D6A7', onSecondary: '#1E4620', secondaryContainer: '#4CAF50', onSecondaryContainer: '#E8F5E9',
    tertiary: '#81C784', onTertiary: '#1B5E20', tertiaryContainer: '#388E3C', onTertiaryContainer: '#E6F4EA',
    error: '#FF6B6B', onError: '#601410', errorContainer: '#8C1D18', onErrorContainer: '#F9DEDC',
    background: '#121212', onBackground: '#E1E1E1',
    surface: '#1E1E1E', onSurface: '#E1E1E1',
    surfaceVariant: '#3A3A3A', onSurfaceVariant: '#CACACA',
    outline: '#6F6F6F',
}