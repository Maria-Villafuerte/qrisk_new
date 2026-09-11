# Correr QRisk en iOS (pasos en la Mac)

Todo lo configurable desde Windows ya está hecho y verificado. Este documento
cubre lo único que exige macOS: generar `ios/`, compilar y probar en el
dispositivo.

**Por qué no se puede desde Windows:** `expo prebuild -p ios` genera un proyecto
de Xcode y corre CocoaPods, que solo existen en macOS. No es una limitación de
la app, sino de la plataforma.

---

## Lo que ya está listo (no hay que tocarlo)

| Cosa | Valor | Dónde |
|---|---|---|
| `bundleIdentifier` | `com.qrisk.app` | `app.json` → `expo.ios` |
| `buildNumber` | `1` | `app.json` → `expo.ios` |
| Nombre visible | `QRisk` | `app.json` → `expo.name` |
| Versión | `1.0.0` | `app.json` → `expo.version` |
| Textos de permiso | 4 claves `NS*UsageDescription` en español | `app.json` → `expo.ios.infoPlist` |
| Safe area | Resuelta con insets reales del dispositivo | `src/design-system/components/Screen.tsx` |
| Teclado | Offset corregido para iPhone con notch | `app/report.tsx` |

Los cuatro textos de permiso están declarados **dos veces a propósito**: los
config plugins los escriben durante el prebuild, y además están explícitos en
`expo.ios.infoPlist` como red de seguridad. iOS **cierra la app** si pide un
permiso sin su texto de uso, y eso solo se vería en el dispositivo.

---

## Requisitos en la Mac

- **macOS** con **Xcode** instalado (desde la App Store) y abierto al menos una
  vez, para que acepte la licencia.
- **Node 20+** (el mismo que usás en Windows).
- **CocoaPods**: `sudo gem install cocoapods` (o `brew install cocoapods`).
- Para probar en un **iPhone físico**: una cuenta de Apple (la gratuita sirve
  para desarrollo; la de pago, US$99/año, solo hace falta para publicar).

---

## Pasos

```bash
# 1. Traer el proyecto y las dependencias
git clone <repo> && cd qrisk-app
npm install

# 2. Generar la carpeta ios/ (no está en el repo: la genera el prebuild)
npx expo prebuild -p ios

# 3. Correr en el simulador (rápido, para ver que la app arranca)
npx expo run:ios

# 4. Correr en un iPhone físico (necesario para probar la cámara)
npx expo run:ios --device
```

En el paso 4, la primera vez Xcode va a pedir un **equipo de firma**. Si aparece
un error de *signing*, abrí `ios/QRisk.xcworkspace` en Xcode, seleccioná el
target **QRisk** → pestaña **Signing & Capabilities** → marcá *Automatically
manage signing* y elegí tu cuenta en *Team*. Después volvé a correr el comando.

> **Ojo:** el simulador **no tiene cámara real**. El escaneo de QR solo se puede
> probar en un iPhone físico. Todo lo demás (historial, reporte, Story Card,
> navegación) sí funciona en el simulador.

---

## Qué verificar en el dispositivo

Marcá cada uno; son los puntos donde iOS se comporta distinto de Android.

- [ ] **Los 4 diálogos de permiso** muestran el texto en español, no el genérico
      de Apple. Cámara al abrir el escáner, ubicación al analizar, fotos al
      elegir la foto de contexto, y "guardar fotos" al guardar la Story Card.
- [ ] **La app no se cierra** al pedir cada permiso. Un cierre instantáneo =
      falta un `NS*UsageDescription`.
- [ ] **Notch / Dynamic Island:** ningún texto ni botón queda tapado arriba.
- [ ] **Home indicator:** los botones de abajo no quedan debajo de la barra.
- [ ] **Escáner:** el video se ve de borde a borde, pero los controles respetan
      el área segura.
- [ ] **Teclado en "Reportar QR":** al tocar *¿Dónde estaba el QR?* el campo
      **sube y queda visible**. Es el punto que corregí a ciegas y el que más
      conviene mirar.
- [ ] **Fuentes Figtree** cargan bien (si no, se vería la tipografía del sistema).
- [ ] **Historial persiste** tras cerrar la app por completo (deslizar hacia
      arriba en el multitarea) y volver a abrirla.

---

## Si algo falla

| Síntoma | Causa probable | Solución |
|---|---|---|
| La app se cierra al pedir un permiso | Falta un `NS*UsageDescription` | Verificar `ios/QRisk/Info.plist`; si falta, `npx expo prebuild -p ios --clean` |
| Error de *signing* | Sin equipo seleccionado | Abrir el `.xcworkspace` en Xcode y configurar *Team* |
| `pod install` falla | CocoaPods desactualizado | `sudo gem install cocoapods` y `cd ios && pod install` |
| Cambios de `app.json` no se ven | La carpeta `ios/` quedó vieja | `npx expo prebuild -p ios --clean` |
| Fuentes no cargan | Assets sin enlazar | `npx expo prebuild -p ios --clean` |

**Regla general:** casi todo se arregla con
`npx expo prebuild -p ios --clean`. La carpeta `ios/` es **generada**, no
editable a mano: cualquier cambio manual se pierde en el próximo prebuild. Todo
lo que deba persistir va en `app.json`.
