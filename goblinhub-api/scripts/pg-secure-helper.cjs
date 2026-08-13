#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [action, firstPath, secondPath] = process.argv.slice(2);

function digest(filepath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filepath)).digest('hex');
}

if (action === 'prepare') {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => {
    const url = new URL(input);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.pathname === '/') {
      throw new Error('La URL de PostgreSQL es inválida');
    }
    const escape = (value) => value.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
    const password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.slice(1));
    url.password = '';
    fs.writeFileSync(firstPath, url.toString(), { mode: 0o600, flag: 'wx' });
    fs.writeFileSync(secondPath, [url.hostname, url.port || '5432', database, decodeURIComponent(url.username), password].map(escape).join(':') + '\n', { mode: 0o600, flag: 'wx' });
  });
} else if (action === 'create-manifest') {
  const manifest = { version: 1, schema: 'public', filename: path.basename(firstPath), sha256: digest(firstPath), createdAt: new Date().toISOString() };
  fs.writeFileSync(secondPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
} else if (action === 'validate-manifest') {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(secondPath, 'utf8')); } catch { throw new Error('Manifest ausente o inválido'); }
  if (manifest.version !== 1 || manifest.schema !== 'public' || manifest.filename !== path.basename(firstPath) || manifest.sha256 !== digest(firstPath)) {
    throw new Error('Backup histórico, incompatible o alterado');
  }
} else {
  throw new Error('Acción inválida');
}
