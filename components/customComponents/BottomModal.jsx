import { useRef, useEffect } from 'react'
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { Portal, useTheme } from 'react-native-paper'

const { height } = Dimensions.get('window')

const BottomModal = ({ visible, onDismiss, children }) => {
  const slideAnim = useRef(new Animated.Value(height)).current
  const { colors } = useTheme()

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        requestAnimationFrame(() => onDismiss?.())
      })
    }
  }, [visible])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          slideAnim.setValue(gesture.dy)
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100) {
          Animated.timing(slideAnim, {
            toValue: height,
            duration: 200,
            useNativeDriver: true,
          }).start(onDismiss)
        } else {
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  if (!visible) return null

  return (
    <Portal>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoiding}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          >
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.modalContainer,
                {
                  transform: [{ translateY: slideAnim }],
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View style={[styles.notch, { backgroundColor: colors.tertiary }]} />
              {children}
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Portal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
  },
  notch: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 10,
    alignSelf: 'center',
  },
})

export default BottomModal