const common = { fontFamily: 'Onest-Regular' };
const commonBold = { fontFamily: 'Onest-Bold' };

const fontConfig = {

  displayLarge: { ...commonBold, fontWeight: '400', fontSize: 56, lineHeight: 64, letterSpacing: -0.2 },
  displayMedium: { ...common, fontWeight: '400', fontSize: 44, lineHeight: 52 },
  displaySmall: { ...common, fontWeight: '400', fontSize: 36, lineHeight: 44 },
  headlineLarge: { ...commonBold, fontWeight: '400', fontSize: 32, lineHeight: 40 },
  headlineMedium: { ...common, fontWeight: '400', fontSize: 28, lineHeight: 36 },
  headlineSmall: { ...common, fontWeight: '400', fontSize: 24, lineHeight: 32 },
  titleLarge: { ...commonBold, fontWeight: '500', fontSize: 22, lineHeight: 28 },
  titleMedium: { ...common, fontWeight: '500', fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  titleSmall: { ...common, fontWeight: '500', fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  labelLarge: { ...commonBold, fontWeight: '600', fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  labelMedium: { ...common, fontWeight: '600', fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  labelSmall: { ...common, fontWeight: '600', fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
  bodyLarge: { ...common, fontWeight: '400', fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  bodyMedium: { ...common, fontWeight: '400', fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { ...common, fontWeight: '400', fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
};

export default fontConfig;
