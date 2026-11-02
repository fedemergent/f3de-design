// Guarda cada registro de la web en una hoja de Google Sheets y permite leerlos desde el gestor.
// 1) Cambia CLAVE por una palabra larga que solo tú conozcas.  2) Implementar > Nueva implementación > Aplicación web
//    (ejecutar como: yo; quién tiene acceso: cualquier persona).  3) Copia la URL en el gestor, pestaña Formularios.
const CLAVE = 'CAMBIA-ESTA-CLAVE';
const SHEET_NAME = 'Leads';
const COLS = ['Fecha', 'Correo', 'Nombre', 'Tipo', 'Tema', 'Mensaje', 'Intereses', 'Versión', 'Origen'];

function doPost(e) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME) || SpreadsheetApp.getActive().insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(COLS);
  const p = e.parameter;
  sh.appendRow([new Date(), p.email || '', p.nombre || '', p.tipo || '', p.tema || '', p.mensaje || '', p.intereses || '', p.version || '', p.origen || '']);
  return ContentService.createTextOutput('ok');
}

function doGet(e) {
  if (!e.parameter || e.parameter.key !== CLAVE) return ContentService.createTextOutput(JSON.stringify({ error: 'clave' })).setMimeType(ContentService.MimeType.JSON);
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  const rows = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, COLS.length).getValues() : [];
  const out = rows.map(r => Object.fromEntries(COLS.map((c, i) => [c, r[i] instanceof Date ? r[i].toISOString() : String(r[i])]))).reverse();
  return ContentService.createTextOutput(JSON.stringify({ rows: out })).setMimeType(ContentService.MimeType.JSON);
}
