import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  ClockIcon,
  EmptyState,
  FilterChips,
  LocationIcon,
  palette,
  radius,
  Screen,
  ScreenHeader,
  SearchIcon,
  spacing,
  text,
  TrashIcon,
  VerdictPill,
  verdicts,
} from '../src/design-system';
import type { FilterChipOption } from '../src/design-system';
import type { VerdictKey } from '../src/services/analysis/types';
import { formatScanTime } from '../src/services/format/relativeTime';
import type { HistoryEntry } from '../src/services/storage/historyStorage';
import { useAppState } from '../src/store/AppStateContext';

type FilterValue = 'todos' | VerdictKey;

const FILTERS: readonly FilterChipOption<FilterValue>[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'seguro', label: 'Seguros' },
  { value: 'sospechoso', label: 'Sospechosos' },
  { value: 'malicioso', label: 'Maliciosos' },
];

/**
 * 08 · Historial. Filtro por veredicto y busqueda por dominio o lugar.
 * Los registros salen del disco, asi que la lista funciona sin conexion. Un
 * analisis que no se pudo completar no se guarda: solo muestra un aviso.
 */
export default function HistoryRoute() {
  const router = useRouter();
  const { locationEnabled, history, openHistoryEntry, removeScan, clearHistory } = useAppState();
  const [filter, setFilter] = useState<FilterValue>('todos');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return history.filter(({ record }) => {
      const matchesFilter = filter === 'todos' || record.verdict === filter;
      if (!matchesFilter) return false;
      if (!normalized) return true;

      const haystack = `${record.domain} ${record.place ?? ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [filter, query, history]);

  const openRecord = (entry: HistoryEntry) => {
    // Cada escaneo guarda su propio analisis, asi que la fila reabre lo que el
    // usuario vio en su momento, sin red de por medio.
    openHistoryEntry(entry);
    router.push('/analysis/result');
  };

  // Los dos borrados piden confirmacion: no hay papelera ni deshacer, y el
  // historial es lo unico que funciona sin conexion.
  const confirmRemove = (entry: HistoryEntry) => {
    Alert.alert(
      '¿Borrar este escaneo?',
      `${entry.record.domain} se quitará de tu historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: () => removeScan(entry.record.id) },
      ],
    );
  };

  const confirmClear = () => {
    Alert.alert(
      '¿Borrar todo el historial?',
      'Se quitarán todos tus escaneos y los lugares guardados en este teléfono.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar todo', style: 'destructive', onPress: clearHistory },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Historial"
        onBack={() => router.replace('/scanner')}
        // "sin internet" se leia como un aviso de que no habia conexion.
        trailingText="Últimos 20 · en tu teléfono"
      />

      <View style={styles.controls}>
        <View style={styles.searchField}>
          <SearchIcon size={17} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar dominio o lugar…"
            placeholderTextColor={palette.textPlaceholder}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Buscar en el historial"
          />
        </View>

        <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.record.id}
        contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          /*
            La tarjeta no es tocable entera: dentro hay dos botones hermanos,
            abrir y borrar. Si la tarjeta fuera el boton, en iOS el lector de
            pantalla la leeria como un solo elemento y la papelera no se podria
            alcanzar.
          */
          <Card flush style={styles.row}>
            <Pressable
              onPress={() => openRecord(item)}
              accessibilityRole="button"
              // Lo mismo que se ve en la fila, en el orden en que se lee.
              accessibilityLabel={[
                item.record.domain,
                verdicts[item.record.verdict].shortLabel,
                formatScanTime(item.record.scannedAt),
                locationEnabled ? item.record.place : null,
              ]
                .filter(Boolean)
                .join(', ')}
              accessibilityHint="Abre el resultado de este análisis"
              style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
            >
              <View style={styles.rowTop}>
                <Text style={[text.listTitle, styles.rowDomain]} numberOfLines={1}>
                  {item.record.domain}
                </Text>
                <VerdictPill verdict={item.record.verdict} size="small" short />
              </View>

              <View style={styles.rowMeta}>
                <Text style={text.caption}>{formatScanTime(item.record.scannedAt)}</Text>
                {locationEnabled && item.record.place ? (
                  <>
                    <Text style={text.caption}>·</Text>
                    <View style={styles.place}>
                      <LocationIcon size={11} color={palette.textTertiary} strokeWidth={2} />
                      <Text style={[text.caption, styles.placeLabel]} numberOfLines={1}>
                        {item.record.place}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
            </Pressable>

            <Pressable
              onPress={() => confirmRemove(item)}
              accessibilityRole="button"
              accessibilityLabel={`Borrar ${item.record.domain} del historial`}
              style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
            >
              <TrashIcon size={19} color={palette.textTertiary} />
            </Pressable>
          </Card>
        )}
        ListFooterComponent={
          history.length > 0 ? (
            <Button
              label="Borrar historial"
              variant="ghost"
              accentColor={verdicts.malicioso.color}
              icon={<TrashIcon size={17} color={verdicts.malicioso.color} />}
              onPress={confirmClear}
              style={styles.clearButton}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={
              history.length === 0 ? (
                <ClockIcon size={36} color={palette.iconMuted} />
              ) : (
                <SearchIcon size={34} color={palette.iconMuted} />
              )
            }
            {...emptyCopy(history.length, query.trim(), filter)}
          />
        }
      />
    </Screen>
  );
}

/**
 * Texto del estado vacio segun por que esta vacia la lista. Antes era uno solo
 * ("No hay escaneos con este veredicto") y se leia mal en dos de los tres
 * casos: con el historial vacio y "Todos" elegido, o al buscar un texto.
 */
function emptyCopy(
  total: number,
  query: string,
  filter: FilterValue,
): { title: string; description: string } {
  if (total === 0) {
    return {
      title: 'Aún no has escaneado nada',
      description:
        'Tus últimos 20 sitios escaneados aparecerán aquí. Se guardan en tu teléfono y puedes verlos sin internet.',
    };
  }
  if (query) {
    return {
      title: 'Sin resultados',
      description: `Ningún escaneo coincide con «${query}». Prueba con otra parte del dominio o del lugar.`,
    };
  }
  const label = FILTERS.find((option) => option.value === filter)?.label.toLowerCase();
  return {
    title: 'Nada por aquí',
    description: `No tienes escaneos ${label}. Elige «Todos» para ver el historial completo.`,
  };
}

const styles = StyleSheet.create({
  controls: {
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 10,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: text.rowValue.fontFamily,
    fontSize: 14,
    color: palette.textPrimary,
    // Quita el relleno vertical que Android agrega por defecto.
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: 2,
    paddingBottom: 30,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rowMain: {
    flex: 1,
    gap: 7,
    paddingVertical: 13,
    paddingLeft: 15,
    paddingRight: spacing.xs,
  },
  removeButton: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  clearButton: {
    marginTop: spacing.lg,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowDomain: {
    flex: 1,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  place: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeLabel: {
    flex: 1,
  },
});
