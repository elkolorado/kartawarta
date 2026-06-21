import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8081';
const TCG_NAME = __ENV.TCG_NAME || 'Riftbound';

export default function () {
  const tcgs = http.get(`${BASE_URL}/api/backend/tcgs`);
  check(tcgs, {
    'tcgs status is 200': (r) => r.status === 200,
  });

  const expansions = http.get(`${BASE_URL}/api/backend/expansions/?tcg_name=${encodeURIComponent(TCG_NAME)}`);
  check(expansions, {
    'expansions status is 200': (r) => r.status === 200,
  });

  const cards = http.get(`${BASE_URL}/api/backend/cards-with-prices/?tcg_name=${encodeURIComponent(TCG_NAME)}`);
  check(cards, {
    'cards-with-prices status is 200': (r) => r.status === 200,
  });

  const visionHealth = http.get(`${BASE_URL}/api/vision/`);
  check(visionHealth, {
    'vision status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
