# 🧪 Guía de Testing Final - Correcciones de Bugs

## ✅ Checklist Rápido de Testing

### 📋 Antes de Empezar
```bash
# 1. Iniciar la aplicación
npm run dev

# 2. Abrir navegador en:
http://localhost:5173  # o el puerto que use tu aplicación
```

---

## Test 1: Navegación Básica ✅

### Objetivo: Verificar que las rutas funcionan correctamente

**Pasos**:
1. ☐ Abrir aplicación
2. ☐ Click en "Mis viajes" → Debe ir a `/viajes`
3. ☐ Click en "Chats" → Debe ir a `/chats`
4. ☐ Click en "Perfil" → Debe ir a `/profile`

**Resultado esperado**: Todas las navegaciones funcionan sin errores

---

## Test 2: Crear Viaje con Errores Descriptivos ✅

### Objetivo: Verificar que el botón "Crear Viaje" funciona y muestra errores claros

**Pasos**:
1. ☐ Click en "Crear Viaje"
2. ☐ Dejar campos vacíos y click en "Crear mi viaje"
3. ☐ **Verificar**: Debe mostrar "Por favor completa todos los campos obligatorios"
4. ☐ Llenar solo nombre, dejar fecha vacía
5. ☐ **Verificar**: Debe mostrar error específico
6. ☐ Poner fecha pasada
7. ☐ **Verificar**: Debe mostrar "La fecha de inicio debe ser futura"
8. ☐ Llenar todo correctamente
9. ☐ **Verificar**: Debe crear el viaje y redirigir a `/viajes`

**Resultado esperado**: 
- Errores descriptivos y específicos
- Creación exitosa redirige a lista de viajes
- Mensaje de éxito visible

---

## Test 3: Ver Reseñas de un Viaje ✅

### Objetivo: Verificar que el botón de reseñas funciona

**Pasos**:
1. ☐ Ir a `/viajes`
2. ☐ Click en cualquier viaje
3. ☐ **Verificar**: Debe aparecer botón "⭐ Ver Reseñas"
4. ☐ Click en "Ver Reseñas"
5. ☐ **Verificar**: Navega a `/trip/:id/reviews`
6. ☐ **Verificar**: Se muestra página de reseñas

**Resultado esperado**: 
- Botón visible en todos los viajes
- Navegación correcta
- Página de reseñas carga

---

## Test 4: Reportar Organizador ✅

### Objetivo: Verificar que el sistema de reportes funciona

**Pasos Previos**: Crear dos cuentas (Cuenta A y Cuenta B)

**Con Cuenta A**:
1. ☐ Crear un viaje
2. ☐ **Verificar**: NO debe aparecer botón "Reportar" (eres el organizador)

**Con Cuenta B**:
3. ☐ Abrir el viaje creado por Cuenta A
4. ☐ **Verificar**: Debe aparecer botón "🚩 Reportar Organizador"
5. ☐ Click en "Reportar Organizador"
6. ☐ **Verificar**: Modal se abre
7. ☐ Seleccionar motivo (ej: "Otro motivo")
8. ☐ Escribir descripción
9. ☐ (Opcional) Subir imagen de evidencia
10. ☐ Click en "Enviar Reporte"
11. ☐ **Verificar**: Mensaje de éxito

**Resultado esperado**: 
- Solo usuarios no-organizadores ven el botón
- Modal funciona correctamente
- Reporte se envía exitosamente

---

## Test 5: Navegación a Perfiles de Integrantes ✅

### Objetivo: Verificar que se puede ver el perfil de los participantes

**Pasos Previos**: Tener un viaje con al menos 2 participantes

**Pasos**:
1. ☐ Abrir un viaje en `/trip/:id`
2. ☐ Bajar a sección "Participantes"
3. ☐ **Verificar**: Se muestran los participantes
4. ☐ Click en "Ver perfil →" de cualquier participante
5. ☐ **Verificar consola**: No debe haber errores
6. ☐ **Verificar URL**: Debe ir a `/profile/:userId`
7. ☐ **Verificar**: Página de perfil carga correctamente

**Resultado esperado**: 
- Navegación funciona sin errores
- Perfil se muestra correctamente
- URL es consistente

---

## Test 6: Cambiar Avatar en Perfil ✅

### Objetivo: Verificar que se puede subir/cambiar foto de perfil

**Pasos**:
1. ☐ Ir a `/profile`
2. ☐ Click en icono de editar (lápiz)
3. ☐ **Verificar**: Avatar muestra overlay al hacer hover
4. ☐ Click en el avatar
5. ☐ Seleccionar una imagen (PNG o JPG, menor a 5MB)
6. ☐ **Verificar consola**:
   ```
   🚀 Iniciando upload de avatar...
   📝 Nombre de archivo generado: ...
   📤 Subiendo a Supabase Storage...
   ✅ Upload exitoso: ...
   🔗 URL pública generada: ...
   ✅ Avatar actualizado exitosamente
   ```
7. ☐ **Verificar**: Preview de imagen aparece
8. ☐ Guardar perfil
9. ☐ **Verificar**: Avatar se guarda correctamente

**Resultado esperado**: 
- Upload funciona sin errores
- Preview inmediato visible
- Avatar persiste después de guardar

---

## Test 7: Flujo Completo de Usuario Nuevo ✅

### Objetivo: Simular experiencia de usuario nuevo

**Pasos**:
1. ☐ Registrarse (email + password + DNI)
2. ☐ Confirmar email
3. ☐ Iniciar sesión
4. ☐ Ir a perfil y agregar avatar
5. ☐ Llenar información adicional
6. ☐ Guardar perfil
7. ☐ Buscar un viaje
8. ☐ Aplicar a un viaje
9. ☐ (Si es aceptado) Ver chat del viaje
10. ☐ Ver perfil del organizador
11. ☐ (Después del viaje) Dejar reseña

**Resultado esperado**: 
- Flujo completo sin errores
- Todas las funcionalidades accesibles

---

## 🐛 Errores Comunes y Soluciones

### Error: "No se puede navegar a perfil"
**Solución**: Verificar que el usuario tenga `user_id` válido

### Error: "No aparece botón de reportar"
**Posible causa**: Eres el organizador del viaje
**Solución**: Probar con otro usuario

### Error: "No se sube avatar"
**Verificar**:
1. Imagen es menor a 5MB
2. Formato es PNG/JPG
3. Usuario está autenticado
4. Permisos de Supabase Storage configurados

### Error: "No aparecen reseñas"
**Verificar**:
1. El viaje existe en la base de datos
2. Hay reseñas creadas
3. Backend endpoint `/trip/:id/reviews` funciona

---

## 📊 Matriz de Compatibilidad a Probar

| Funcionalidad | Desktop Chrome | Desktop Firefox | Mobile Chrome | Mobile Safari |
|--------------|----------------|-----------------|---------------|---------------|
| Crear viaje | ☐ | ☐ | ☐ | ☐ |
| Ver reseñas | ☐ | ☐ | ☐ | ☐ |
| Reportar | ☐ | ☐ | ☐ | ☐ |
| Ver perfil | ☐ | ☐ | ☐ | ☐ |
| Subir avatar | ☐ | ☐ | ☐ | ☐ |

---

## 🔍 Verificación de Consola

### Consola SIN errores debe mostrar:
```javascript
✅ Upload exitoso: {...}
✅ Respuesta del servidor: {...}
✅ Avatar actualizado exitosamente
```

### Consola CON errores mostraría:
```javascript
❌ Error creando viaje: {...}
❌ Error en upload: {...}
❌ Error navegando a perfil: {...}
```

**Si ves ❌**: Verificar el mensaje y actuar en consecuencia

---

## 🎯 Criterios de Aprobación

Para considerar el testing exitoso, **TODOS** estos puntos deben cumplirse:

- [ ] ✅ "Crear viaje" muestra errores descriptivos
- [ ] ✅ "Crear viaje" crea viaje exitosamente cuando datos son correctos
- [ ] ✅ Botón "Ver Reseñas" visible y funcional
- [ ] ✅ Botón "Reportar" solo visible para no-organizadores
- [ ] ✅ Modal de reporte funciona y envía datos
- [ ] ✅ Click en participante navega a perfil correcto
- [ ] ✅ Avatar se puede subir y cambiar desde perfil
- [ ] ✅ NO hay errores en consola del navegador
- [ ] ✅ NO hay errores de linter en el código
- [ ] ✅ Todas las navegaciones usan constantes de ROUTES

---

## 📝 Plantilla de Reporte de Testing

```markdown
## Resultado de Testing

**Fecha**: [FECHA]
**Testeador**: [NOMBRE]
**Navegador**: [Chrome/Firefox/Safari]
**Dispositivo**: [Desktop/Mobile]

### Tests Realizados:
- [ ] Test 1: Navegación Básica
- [ ] Test 2: Crear Viaje
- [ ] Test 3: Ver Reseñas
- [ ] Test 4: Reportar
- [ ] Test 5: Ver Perfiles
- [ ] Test 6: Cambiar Avatar
- [ ] Test 7: Flujo Completo

### Bugs Encontrados:
1. [Descripción del bug]
2. [Descripción del bug]

### Notas Adicionales:
[Comentarios, sugerencias, observaciones]

### Resultado General:
☐ Aprobado
☐ Aprobado con observaciones
☐ Requiere correcciones
```

---

## 🚀 Testing Automatizado (Opcional)

Si quieres agregar tests automatizados:

```bash
# Instalar dependencias
npm install -D @testing-library/react @testing-library/jest-dom vitest

# Crear archivo de test
# tests/TripDetails.test.jsx
```

Ejemplo de test:
```javascript
describe('TripDetails', () => {
  it('muestra botón de reseñas', () => {
    // ... test code
  })
  
  it('muestra botón de reportar solo para no-organizadores', () => {
    // ... test code
  })
})
```

---

## ✅ Checklist Final de Entrega

Antes de dar por finalizado el testing:

- [ ] Todos los tests manuales pasaron
- [ ] No hay errores en consola
- [ ] No hay errores de linter
- [ ] Documentación actualizada
- [ ] Archivos de diagnóstico revisados
- [ ] Screenshots de funcionalidades clave tomados
- [ ] Feedback de usuario recopilado

---

**¡Listo para testing!** 🎉

**Última actualización**: ${new Date().toLocaleString('es-ES')}

