# Base compartida con Supabase

Supabase es opcional. Si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`, la aplicación funciona en modo local con `localStorage` y semilla ficticia. La API HTTP de inundaciones no usa esta base.

## Configuración

1. Crea un proyecto de Supabase y habilita los inicios de sesión anónimos en Authentication.
2. Ejecuta `supabase/schema.sql` completo en el editor SQL. Crea tablas, políticas RLS, triggers, bucket de fotos y publicación de tiempo real. El archivo está diseñado para poder ejecutarse de nuevo sin borrar reportes.
3. Si necesitas reportes ficticios compartidos para una demo, ejecuta `supabase/seed.sql` **después** del esquema. `npm run seed:sql` regenera ese archivo con fechas relativas recientes. Al ejecutarlo, borra y vuelve a crear los registros marcados `is_demo_seed`; conserva los demás.
4. Copia `.env.example` a `.env.local` y configura la URL del proyecto y la clave pública `anon`. No uses una clave `service_role` en variables `VITE_`, porque Vite las incorpora al navegador.
5. Reinicia `npm run dev`. El encabezado indica el estado de la conexión.

Ejemplo de `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

## Modelo

| Tabla o bucket | Función |
|---|---|
| `public.reports` | Reporte, categoría, coordenadas, estado, autor, origen y foto |
| `public.confirmations` | Una confirmación por `report_id` y `user_id` |
| `public.objections` | Objeciones con motivo y texto; una por usuario y reporte |
| `public.history` | Historial escrito por triggers |
| `storage.report-photos` | Fotografías JPEG públicas, máximo 2 MB por objeto |

Las tablas permiten lectura pública. RLS limita la inserción de reportes al usuario anónimo autenticado que figura como autor, con estado pendiente y sin confirmaciones iniciales. La base impide corroborar un reporte propio o cerrado; no hay políticas de actualización ni borrado desde la app. El estado se recalcula en Postgres al insertar confirmaciones. El historial se escribe automáticamente. La app escucha cambios en las cuatro tablas y recarga los reportes.

## Identidad, privacidad y límites

Cada navegador obtiene una sesión anónima de Supabase, incluso cuando explora la interfaz como invitado. La pantalla «Continuar con Google» solo selecciona un alias ficticio local y no autentica con Google. Cerrar la sesión demo oculta las acciones de participación, pero no cierra ni cambia el UID anónimo de Supabase. Por ello, distintos perfiles demo elegidos en un mismo navegador comparten identidad y límites de corroboración en la base; esta barrera es de interfaz, no una política de seguridad adicional. No se solicitan datos personales, pero la sesión no demuestra que dos navegadores pertenezcan a personas distintas. Un usuario puede perder su identidad al borrar datos del navegador. El alias es público. Las fotos se publican en un bucket público; el formulario las vuelve a codificar para quitar metadatos EXIF, pero quien publique sigue siendo responsable del contenido visible. No existe moderación automática ni una política antispam completa.

El estado local puede actualizarse inmediatamente antes de recibir confirmación del servidor. Si una escritura remota falla, aparece un aviso y se vuelve a cargar lo guardado en Supabase. Para datos de producción, habría que añadir observabilidad, moderación, copias de seguridad y políticas de retención.
