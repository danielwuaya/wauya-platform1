# Piloto gratuito de captación en Niagara

Esta primera fase descubre negocios mediante OpenStreetMap/Overpass y prepara un CSV para la pestaña `Leads` de Google Sheets/MyWuaya. No envía correos, DMs ni llamadas, no consulta Google Maps o redes sociales y no escribe directamente en Google Sheets o Supabase.

La ausencia de una etiqueta `website`, `contact:website` o `url` en OpenStreetMap **no demuestra** que el negocio no tenga sitio web. El resultado se considera una pista para verificación humana; todos los registros quedan pendientes y sin consentimiento afirmado.

## Descubrimiento con Overpass

Requisitos: Node.js 18 o posterior. No se necesitan paquetes, claves ni servicios de pago.

```bash
# Ver las consultas sin usar la red
npm run leads:niagara -- --dry-run --locality "St. Catharines" --sector automotive

# Crear CSV importable en la pestaña Leads
npm run leads:niagara -- --locality "St. Catharines" --sector automotive --limit 100 --out niagara-leads.csv
```

Sin filtros, el script recorre todas las localidades y sectores de `config/niagara-leads.json`. Las peticiones son secuenciales, tienen una pausa configurable y usan un endpoint alternativo sólo cuando el principal falla. El CSV contiene exactamente:

`Empresa`, `Industria`, `Ciudad`, `Dirección`, `Teléfono`, `Website URL`, `Fuente URL`, `Evidencia sin web`, `Fecha de investigación`, `Estado de enriquecimiento`, `Elegibilidad de contacto`, `Base de consentimiento`, `Estado de baja`.

La configuración inicial incluye St. Catharines, Niagara Falls, Welland, Fort Erie, Thorold, Pelham, Port Colborne, Lincoln, Grimsby, Niagara-on-the-Lake, Wainfleet y West Lincoln. Cada localidad usa un radio aproximado: antes de usar un registro se debe confirmar manualmente que la dirección pertenezca a Niagara Region.

Los sectores se configuran con pares de etiquetas OSM. Para agregar uno:

```json
{
  "id": "florists",
  "label": "Floristerías",
  "selectors": [{ "key": "shop", "value": "florist" }]
}
```

OpenStreetMap se publica bajo ODbL. Al reutilizar o publicar datos derivados, conserva la atribución correspondiente a OpenStreetMap y sus colaboradores. El campo `Fuente URL` enlaza al objeto OSM específico para revisión.

## Activación

1. Ejecuta `supabase/migrations/20260813_outbound_foundation.sql` en el SQL Editor del proyecto Supabase.
2. Crea o abre una Google Sheet con pestaña `Leads` e importa el CSV generado. No se requieren credenciales para generar el archivo.
3. Desde MyWuaya, importa ese Sheet. Reimportarlo no debe crear duplicados cuando empresa, ciudad y un dato de contacto coincidan.
4. Revisa la evidencia, la elegibilidad, la base de consentimiento y el estado de baja antes de cualquier contacto.

La migración sólo prepara columnas; este piloto no la ejecuta ni modifica una instancia de Supabase.

## Validación local

```bash
npm test
npm run build
```

## Siguiente fase sin coste

- Usar Google Sheets como bandeja de entrada de leads revisados y una función programada de Supabase para importar/enriquecer en lotes.
- Generar borradores con el proveedor de IA que ya se configure en la cuenta, sin envío automático.
- Añadir OAuth de Google solo cuando se quiera crear eventos de Calendar o usar Gmail con permisos explícitos.

No se deben automatizar envíos hasta contar con identidad del remitente, enlace de baja, registro de la base aplicable de contacto y manejo de respuestas/rebotes.
