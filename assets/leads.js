/* Registro de correos (descarga de TATU y newsletter). Devuelve true si el servicio confirmó el envío. */
window.sendLead = async function (data) {
  const C = window.F3DE_CONFIG || {};
  const payload = Object.assign({ origen: location.href.split('?')[0], fecha: new Date().toISOString() }, data);
  try {
    if (!C.LEADS_URL) { localStorage.setItem('f3de-lead-' + Date.now(), JSON.stringify(payload)); return false; }
    if (C.LEADS_KIND === 'apps-script') {                       // Google Sheets vía Apps Script (no devuelve respuesta legible)
      const fd = new FormData(); Object.keys(payload).forEach(k => fd.append(k, payload[k]));
      await fetch(C.LEADS_URL, { method: 'POST', body: fd, mode: 'no-cors' });
      return true;
    }
    const r = await fetch(C.LEADS_URL, {                        // FormSubmit (AJAX)
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(Object.assign({ _subject: 'F3DE · ' + (data.tipo || 'registro'), _template: 'table', _captcha: 'false' }, payload))
    });
    const j = await r.json().catch(() => ({}));
    return r.ok && String(j.success) !== 'false';
  } catch (e) { return false; }
};
