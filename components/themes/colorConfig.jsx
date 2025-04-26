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
    primary: '#373E31', onPrimary: '#FFFFFF', primaryContainer: '#A5D6A7', onPrimaryContainer: '#1A3A26',
    secondary: '#67854B', onSecondary: '#FFFFFF', secondaryContainer: '#D1D99E', onSecondaryContainer: '#2A3A25',
    tertiary: '#616161', onTertiary: '#FFFFFF', tertiaryContainer: '#F1C0C0', onTertiaryContainer: '#3C1E1D',
    error: '#B3261E', onError: '#FFFFFF', errorContainer: '#F9DEDC', onErrorContainer: '#410E0B',
    background: '#FAF9F6', onBackground: '#1C1B1F', surface: '#F4F2F0', onSurface: '#1C1B1F',
    surfaceVariant: '#D1C9D4', onSurfaceVariant: '#49454F', outline: '#7A746D',
}

export const colorConfigDark = {
    primary: '#A8B3A3', onPrimary: '#1C2019', primaryContainer: '#525B4B', onPrimaryContainer: '#DCE3D7',
    secondary: '#9BBF78', onSecondary: '#263015', secondaryContainer: '#4E6340', onSecondaryContainer: '#D8E6C6',
    tertiary: '#8E8E8E', onTertiary: '#1F1F1F', tertiaryContainer: '#5A5A5A', onTertiaryContainer: '#E0E0E0',
    error: '#F2B8B5', onError: '#601410', errorContainer: '#8C1D18', onErrorContainer: '#F9DEDC',
    background: '#1C1B1F', onBackground: '#E6E1E5', surface: '#1C1B1F', onSurface: '#E6E1E5',
    surfaceVariant: '#49454F', onSurfaceVariant: '#CAC4D0', outline: '#938F99',
}
