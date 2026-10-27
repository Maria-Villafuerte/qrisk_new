import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accordion,
  BehaviorIcon,
  Button,
  Card,
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
  ZoomableImageViewer,
} from '../../src/design-system';
import { isFilterEnabled } from '../../src/services/analysis/enabledFilters';
import type { AnalysisStageKey } from '../../src/services/analysis/types';
import { useAppState } from '../../src/store/AppStateContext';

const sectionIcons: Record<AnalysisStageKey, React.ComponentType<{ size?: number }>> = {
  reputation: ReputationIcon,
  heuristics: HeuristicsIcon,
  behavior: BehaviorIcon,
};

/**
 * 07 · Detalle del analisis. Progressive disclosure: la primera seccion llega
 * abierta, el resto se expande a peticion. Solo se listan los filtros activos
 * (ver `enabledFilters.ts`).
 */
export default function DetailsRoute() {
  const router = useRouter();
  const { result } = useAppState();
  const theme = verdicts[result.verdict];

  // La captura puede fallar al cargar: su URL firmada caduca en una hora, asi
  // que una entrada vieja del historial la tendria vencida. Se oculta en vez de
  // dejar un hueco gris con un icono de imagen rota.
  const [shotFailed, setShotFailed] = useState(false);
  const screenshotUrl = shotFailed ? undefined : result.screenshotUrl;
  // Visor a pantalla completa para hacer zoom sobre la captura.
  const [viewerOpen, setViewerOpen] = useState(false);

  // Solo se pintan las secciones de los filtros que esta version anuncia. El
  // mock trae las tres del mockup y el backend puede mandar las que quiera; la
  // pantalla no debe ensenar el acordeon de un filtro apagado. Que filtros
  // estan activos se decide en `enabledFilters.ts`.
  const sections = result.sections.filter((section) => isFilterEnabled(section.key));

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

        {/*
          Vista previa (F2.3). La captura la toma el backend en su entorno
          aislado: es la prueba visible de que alguien ya entro al sitio por
          vos. Se muestra como imagen estatica —nunca un WebView— para que la
          pagina no pueda ejecutar nada ni hacerse pasar por la app.

          Sin captura no se pinta nada: el backend solo la entrega dentro de
          POST /analyze y no hay un endpoint aparte para pedirla despues.
        */}
        {screenshotUrl ? (
          <View style={styles.preview}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} accessibilityRole="header">
                Vista previa
              </Text>
              <Text style={styles.previewHint}>Toca para ampliar la imagen</Text>
            </View>
            <Pressable
              onPress={() => setViewerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Captura de pantalla de ${result.domain}`}
              accessibilityHint="Abre la captura a pantalla completa para hacer zoom"
            >
              <Image
                source={{ uri: screenshotUrl }}
                style={styles.previewImage}
                resizeMode="cover"
                onError={() => setShotFailed(true)}
              />
            </Pressable>
            <Text style={[text.caption, styles.previewCaption]}>
              Captura tomada en nuestro servidor
            </Text>
            <ZoomableImageViewer
              uri={screenshotUrl}
              visible={viewerOpen}
              onClose={() => setViewerOpen(false)}
              accessibilityLabel={`Captura de pantalla de ${result.domain}`}
            />
          </View>
        ) : null}

        {sections.map((section) => {
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
              // Sin `defaultOpen`: todas llegan cerradas y cada seccion se
              // abre solo si la persona la toca.
            >
              {/*
                El medidor es el puntaje de la estructura del enlace (F2.1), asi
                que vive en su seccion y no arriba, donde se leia como el
                veredicto: un MALICIOSO por VirusTotal puede tener una
                estructura de 30/100. Cuando F1 decide no hay puntaje, y un 50
                de relleno no mide nada: se esconde.
              */}
              {section.key === 'heuristics' && !result.riskScoreMissing ? (
                <RiskMeter
                  score={result.riskScore}
                  verdict={result.verdict}
                  title="Riesgo por estructura del enlace"
                />
              ) : null}
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

        {/*
          Cierra el desglose, debajo de Comportamiento: que filtro decidio y
          con que umbral. Las entradas del historial anteriores a este campo no
          lo traen y se omite.
        */}
        {result.verdictReason ? (
          <Card style={styles.reason}>
            <Text style={[text.badge, styles.centered]}>POR QUÉ ESTE VEREDICTO</Text>
            <Text style={[text.body, styles.centered]}>{result.verdictReason}</Text>
          </Card>
        ) : null}

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
  preview: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: palette.surface,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  previewTitle: {
    fontFamily: text.cardTitle.fontFamily,
    fontSize: 16,
    lineHeight: 21,
    color: palette.textPrimary,
  },
  // Pista secundaria: mas liviana que el titulo para no competir con el.
  previewHint: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: text.captionMd.fontFamily,
    fontSize: 13,
    lineHeight: 17,
    color: palette.textSecondary,
  },
  previewCaption: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
  },
  previewImage: {
    width: '100%',
    // 16:10 deja ver la parte de arriba de la pagina, que es donde vive lo que
    // delata a un sitio falso: el logo, el titulo, la barra de navegacion.
    aspectRatio: 16 / 10,
    backgroundColor: palette.appBg,
  },
  footnote: {
    lineHeight: 18,
  },
  reason: {
    gap: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.xs,
  },
});
