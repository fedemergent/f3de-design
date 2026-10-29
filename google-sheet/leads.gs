// Guarda cada registro de la web en una hoja de Google Sheets.
const SHEET_NAME = 'Leads';

function doPost(e) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(['Fecha', 'Correo', 'Tipo', 'Intereses', 'Versión', 'Origen']);
  const p = e.parameter;
  sh.appendRow([new Date(), p.email || '', p.tipo || '', p.intereses || '', p.version || '', p.origen || '']);
  return ContentService.createTextOutput('ok');
}
