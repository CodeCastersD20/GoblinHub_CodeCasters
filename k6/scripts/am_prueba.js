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
  const response = http.get(`${BASE_URL}/`, {
    redirects: 0,
    tags: { name: 'GET / inicio' },
  });

  check(response, {
    '[AM] GET / responde 302 (redirect a frontend)': (r) => r.status === 302,
  });

  sleep(1);
}