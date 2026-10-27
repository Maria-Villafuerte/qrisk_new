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
  WarningCircleIcon,
} from '../src/design-system';
import {
  COMMENT_MAX,
  PLACE_MAX,
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
  /**
   * Fallo del ultimo envio. Va fijo sobre el boton y no en un toast: el toast
   * desaparecia en pocos segundos y la persona no sabia si reintentar.
   */
  const [sendError, setSendError] = useState<string | null>(null);
  /** Campo con el foco, para resaltar su borde. */
  const [focused, setFocused] = useState<'comment' | 'place' | null>(null);

  /** Borde del campo: rojo si tiene error, azul si tiene el foco. */
  const inputState = (field: 'comment' | 'place') => [
    focused === field && styles.inputFocused,
    errors[field] ? styles.inputError : null,
  ];

  const submit = async () => {
    if (sending) return;

    const draft = { comment, place };
    const validation = validateReport(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSending(true);
    setSendError(null);
    try {
      const outcome = await submitReport(result, draft);

      if (outcome.ok) {
        toast.show('Reporte enviado de forma anónima. ¡Gracias por proteger a otros!');
        router.back();
        return;
      }

      // No se limpia el formulario ni se sale de la pantalla: lo que la
      // persona escribio se conserva para que pueda reintentar.
      setSendError(outcome.message);
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

          <Field
            label="COMENTARIO"
            optional
            error={errors.comment}
            count={{ value: comment.length, max: COMMENT_MAX }}
          >
            <TextInput
              value={comment}
              onChangeText={setComment}
              // El tope se impone al escribir: antes solo se sabia al enviar.
              maxLength={COMMENT_MAX}
              placeholder="Ej. El código estaba pegado encima del QR original del parqueo…"
              placeholderTextColor={palette.textPlaceholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => setFocused('comment')}
              onBlur={() => setFocused(null)}
              style={[styles.input, styles.textarea, ...inputState('comment')]}
              accessibilityLabel="Comentario opcional"
            />
          </Field>

          <Field
            label="¿DÓNDE ESTABA EL QR?"
            optional
            error={errors.place}
            count={{ value: place.length, max: PLACE_MAX }}
          >
            <View style={[styles.input, styles.inputRow, ...inputState('place')]}>
              <LocationIcon size={16} color={palette.textTertiary} />
              <TextInput
                value={place}
                onChangeText={setPlace}
                maxLength={PLACE_MAX}
                placeholder="Ej. Parqueo Plaza Sol, Zona 10"
                placeholderTextColor={palette.textPlaceholder}
                onFocus={() => setFocused('place')}
                onBlur={() => setFocused(null)}
                style={styles.inputRowText}
                accessibilityLabel="Lugar del código QR, opcional"
              />
            </View>
          </Field>
        </ScrollView>

        <View style={styles.footer}>
          {sendError ? (
            <View style={styles.sendError} accessibilityLiveRegion="polite" accessibilityRole="alert">
              <WarningCircleIcon size={16} color={verdicts.malicioso.color} />
              <Text style={styles.sendErrorText}>{sendError}</Text>
            </View>
          ) : null}
          <Button
            label={sending ? 'Enviando…' : sendError ? 'Reintentar envío' : 'Enviar reporte'}
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
  count,
  children,
}: {
  label: string;
  optional?: boolean;
  /** Mensaje de validacion; se pinta debajo del campo. */
  error?: string;
  /** Caracteres usados y tope del campo; se pinta a la derecha de la etiqueta. */
  count?: { value: number; max: number };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={[text.fieldLabel, styles.fieldLabel]}>
          {label}
          {optional ? <Text style={styles.optional}> (opcional)</Text> : null}
        </Text>
        {count ? (
          <Text
            style={[text.caption, count.value >= count.max && styles.countFull]}
            accessibilityLabel={`${count.value} de ${count.max} caracteres`}
          >
            {count.value}/{count.max}
          </Text>
        ) : null}
      </View>
      {children}
      {error ? (
        // Se anuncia al aparecer: si no, quien usa lector de pantalla solo
        // nota que el boton "no hizo nada".
        <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
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
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  fieldLabel: {
    flex: 1,
  },
  /** Tope alcanzado: el contador pasa al color de error. */
  countFull: {
    color: verdicts.malicioso.color,
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
  inputFocused: {
    borderColor: palette.brand,
  },
  inputError: {
    borderColor: verdicts.malicioso.color,
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
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sendError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: verdicts.malicioso.tint,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sendErrorText: {
    ...text.captionMd,
    flex: 1,
    color: verdicts.malicioso.color,
  },
});
