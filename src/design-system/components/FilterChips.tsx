import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { palette, radius } from '../tokens';
import { fontFamily } from '../typography';

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
}

export interface FilterChipsProps<T extends string> {
  options: readonly FilterChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

/** Fila horizontal de chips de filtro; el activo se invierte a oscuro. */
export function FilterChips<T extends string>({
  options,
  selected,
  onSelect,
}: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.value)}
            // El chip mide 36 de alto; el hitSlop completa los 44 de area tactil
            // sin engordar la fila visualmente.
            hitSlop={{ top: 4, bottom: 4 }}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : styles.chipIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 7,
    paddingBottom: 2,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: palette.textPrimary,
    borderColor: palette.textPrimary,
  },
  chipIdle: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  labelActive: {
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
  },
  labelIdle: {
    fontFamily: fontFamily.medium,
    color: palette.textSecondary,
  },
});
