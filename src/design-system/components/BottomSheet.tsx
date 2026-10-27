import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, spacing } from '../tokens';

export interface BottomSheetProps {
  visible: boolean;
  /** Se dispara al tocar fuera o al pedir cierre desde el sistema. */
  onDismiss: () => void;
  children: React.ReactNode;
}

/** Hoja inferior modal — usada para la confirmacion "¿Abrir este sitio?". */
export function BottomSheet({ visible, onDismiss, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      />
      {/* Modal para el lector de pantalla: no deja recorrer lo que hay detras. */}
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.handle} />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,17,22,0.45)',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderStrong,
    alignSelf: 'center',
  },
});
