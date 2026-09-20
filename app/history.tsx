import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
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
  VerdictPill,
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
  { value: 'incierto', label: 'Inciertos' },
];

/**
 * 08 · Historial. Filtro por veredicto y busqueda por dominio o lugar.
 * Los registros salen del disco, asi que la lista funciona sin conexion. Un
 * analisis que no se pudo completar queda como "incierto", que es el caso mas
 * frecuente cuando el backend no responde.
 */
export default function HistoryRoute() {
  const router = useRouter();
  const { locationEnabled, history, openHistoryEntry } = useAppState();
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

  return (
    <Screen>
      <ScreenHeader
        title="Historial"
        onBack={() => router.replace('/scanner')}
        trailingText="Últimos 20 · sin internet"
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
          <Card
            onPress={() => openRecord(item)}
            accessibilityLabel={`${item.record.domain}, ${item.record.verdict}`}
            style={styles.row}
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
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<ClockIcon size={36} color="#B9B4A8" />}
            title="Nada por aquí"
            description="No hay escaneos con este veredicto. Tus últimos 20 escaneos se guardan en tu teléfono, incluso sin internet."
          />
        }
      />
    </Screen>
  );
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
    gap: 7,
    paddingVertical: 13,
    paddingHorizontal: 15,
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
