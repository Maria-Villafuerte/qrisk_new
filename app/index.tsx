import { Redirect } from 'expo-router';

/**
 * El prototipo siempre arranca en el onboarding para poder recorrer el flujo
 * completo. Con permisos reales, aqui se decidiria segun el estado guardado.
 */
export default function Index() {
  return <Redirect href="/onboarding/camera" />;
}
