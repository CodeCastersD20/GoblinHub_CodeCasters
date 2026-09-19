import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    email: 'carga.prueba@example.com',
    password: 'ContrasenaIncorrecta1',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'POST /auth/signin (bad path)' },
  };

  const response = http.post(`${BASE_URL}/auth/signin`, payload, params);

  check(response, {
    '[AS] POST /auth/signin bad path responde 400': (r) => r.status === 400,
  });

  sleep(1);
}