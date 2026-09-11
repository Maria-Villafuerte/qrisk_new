import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, verdicts, VerdictKey } from '../tokens';
import { VerdictShield } from './icons';

export interface VerdictEmblemProps {
  verdict: VerdictKey;
  /** Diametro del circulo exterior. */
  size?: number;
}

/**
 * Circulo grande con el escudo del veredicto — el elemento central de la
 * pantalla de resultado.
 */
export function VerdictEmblem({ verdict, size = 96 }: VerdictEmblemProps) {
  const theme = verdicts[verdict];

  return (
    <View
      style={[
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.tint,
          borderColor: theme.ring,
        },
      ]}
    >
      <VerdictShield verdict={verdict} size={size / 2} color={theme.color} strokeWidth={2.2} />
    </View>
  );
}

/**
 * Variante compacta: circulo concentrico azul de las pantallas de onboarding
 * y del QR sin URL.
 */
export function IconEmblem({
  children,
  size = 136,
  innerSize,
  outerColor,
  innerColor,
}: {
  children: React.ReactNode;
  size?: number;
  innerSize?: number;
  outerColor: string;
  innerColor?: string;
}) {
  const inner = innerSize ?? size * 0.7;

  return (
    <View
      style={[
        styles.plain,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: outerColor,
        },
      ]}
    >
      {innerColor ? (
        <View
          style={[
            styles.plain,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
              backgroundColor: innerColor,
            },
          ]}
        >
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radius.pill,
  },
  plain: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
