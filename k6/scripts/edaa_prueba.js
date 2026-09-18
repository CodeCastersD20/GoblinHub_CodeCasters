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
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';

export default function () {
  const response = http.get(`${BASE_URL}/productos`, {
    tags: { name: 'GET /productos' },
  });

  check(response, {
    '[EDAA] GET /productos responde 200': (r) => r.status === 200,
  });

  sleep(1);
}