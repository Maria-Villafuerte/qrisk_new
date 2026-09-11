import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accordion,
  BehaviorIcon,
  Button,
  Finding,
  HeuristicsIcon,
  palette,
  radius,
  ReputationIcon,
  RiskMeter,
  Screen,
  ScreenHeader,
  spacing,
  text,
  VerdictShield,
  verdicts,
} from '../../src/design-system';
import type { AnalysisStageKey } from '../../src/services/analysis/types';
import { useAppState } from '../../src/store/AppStateContext';

const sectionIcons: Record<AnalysisStageKey, React.ComponentType<{ size?: number }>> = {
  reputation: ReputationIcon,
  heuristics: HeuristicsIcon,
  behavior: BehaviorIcon,
};

/**
 * 07 · Detalle del analisis. Progressive disclosure: solo la heuristica llega
 * abierta, el resto se expande a peticion.
 */
export default function DetailsRoute() {
  const router = useRouter();
  const { result } = useAppState();
  const theme = verdicts[result.verdict];

  return (
    <Screen>
      <ScreenHeader title="Detalle del análisis" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen del veredicto, siempre visible al inicio del scroll. */}
        <View style={[styles.summary, { backgroundColor: theme.tint, borderColor: theme.ring }]}>
          <View style={styles.summaryIcon}>
            <VerdictShield
              verdict={result.verdict}
              size={24}
              color={theme.color}
              strokeWidth={2.4}
            />
          </View>
          <View style={styles.summaryText}>
            <Text style={[text.badge, styles.summaryLabel, { color: theme.color }]}>
              {theme.label}
            </Text>
            <Text style={text.cardTitle} numberOfLines={1}>
              {result.domain}
            </Text>
          </View>
        </View>

        <RiskMeter score={result.riskScore} verdict={result.verdict} />

        {result.sections.map((section) => {
          const Icon = sectionIcons[section.key];
          // El backend puede mandar una seccion que esta version no conoce
          // (por ejemplo 'preview', que todavia no esta implementado). Se
          // omite en silencio en vez de reventar la pantalla con un icono
          // indefinido.
          if (!Icon) return null;

          return (
            <Accordion
              key={section.key}
              title={section.title}
              icon={<Icon size={19} />}
              badgeText={section.badgeText}
              badgeTone={section.badgeTone}
              defaultOpen={section.key === 'heuristics'}
            >
              {section.findings.map((finding) => (
                <Finding key={finding.text} tone={finding.tone}>
                  {finding.text}
                </Finding>
              ))}
              {section.footnote ? (
                <Text style={[text.caption, styles.footnote]}>{section.footnote}</Text>
              ) : null}
            </Accordion>
          );
        })}

        <Button
          label="Volver a la vista simple"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: 6,
    paddingBottom: 30,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    letterSpacing: 0.96,
  },
  footnote: {
    lineHeight: 18,
  },
  backButton: {
    marginTop: spacing.xs,
  },
});
