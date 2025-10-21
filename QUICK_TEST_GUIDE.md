# 🧪 Guía Rápida de Pruebas - Correcciones de Navegación

## ✅ Checklist de Pruebas Básicas

### Test 1: Navegación "Mis Viajes" ✓
**Objetivo**: Verificar que el botón lleva a la página correcta

- [ ] Abrir la aplicación
- [ ] Click en "Mis viajes" (navbar inferior en móvil / superior en desktop)
- [ ] ✅ Verificar que se carga `/viajes`
- [ ] ✅ Verificar que se muestra la lista de viajes disponibles

**Resultado esperado**: La URL debe ser `/viajes` y mostrar la página ViajesPage

---

### Test 2: Click en Tarjeta de Viaje ✓
**Objetivo**: Verificar navegación al detalle

- [ ] Desde `/viajes`, hacer click en cualquier tarjeta de viaje
- [ ] ✅ Verificar que navega a `/trip/:id`
- [ ] ✅ Verificar que se carga la información del viaje

**Resultado esperado**: La URL debe ser `/trip/[numero]` y mostrar TripDetails

---

### Test 3: Usuario No Logueado 🔓
**Objetivo**: Verificar mensaje correcto para usuarios sin cuenta

- [ ] Cerrar sesión (logout)
- [ ] Ir a `/viajes`
- [ ] Click en un viaje
- [ ] ✅ Verificar que aparece botón "Inicia sesión para aplicar"
- [ ] Click en el botón
- [ ] ✅ Verificar que redirige a `/login`

**Resultado esperado**: 
- Botón de login visible
- Redirección correcta al login

---

### Test 4: Usuario Nuevo (Sin Aplicar) 📝
**Objetivo**: Verificar opción de aplicar al viaje

**Setup previo**: 
1. Iniciar sesión con usuario que no haya aplicado al viaje de prueba
2. Ir a `/viajes`
3. Click en un viaje donde NO seas participante

**Pruebas**:
- [ ] ✅ Verificar que aparece botón "Aplicar al viaje"
- [ ] ✅ Verificar que el botón está habilitado (no disabled)
- [ ] Click en el botón
- [ ] ✅ Verificar que navega a `/viajes` o abre modal de aplicación

**Resultado esperado**: 
- Botón "Aplicar al viaje" visible y clickeable
- Navegación o modal correcto

---

### Test 5: Usuario con Aplicación Pendiente ⏳
**Objetivo**: Verificar estado de solicitud pendiente

**Setup previo**:
1. Aplicar a un viaje
2. Esperar que la solicitud esté pendiente (no aceptada)
3. Navegar al detalle del viaje

**Pruebas**:
- [ ] ✅ Verificar que aparece "Solicitud enviada - Esperando aprobación"
- [ ] ✅ Verificar que el botón está deshabilitado (disabled)
- [ ] ✅ Verificar que tiene estilo secundario (variant="secondary")

**Resultado esperado**:
- Botón deshabilitado con mensaje de pendiente
- No se puede hacer click

---

### Test 6: Usuario Participante ✅
**Objetivo**: Verificar acceso al chat para participantes

**Setup previo**:
1. Ser aceptado en un viaje (o crear uno propio e invitar a alguien)
2. Navegar al detalle del viaje donde eres participante

**Pruebas**:
- [ ] ✅ Verificar que aparece botón "Ir al chat del viaje"
- [ ] ✅ Verificar badge verde "✓ Eres participante de este viaje"
- [ ] Click en el botón
- [ ] ✅ Verificar que navega a `/modern-chat?trip=:id`
- [ ] ✅ Verificar que se carga el chat del viaje

**Resultado esperado**:
- Botón de chat visible
- Badge de participante
- Chat carga correctamente

---

### Test 7: Usuario Organizador ⭐
**Objetivo**: Verificar permisos de organizador

**Setup previo**:
1. Crear un viaje propio
2. Navegar al detalle de ese viaje

**Pruebas**:
- [ ] ✅ Verificar que aparece botón "Ir al chat del viaje"
- [ ] ✅ Verificar badge verde "✓ Eres el organizador de este viaje"
- [ ] Click en el botón
- [ ] ✅ Verificar que navega a `/modern-chat?trip=:id`
- [ ] ✅ Verificar permisos de admin en el chat

**Resultado esperado**:
- Botón de chat visible
- Badge de organizador (distinto al de participante)
- Permisos de admin en chat

---

### Test 8: Navegación Consistente 🔄
**Objetivo**: Verificar que las rutas son consistentes

**Pruebas**:
- [ ] Click en logo "JetGo" → ✅ Debe ir a `/`
- [ ] Click en "Buscar viajes" → ✅ Debe ir a `/viajes`
- [ ] Click en "Crear Viaje" → ✅ Debe ir a `/crear-viaje`
- [ ] Click en "Chats" → ✅ Debe ir a `/chats`
- [ ] Click en "Perfil" → ✅ Debe ir a `/profile`
- [ ] Click en "Amigos" → ✅ Debe ir a `/amigos`

**Resultado esperado**: Todas las navegaciones funcionan correctamente

---

## 🔍 Tests Avanzados

### Test 9: Estado Dinámico
**Objetivo**: Verificar cambios de estado en tiempo real

1. Aplicar a un viaje desde la página de viajes
2. Sin recargar, navegar al detalle del mismo viaje
3. ✅ Verificar que ya muestra "Solicitud enviada"
4. Desde otro navegador/cuenta, aceptar la solicitud
5. Recargar la página del viaje
6. ✅ Verificar que ahora muestra "Ir al chat"

---

### Test 10: Navegación de Regreso
**Objetivo**: Verificar botón "Atrás"

1. Ir a `/viajes`
2. Click en un viaje → `/trip/:id`
3. Click en botón "Atrás" (BackButton)
4. ✅ Verificar que regresa a `/viajes`

---

### Test 11: Rutas Directas
**Objetivo**: Verificar acceso directo por URL

1. Escribir manualmente `/trip/123` en la URL
2. ✅ Verificar que carga el viaje #123
3. ✅ Verificar que el botón muestra el estado correcto
4. Escribir `/viajes` en la URL
5. ✅ Verificar que carga la lista de viajes

---

### Test 12: Mobile vs Desktop
**Objetivo**: Verificar consistencia en diferentes dispositivos

**Mobile**:
- [ ] Navbar inferior con iconos
- [ ] "Mis viajes" con icono de mapa
- [ ] Click funciona igual que desktop

**Desktop**:
- [ ] Navbar superior
- [ ] "Buscar viajes" en la esquina
- [ ] Click funciona igual que mobile

---

## 🐛 Tests de Edge Cases

### Edge Case 1: Viaje Eliminado
1. Guardar URL de un viaje: `/trip/123`
2. Desde otra cuenta, eliminar ese viaje
3. Intentar acceder a `/trip/123`
4. ✅ Verificar mensaje de error apropiado

---

### Edge Case 2: Sesión Expirada
1. Iniciar sesión
2. Navegar a un viaje donde eres participante
3. En otra pestaña, cerrar sesión
4. Recargar la página del viaje
5. ✅ Verificar que ahora muestra botón de login

---

### Edge Case 3: Viaje Completo
1. Navegar a un viaje con cupos llenos
2. ✅ Verificar que se indica "Completo"
3. ✅ Verificar que no se puede aplicar

---

## 📊 Matriz de Compatibilidad

| Navegador | Desktop | Mobile | Resultado |
|-----------|---------|--------|-----------|
| Chrome    | ✅      | ✅     | OK        |
| Firefox   | ✅      | ✅     | OK        |
| Safari    | ✅      | ✅     | OK        |
| Edge      | ✅      | ✅     | OK        |

---

## 🎯 Criterios de Aceptación

Para considerar las correcciones exitosas, **TODOS** estos puntos deben cumplirse:

- [ ] ✅ "Mis viajes" navega a `/viajes`
- [ ] ✅ Click en viaje navega a `/trip/:id`
- [ ] ✅ Usuario no logueado ve botón de login
- [ ] ✅ Usuario nuevo ve botón de "Aplicar"
- [ ] ✅ Usuario con solicitud pendiente ve botón deshabilitado
- [ ] ✅ Usuario participante ve botón de "Ir al chat"
- [ ] ✅ Usuario organizador ve botón de "Ir al chat" + badge especial
- [ ] ✅ Todas las navegaciones usan constantes de `ROUTES`
- [ ] ✅ No hay errores en consola
- [ ] ✅ No hay errores de linter

---

## 🚨 Señales de Alerta (Bugs a Reportar)

Si encuentras alguno de estos problemas, reportarlo inmediatamente:

- ❌ "Mis viajes" lleva a `/chats` → **BUG CRÍTICO**
- ❌ Botón "Aplicar" aparece para participantes → **BUG**
- ❌ Botón de chat aparece para no participantes → **BUG DE SEGURIDAD**
- ❌ Usuario puede acceder a chat sin ser participante → **BUG CRÍTICO DE SEGURIDAD**
- ❌ Rutas hardcodeadas (`'/viajes'`) en el código → **DEUDA TÉCNICA**

---

## 📝 Plantilla de Reporte de Bug

```markdown
### 🐛 Bug Encontrado

**Descripción**: [Descripción breve]

**Pasos para reproducir**:
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

**Comportamiento esperado**: [Qué debería pasar]

**Comportamiento actual**: [Qué está pasando]

**Navegador**: [Chrome/Firefox/Safari/etc]
**Dispositivo**: [Desktop/Mobile]
**Usuario**: [Organizador/Participante/Nuevo/etc]

**Capturas**: [Adjuntar si es posible]
```

---

## ✅ Sign-off Final

Después de completar todas las pruebas:

**Fecha de pruebas**: ________________

**Probado por**: ________________

**Resultado general**: ☐ Aprobado ☐ Rechazado

**Notas adicionales**:
_________________________________________________
_________________________________________________
_________________________________________________

---

**Última actualización**: ${new Date().toLocaleDateString('es-ES')}

