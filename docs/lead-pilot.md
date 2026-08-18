# Base del piloto de leads

Este incremento usa únicamente React/Vite, la instancia Supabase existente y las APIs de Google ya configuradas. No envía correos, mensajes ni llamadas, y no incorpora proveedores de pago.

## Aplicación

1. Revisar y ejecutar `supabase/migrations/202608130001_lead_pilot_foundation.sql` en la instancia Supabase del proyecto.
2. Desplegar la aplicación con las variables existentes `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Importar una misma hoja dos veces. La segunda ejecución debe informar filas actualizadas y no crear duplicados.
4. Abrir un lead y comprobar procedencia, revisión de elegibilidad, historial y registro de baja.

La migración archiva, sin borrar, duplicados heredados detectados por email, teléfono o empresa+ciudad. El primer registro cronológico queda como canónico.

## Controles incorporados

- Toda importación guarda sistema, identificador externo, URL, fila/pestaña de evidencia y momento de observación.
- Una clave normalizada y un índice único evitan duplicados; la RPC de importación preserva el estado comercial al enriquecer un registro existente.
- Estados, revisiones de consentimiento, bajas y contactos manuales producen actividades auditables.
- Los leads nacen con `review_required` y base `unknown`. La base de datos bloquea el paso a “escrito” y los intentos salientes hasta que exista una revisión elegible sin baja.
- Registrar una baja fija `do_not_contact`, fecha de baja e inelegibilidad.

Estos campos son controles operativos y no sustituyen revisión legal. Antes de habilitar mensajería futura habrá que validar, para cada canal y jurisdicción, identidad del remitente, base/consentimiento vigente, contenido de baja funcional y retención de auditoría.

## Límite de seguridad previo a producción

La aplicación actual autentica roles con datos en `localStorage` y consulta Supabase directamente con la clave anónima. Por eso esta migración no activa RLS: hacerlo ahora rompería el acceso sin aportar una identidad verificable a las políticas. Antes de exponer el CRM o habilitar cualquier automatización se debe migrar a Supabase Auth (o identidad equivalente), definir roles del lado servidor y luego activar políticas RLS para `cold_leads` y `cold_lead_activities`.

## Verificación local

```sh
npm install
npm test
npm run build
npm audit
```
