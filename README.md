# ToReparo móvil (base ToReparo)

Aplicación Expo SDK 58 para clientes y trabajadores. La integración activa usa la API .NET 8 de `D:\ToReparoAPI` y PostgreSQL; no utiliza Firebase ni Native Notify.

## Ejecutar

```powershell
npm install
npx expo start --clear
```

En `.env.local` configura:

```text
EXPO_PUBLIC_API_URL=http://10.0.0.5:8080/api/v1
```

La IP debe ser la de la PC que ejecuta la API. El valor actual corresponde a esta PC. No uses `localhost` en el iPhone, porque allí identifica al teléfono. Mantén ambos equipos en la misma red y escanea el QR con la cámara para abrirlo en Expo Go con soporte SDK 58.

En otra terminal, arranca el backend:

```powershell
cd D:\ToReparoAPI
dotnet run --no-build --launch-profile ToReparoLAN
```

La conexión PostgreSQL está en el `appsettings.json` local de la API; allí puedes completar tu contraseña. La base principal se llama `toreparo`. Consulta el README del backend para migraciones y clave JWT.

Si pruebas desde un navegador de otro equipo, añade su origen (protocolo, IP y puerto) a `Cors:Origins` del backend. `localhost:8081` y `127.0.0.1:8081` están permitidos para el navegador de esta PC.

## Flujos integrados

- Registro y acceso con correo/contraseña. Una cuenta puede tener perfiles de cliente y trabajador; el selector del acceso conserva el modo elegido cuando ambos están disponibles.
- Registro de trabajadores con aprobación administrativa antes de aparecer en búsquedas.
- Perfiles de cliente y trabajador, foto JPEG/PNG y documento PDF privado para trabajadores.
- Catálogo, búsqueda por oficio, mapa y perfil público del trabajador.
- Disponibilidad semanal configurable, consulta de horas libres y solicitudes con duración de 60 minutos y ubicación GPS opcional.
- Aceptación, rechazo, finalización, historial y reseña vinculada al servicio terminado.
- Mapa del servicio y dirección visible al trabajador desde sus reservas.
- Chat REST, presencia, conteo de mensajes no leídos y notificaciones internas.
- Reportes vinculados a una reserva y recuperación de contraseña por correo OTP.
- Cambio de contraseña, cierre de sesión y restauración/renovación de sesión.

El trabajador publica su ubicación solo mediante una acción explícita con permiso de ubicación. No hay seguimiento en segundo plano. La publicación es opcional: sin ubicación aparece en el listado, pero no en el mapa. Web usa un mapa de OpenStreetMap; iOS y Android usan react-native-maps.

La navegación conserva las cuatro pestañas del diseño original: Inicio, Notificaciones, Chat y Mi perfil. Notificaciones, chat y presencia usan la API v1; el diseño de las pantallas se conserva. La administración se ofrece mediante endpoints protegidos de la API y no agrega una consola visual. Pagos y eliminación de cuenta siguen fuera del alcance.

El inicio del cliente recupera el saludo con avatar, trabajador destacado, las imágenes originales de los ocho oficios y tarjetas de próximos servicios e historial. El del trabajador recupera el avatar grande, estadísticas, descripción, datos de contacto y servicios. Las reservas e historial se abren desde esas tarjetas o desde Mi perfil. Los formularios conservan los campos grises redondeados, y el perfil público y la reserva reutilizan los componentes visuales originales. Las anchuras se adaptan a pantallas pequeñas y se mantienen centradas en web.

## Código activo

- `src/features/basic`: pantallas con el diseño recuperado e integración con la API actual. `LegacyScreens.js` contiene inicio del cliente, menú de perfil, bienvenida, chat y notificaciones; `BasicNavigator.js` conecta los recorridos.
- `src/services/api.js`: único cliente HTTP de esos recorridos; desenvuelve `ResponseData`, presenta errores y comparte una renovación entre solicitudes simultáneas.
- `src/services/refreshStorage*`: refresh token en SecureStore para móvil y sessionStorage para web. El access token permanece en memoria.
- `src/context/LoginProvider.js`: sesión, restauración y perfil.
- `src/utils/MainNavigator.js`: entrada a la navegación integrada.

Las pantallas y servicios anteriores se conservan como referencia visual; sus llamadas a servicios antiguos no se montan. Los componentes `LabourProfileComponent` y `ServiceBoxBar`, junto con las imágenes originales, se reutilizan en los recorridos activos. La clave JWT, contraseñas y cadenas de conexión nunca van en variables `EXPO_PUBLIC_*`.

## Comprobaciones

Desde la carpeta de la API:

```powershell
./scripts/Test-Integration.ps1
```

Este comando prepara PostgreSQL y API de pruebas separados de la base principal, comprueba el recorrido y ejecuta `tests/api-client.test.cjs`. La prueba del cliente usa la API real y PostgreSQL; solo sustituye el almacenamiento de credenciales del dispositivo por memoria.

Para bundles locales:

```powershell
npx expo export --platform ios --platform web --output-dir .expo/verification
```

En un iPhone físico todavía hay que comprobar visualmente los formularios, teclado, permisos, selección de fotos/PDF, ubicación y apertura de archivos. Generar el bundle no equivale a completar esa validación.
