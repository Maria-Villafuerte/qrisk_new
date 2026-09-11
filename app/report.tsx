import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  InfoBanner,
  LocationIcon,
  palette,
  radius,
  Screen,
  ScreenHeader,
  ShieldCheckIcon,
  sizing,
  spacing,
  text,
  useToast,
  UrlChip,
  VerdictPill,
  verdicts,
} from '../src/design-system';
import {
  submitReport,
  validateReport,
  type ReportValidation,
} from '../src/services/report/reportService';
import { useAppState } from '../src/store/AppStateContext';

/**
 * 09 · Reporte anonimo. Los dos campos son opcionales: el valor del reporte
 * esta en la URL y el veredicto, que ya se conocen.
 */
export default function ReportRoute() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { result } = useAppState();

  const [comment, setComment] = useState('');
  const [place, setPlace] = useState('');
  const [errors, setErrors] = useState<ReportValidation>({});
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (sending) return;

    const draft = { comment, place };
    const validation = validateReport(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSending(true);
    try {
      const outcome = await submitReport(result, draft);

      if (outcome.ok) {
        toast.show('Reporte enviado de forma anónima. ¡Gracias por proteger a otros!');
        router.back();
        return;
      }

      // No se limpia el formulario ni se sale de la pantalla: lo que la
      // persona escribio se conserva para que pueda reintentar.
      toast.show(outcome.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Reportar QR" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // El contenido empieza en insets.top + la altura del encabezado: en un
        // iPhone con notch, contar solo el encabezado deja el ultimo campo
        // debajo del teclado.
        keyboardVerticalOffset={sizing.headerHeight + insets.top}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <InfoBanner variant="brand" icon={<ShieldCheckIcon size={18} />}>
            Tu reporte es anónimo y ayuda a alertar a otras personas sobre este código QR.
          </InfoBanner>

          <Field label="ENLACE REPORTADO">
            <UrlChip url={result.url} muted />
          </Field>

          <Field label="VEREDICTO ACTUAL">
            <VerdictPill verdict={result.verdict} />
          </Field>

          <Field label="COMENTARIO" optional error={errors.comment}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Ej. El código estaba pegado encima del QR original del parqueo…"
              placeholderTextColor={palette.textPlaceholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[styles.input, styles.textarea]}
              accessibilityLabel="Comentario opcional"
            />
          </Field>

          <Field label="¿DÓNDE ESTABA EL QR?" optional error={errors.place}>
            <View style={[styles.input, styles.inputRow]}>
              <LocationIcon size={16} color={palette.textTertiary} />
              <TextInput
                value={place}
                onChangeText={setPlace}
                placeholder="Ej. Parqueo Plaza Sol, Zona 10"
                placeholderTextColor={palette.textPlaceholder}
                style={styles.inputRowText}
                accessibilityLabel="Lugar del código QR, opcional"
              />
            </View>
          </Field>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={sending ? 'Enviando…' : 'Enviar reporte'}
            onPress={submit}
            loading={sending}
            disabled={sending}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  optional = false,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  /** Mensaje de validacion; se pinta debajo del campo. */
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={text.fieldLabel}>
        {label}
        {optional ? <Text style={styles.optional}> (opcional)</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  field: {
    gap: 7,
  },
  error: {
    ...text.caption,
    color: verdicts.malicioso.color,
  },
  optional: {
    fontFamily: text.captionMd.fontFamily,
    color: palette.textPlaceholder,
  },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontFamily: text.bodySm.fontFamily,
    fontSize: 14,
    color: palette.textPrimary,
  },
  textarea: {
    minHeight: 108,
    paddingVertical: spacing.md,
    lineHeight: 21,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: sizing.inputHeight,
    paddingVertical: 0,
  },
  inputRowText: {
    flex: 1,
    minWidth: 0,
    fontFamily: text.rowValue.fontFamily,
    fontSize: 14,
    color: palette.textPrimary,
    paddingVertical: 0,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    paddingBottom: 24,
  },
});
