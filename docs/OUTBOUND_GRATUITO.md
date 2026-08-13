# Base gratuita de outbound

Esta primera fase no envía correos ni llamadas. Importa leads de Sheets de forma idempotente y conserva la evidencia necesaria para decidir más tarde si un contacto puede enviarse.

## Activación

1. Ejecuta `supabase/migrations/20260813_outbound_foundation.sql` en el SQL Editor del proyecto Supabase.
2. Importa un Sheet. Reimportarlo no debe crear duplicados cuando empresa, ciudad y un dato de contacto coincidan.
3. Revisa `contact_eligibility` y `consent_type` antes de preparar cualquier mensaje comercial.

## Siguiente fase sin coste

- Usar Google Sheets como bandeja de entrada de leads y una función programada de Supabase para importar/enriquecer en lotes.
- Generar borradores con el proveedor de IA que ya se configure en la cuenta, sin envío automático.
- Añadir OAuth de Google solo cuando se quiera crear eventos de Calendar o usar Gmail con permisos explícitos.

No se deben automatizar envíos hasta contar con identidad del remitente, enlace de baja, registro de la base aplicable de contacto y manejo de respuestas/rebotes.
