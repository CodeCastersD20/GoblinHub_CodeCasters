// Receptor HTTP para simular el webhook de Alertmanager.
//
// Se levanta con `docker compose --profile evidencia up -d mock-webhook` y
// recibe los JSON que envía Alertmanager cuando una alerta coincide con el
// receptor `evidencia-prueba`. El JSON recibido se guarda en
// `MOCK_WEBHOOK_LOG` (por defecto `/tmp/alerta-recibida.json`).
//
// No persiste nada en el repositorio: el fichero es un artefacto de la
// ejecución para adjuntarlo como evidencia de la #214 (T043/T044).

import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';

const puerto = Number(process.env.MOCK_WEBHOOK_PORT || 9095);
const rutaLog = process.env.MOCK_WEBHOOK_LOG || '/tmp/alerta-recibida.json';

const servidor = createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end();
    return;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const cuerpo = Buffer.concat(chunks).toString('utf8');

  try {
    const json = JSON.parse(cuerpo);
    writeFileSync(rutaLog, JSON.stringify(json, null, 2));
    console.log(`[mock-webhook] alerta recibida → ${rutaLog}`);
  } catch (error) {
    console.error('[mock-webhook] no se pudo parsear el JSON:', error);
    writeFileSync(rutaLog, cuerpo);
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

servidor.listen(puerto, () => {
  console.log(`[mock-webhook] escuchando en http://0.0.0.0:${puerto}`);
});
