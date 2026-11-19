# Mapas y seguimiento GPS

La app renderiza mapas OSM con MapLibre: MapLibre Native en iOS/Android y MapLibre GL JS en web. Configura `EXPO_PUBLIC_MAP_TILE_URL` en el entorno con la plantilla de tiles autorizada por tu proveedor. El valor de ejemplo apunta a tiles públicos de OSM para desarrollo; no debe tratarse como servicio gratuito ilimitado de producción.

MapLibre Native requiere un binario nativo que incluya el módulo. Para iOS desde Windows, crea e instala una compilación EAS de desarrollo (`npx eas-cli build --profile development --platform ios`); después inicia Metro con `npm run start:dev-client`. Expo Go no contiene `MLRNCameraModule`.

El trabajador comparte ubicación mientras existan reservas aceptadas. En móvil se solicita permiso de ubicación en segundo plano y se requiere una compilación de desarrollo/nativa, no Expo Go. La app envía una posición cada vez que el sistema reporta una actualización (objetivo de 5 s o 10 m); los límites de batería y del sistema operativo pueden espaciar esas actualizaciones. La web comparte ubicación solo mientras la pestaña esté activa.

La API conserva solo la posición más reciente de cada reserva aceptada. SignalR avisa al cliente; REST recupera la última posición al abrir o reconectar. Al completar, rechazar o cancelar se detiene el seguimiento y se limpian las coordenadas en vivo. Las coordenadas de servicio compartidas por el cliente permanecen separadas para que el trabajador pueda ver el pin del domicilio.
