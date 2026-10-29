# Guardar los correos en una hoja de Google Sheets

Por defecto la web envía cada registro (descarga de TATU y newsletter) a tu correo con FormSubmit.
Si prefieres una hoja de Google, son 5 minutos:

1. Crea una hoja nueva en Google Sheets (por ejemplo «Correos F3DE»).
2. Menú **Extensiones → Apps Script**. Borra el código y pega el contenido de `leads.gs`. Guarda.
3. **Implementar → Nueva implementación** → tipo **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
   - Autoriza los permisos y copia la **URL de la aplicación web**.
4. Abre `assets/config.js` y cambia:
   ```js
   LEADS_KIND: 'apps-script',
   LEADS_URL: 'LA_URL_QUE_COPIASTE',
   ```
5. Sube el cambio a GitHub. Cada registro nuevo aparece como una fila en la pestaña «Leads».

Nota: cualquier persona con la URL del script podría enviarle datos; no la compartas fuera de la web.
