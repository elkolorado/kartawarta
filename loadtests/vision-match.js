import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    vision_match: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 1 },
        { duration: '1m', target: 3 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<10000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8081';
const TCG_NAME = __ENV.TCG_NAME || 'Riftbound';
const IMAGE_PATH = __ENV.IMAGE_PATH || '/loadtests/imgs/sample.jpg';
const image = open(IMAGE_PATH, 'b');

export default function () {
  const data = {
    file: http.file(image, IMAGE_PATH.split('/').pop() || 'sample.jpg'),
  };

  const response = http.post(
    `${BASE_URL}/api/vision/matchCard?tcg_name=${encodeURIComponent(TCG_NAME)}`,
    data
  );

  check(response, {
    'matchCard returns non-5xx': (r) => r.status < 500,
    'matchCard returns 200 or expected 400': (r) => r.status === 200 || r.status === 400,
  });

  sleep(1);
}
