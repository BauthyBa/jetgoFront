## JetGo Frontend

Aplicación frontend de JetGo construida con React + Vite. Incluye landing pública, autenticación (backend y Google vía Supabase), verificación de identidad (DNI), dashboard con chats en tiempo real y gestión/listado de viajes.

### Stack
- React 19 + Vite 7
- React Router 7
- Tailwind CSS + `tailwindcss-animate`
- Supabase (`@supabase/supabase-js`) para auth y tiempo real
- Axios para llamadas HTTP al backend
- Despliegue pensado para Vercel (`vercel.json`)

---

### Requisitos
- Node.js 18+ (recomendado 20+)
- npm 9+ o pnpm/yarn

### Instalación
```bash
npm install
```

### Variables de entorno
Crear un archivo `.env` en la raíz del proyecto (o configurar variables en Vercel) con:
```bash
# Supabase
VITE_SUPABASE_URL=tu_url_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Backend API base
VITE_API_BASE_URL=https://tu-backend.com/api
```
Si no defines variables, el proyecto usa valores por defecto de desarrollo:
- `VITE_API_BASE_URL` -> `https://jetgoback.onrender.com/api`
- `VITE_LOCAL_API_BASE_URL` (opcional) -> `http://localhost:8000/api`
- En `src/services/supabase.js` hay valores de ejemplo para URL/KEY (recomendado sobrescribir con env).

Cuando la app corre en `http://localhost` intenta detectar automáticamente si el backend local (`VITE_LOCAL_API_BASE_URL`) está disponible; si no lo encuentra o no responde al ping, vuelve a la API deployada en Render. En producción/páginas públicas siempre se mantiene la URL remota.

Importante: Nunca subas claves reales a git. Usa variables de entorno.

### Scripts
```bash
# Desarrollo con HMR
npm run dev

# Compilación producción
npm run build

# Previsualización de build
npm run preview

# Linter
npm run lint

# Copiar assets compilados a plataformas registradas (Capacitor)
npm run cap:copy

# Sincronizar Capacitor (config + plugins)
npm run cap:sync

# Build + copiar + abrir Android Studio
npm run android
```

Si ya compilaste y solo necesitás reabrir el proyecto nativo podés usar `npm run cap:open`.

### Android Studio (Windows)
- Instalá Android Studio en Windows y asegurate de descargar el SDK desde el SDK Manager (Build Tools 34+ y una imagen de emulador).
- Desde la raíz del repo, copiá `android/local.properties.example` a `android/local.properties` y reemplazá `<usuario>` por tu usuario de Windows para que `sdk.dir` apunte a `C:\Users\<usuario>\AppData\Local\Android\Sdk`.
- Abrí Android Studio (Windows) y elegí **Open** → seleccioná la carpeta `android/` del proyecto.
- Podés sincronizar el código web antes de abrir con `npm run cap:sync`. Desde Windows también podés usar `capacitor` o ejecutar `gradlew.bat assembleDebug` para compilar.
- El archivo `android/local.properties` queda fuera del control de versiones (ver `.gitignore`); cada entorno debe mantener su propia ruta al SDK.

### Estructura del proyecto
```text
jetgoFront/
├─ index.html
├─ public/
├─ src/
│  ├─ assets/
│  ├─ components/
│  │  ├─ ui/            # Componentes UI base (button, input)
│  │  ├─ *              # Cards, layouts, navegación, etc.
│  ├─ pages/            # Landing, Dashboard, Login, Register/Signup, VerifyDni
│  ├─ services/         # api.js, supabase.js, trips.js, chat.js
│  ├─ lib/              # utilidades
│  ├─ main.jsx          # bootstrap React + Router
│  └─ index.css / App.css
├─ tailwind.config.js
├─ postcss.config.js
├─ eslint.config.js
├─ vite.config.js
├─ vercel.json
└─ package.json
```

### Principales funcionalidades
- Landing con secciones: héroe, beneficios, cómo funciona, testimonios, CTA.
- Autenticación:
  - Login/registro contra backend (`VITE_API_BASE_URL`).
  - OAuth Google vía Supabase.
- Verificación de identidad (DNI) y sincronización de metadata con Supabase/backend.
- Dashboard:
  - Chats por sala con subscripción en tiempo real (Supabase).
  - Listado/creación de viajes (consumo de API backend).
  - Filtros y grilla de viajes; unión a viaje y refresco de salas.
- Theming y UI con Tailwind, colores y gradientes personalizados.

### Configuración de rutas (Router)
La navegación principal se basa en React Router (v7). Rutas destacadas:
- `/` Landing pública.
- `/login` y `/signup` autenticación por backend.
- `/verify-dni` flujo de verificación de identidad.
- `/dashboard#inicio|#profile|#chats|#trips|#expenses` secciones internas del dashboard.

### Integraciones
- Supabase (`src/services/supabase.js`):
  - Lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
  - `signInWithGoogle`, `getSession`, `updateUserMetadata`.
- API backend (`src/services/api.js`):
  - Base URL desde `VITE_API_BASE_URL`, con detección automática de backend local en desarrollo (`VITE_LOCAL_API_BASE_URL`).
  - Manejador de token JWT en `localStorage` y expiración.
  - Endpoints usados: `/auth/register/`, `/auth/login/`, `/auth/upsert_profile/`.
- Viajes (`src/services/trips.js`):
  - `/trips/list/`, `/trips/join/` y mapeo `normalizeTrip` tolerante a múltiples formas de payload.

### Estilos
Tailwind está configurado con `darkMode: 'class'` y diseño extendido en `tailwind.config.js` (colores basados en CSS variables, sombras, gradientes y animaciones).

### Despliegue
El proyecto está preparado para Vercel. Archivo `vercel.json`:
```json
{
  "version": 2,
  "routes": [
    { "src": "/(.*)\\.(js|css|map|svg|png|jpg|jpeg|gif|ico|txt|json)", "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```
Pasos recomendados:
1) Conectar el repo en Vercel.
2) Configurar variables de entorno (`VITE_*`).
3) Build Command: `npm run build` – Output: `dist/` (por defecto de Vite).

### Buenas prácticas y linting
- ESLint configurado en `eslint.config.js` con reglas para React y hooks.
- Ejecutar `npm run lint` antes de subir cambios.

### Desarrollo local rápido
1) Copia `.env.example` a `.env` (o crea `.env`) y completa las variables.
2) `npm install`
3) `npm run dev`
4) Abrí `http://localhost:5173` (puerto por defecto de Vite) y probá login/registro y dashboard.

### Solución de problemas
- No carga el dashboard después de login:
  - Verificá que `VITE_API_BASE_URL` apunte al backend correcto y que responda.
  - Revisá consola del navegador por errores CORS o 401.
- Chat sin mensajes o sincronicidad:
  - Confirmá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
  - Revisá reglas RLS/Realtime en tu proyecto Supabase.
- Verificación de DNI no persiste:
  - Se usa `localStorage` y metadata en Supabase. Revisá `updateUserMetadata` y `upsert_profile`.

### Licencia
Propietario del proyecto. Todos los derechos reservados, salvo acuerdo en contrario.
