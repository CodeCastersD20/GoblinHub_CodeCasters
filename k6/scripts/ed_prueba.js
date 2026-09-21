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
  // AQUÍ ESTÁ EL CAMBIO: pegarle a /events en lugar de /eventos
  const response = http.get(`${BASE_URL}/events`, {
    tags: { name: 'GET /eventos' },
  });

  check(response, {
    '[ED] GET /eventos responde 200 (OK)': (r) => r.status === 200,
  });

  sleep(1);
}