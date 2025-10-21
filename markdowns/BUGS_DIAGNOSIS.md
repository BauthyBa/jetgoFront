# 🐛 Diagnóstico de Errores - JetGo

## Fecha: ${new Date().toLocaleDateString('es-ES')}

---

## 1️⃣ Carga de Imágenes en Login/Registro

### 🔍 Hallazgos:

**Login.jsx**:
- ❌ NO tiene carga de imágenes
- ✅ Solo tiene email/password
- 📌 Esto es correcto - login no necesita cargar imágenes

**Register.jsx**:
- ❌ Solo tiene carga de DNI (frente y dorso)
- ❌ NO tiene carga de avatar/foto de perfil
- ❌ No usa el componente `AvatarUpload.jsx`

**AvatarUpload.jsx**:
- ✅ Componente existe y está bien implementado
- ✅ Sube imágenes a Supabase Storage
- ✅ Tiene validaciones de tamaño y tipo
- ❌ Pero NO se usa en Register ni en Login

### 💡 Diagnóstico:
El componente `AvatarUpload` existe pero no está integrado en el proceso de registro. 
El usuario puede registrarse pero no puede subir una foto de perfil durante el registro.

### 🔧 Solución Recomendada:
1. Agregar `AvatarUpload` en `ProfilePage.jsx` (no en registro)
2. El registro debe ser simple: solo datos básicos
3. El usuario puede agregar su foto después desde su perfil

---

## 2️⃣ Botón "Crear Viaje"

### 🔍 Hallazgos:

**CreateTripForm.jsx**:
- ✅ Formulario completo y bien estructurado
- ✅ Tiene `handleSubmit` correctamente implementado
- ✅ Llama a `createTrip(tripData)` del servicio
- ✅ Valida campos obligatorios
- ✅ Tiene estados de loading/error/success
- ✅ Redirige a `/viajes` después de crear

**trips.js** (servicio):
```javascript
export async function createTrip(payload) {
  const { data } = await api.post('/trips/create/', payload)
  return data
}
```
- ✅ Servicio existe y hace POST correcto
- ⚠️ No hay manejo de errores explícito

### 💡 Diagnóstico:
El botón y formulario están correctos. Si hay error, probablemente viene del backend o de:
- Campos faltantes en el payload
- Token de autenticación no incluido
- Validaciones del backend

### 🔧 Solución Recomendada:
1. Agregar mejores mensajes de error
2. Agregar console.log del payload antes de enviar
3. Verificar que profile.id esté presente

---

## 3️⃣ Reseñas NO Visibles en Trip Details

### 🔍 Hallazgos:

**Componentes de reseñas que EXISTEN**:
- ✅ `TripReviews.jsx` - Página completa de reseñas
- ✅ `TripReviewsList.jsx` - Lista de reseñas
- ✅ `TripReviewStats.jsx` - Estadísticas
- ✅ `TripReviewForm.jsx` - Formulario para escribir
- ✅ `TripReviewCard.jsx` - Tarjeta individual
- ✅ `ReviewsPage.jsx` - Página de reseñas del usuario
- ✅ `UserTripReviews.jsx` - Reseñas del usuario

**TripDetails.jsx**:
```bash
❌ grep "ReviewsSection|TripReviews|ReportUser" -> No matches found
```

### 💡 Diagnóstico:
**Los componentes de reseñas ya existen pero NO están integrados en TripDetails.jsx**

El archivo `TripDetails.jsx` NO muestra:
- Sección de reseñas del viaje
- Botón para ver reseñas
- Botón para escribir reseña
- Link a página de reseñas

### 🔧 Solución Recomendada:
Agregar a `TripDetails.jsx`:
1. Botón "Ver reseñas" que lleve a `/trip/:tripId/reviews`
2. (Opcional) Mostrar estadísticas básicas de reseñas inline
3. (Opcional) Mostrar últimas 3 reseñas con botón "Ver todas"

---

## 4️⃣ Función de Reportar NO Visible

### 🔍 Hallazgos:

**ReportUserModal.jsx**:
- ✅ Componente completo y funcional
- ✅ Maneja subida de evidencia
- ✅ Filtra palabras ofensivas
- ✅ Tiene validaciones
- ✅ Se integra con backend

**TripDetails.jsx**:
```bash
❌ grep "ReportUser|reportar" -> No matches found
```

### 💡 Diagnóstico:
**El componente de reportes existe pero NO está integrado en TripDetails.jsx**

No hay manera de reportar:
- Al organizador del viaje
- A otros participantes
- A usuarios desde el perfil

### 🔧 Solución Recomendada:
Agregar a `TripDetails.jsx`:
1. Botón "Reportar organizador" (menú de opciones)
2. Integrar `ReportUserModal`
3. Mostrar modal al hacer click

---

## 5️⃣ Error al Ver Integrantes / Entrar a Perfil

### 🔍 Hallazgos:

**TripDetails.jsx** - Sección de participantes:
```javascript
Line 106-126:
{participants.map((m) => (
  <button
    key={m.user_id}
    onClick={() => {
      try {
        if (!m?.user_id) return
        // Intentar navegar por username si está disponible, sino por user_id
        if (m.username) {
          navigate(`/u/${m.username}`)
        } else {
          navigate(`/u/${m.user_id}`)
        }
      } catch {}
    }}
  >
    <div>{m.name || m.user_id}</div>
    <div>Ver perfil →</div>
  </button>
))}
```

**Rutas configuradas** (main.jsx):
```javascript
{ path: 'u/:username', element: <PublicProfilePage /> },
{ path: 'profile/:userId', element: <PublicProfilePage /> },
```

### 💡 Diagnóstico:
**Hay inconsistencia en las rutas de perfil**

El problema es que se navega a `/u/${user_id}` pero la ruta `/u/:username` espera un USERNAME, no un USER_ID.

Posibles errores:
1. Si `m.username` es `undefined` → navega a `/u/${user_id}` → ruta espera username
2. La ruta `/u/` debería aceptar tanto username como ID
3. O debería usar siempre `/profile/${user_id}`

### 🔧 Solución Recomendada:
**Opción 1** (Recomendada): Usar siempre ruta con ID
```javascript
navigate(`/profile/${m.user_id}`)
```

**Opción 2**: Asegurar que siempre hay username o fallar con gracia

**Opción 3**: Hacer que PublicProfilePage acepte ambos (ID o username)

---

## 6️⃣ AvatarUpload NO integrado en ProfilePage

### 🔍 Hallazgos:

```bash
grep "AvatarUpload" src/pages/ProfilePage.jsx -> No matches found
```

**ProfilePage.jsx**:
- ❌ NO importa `AvatarUpload`
- ❌ NO tiene sección para cambiar foto
- ⚠️ Tiene estados para avatar pero no el componente

### 💡 Diagnóstico:
El componente `AvatarUpload` existe pero no se usa en ProfilePage.
El usuario no puede cambiar su foto de perfil desde la interfaz.

### 🔧 Solución Recomendada:
Integrar `AvatarUpload` en la pestaña "Configuración" o "Perfil" de ProfilePage.

---

## 📊 Resumen de Problemas

| # | Problema | Gravedad | Componente Existe | Solo Falta Integrar |
|---|----------|----------|-------------------|---------------------|
| 1 | Carga imágenes login | 🟡 Baja | ✅ Sí | ✅ Sí |
| 2 | Botón crear viaje | 🟢 Baja | ✅ Sí | ⚠️ Verificar |
| 3 | Reseñas no visibles | 🔴 Alta | ✅ Sí | ✅ Sí |
| 4 | Reportar no visible | 🟠 Media | ✅ Sí | ✅ Sí |
| 5 | Nav a perfil rota | 🔴 Alta | ✅ Sí | ⚠️ Fix ruta |
| 6 | Avatar en perfil | 🟡 Media | ✅ Sí | ✅ Sí |

---

## ✅ Plan de Acción

### Prioridad 1 (Crítico):
1. ✅ Corregir navegación a perfiles de integrantes
2. ✅ Integrar sección de reseñas en TripDetails
3. ✅ Integrar botón de reportar en TripDetails

### Prioridad 2 (Importante):
4. ✅ Integrar AvatarUpload en ProfilePage
5. ✅ Mejorar manejo de errores en CreateTripForm

### Prioridad 3 (Opcional):
6. ✅ Agregar tests integrales
7. ✅ Documentar flujos completos

---

## 🎯 Resultado Esperado

Después de implementar todas las correcciones:

1. ✅ Usuarios pueden cambiar su foto de perfil
2. ✅ Crear viaje funciona sin errores
3. ✅ Reseñas visibles y accesibles desde cada viaje
4. ✅ Función de reportar accesible desde perfil y viajes
5. ✅ Navegación a perfiles funciona correctamente
6. ✅ Experiencia de usuario fluida sin errores

---

**Última actualización**: ${new Date().toLocaleString('es-ES')}

