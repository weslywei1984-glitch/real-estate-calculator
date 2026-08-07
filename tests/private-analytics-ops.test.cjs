const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('event rate-limit zone is defined in the nginx http context', () => {
  const httpConfig = read('ops', 'nginx', 'calculator-analytics-http.conf');
  assert.match(
    httpConfig,
    /limit_req_zone\s+\$binary_remote_addr\s+zone=calculator_analytics_event:10m\s+rate=30r\/m;/s,
  );
});

test('analytics nginx locations expose only the protected PHP-FPM routes', () => {
  const locations = read('ops', 'nginx', 'calculator-analytics-locations.conf');

  assert.match(locations, /location = \/api\/analytics\/event\s*\{/);
  assert.match(locations, /if \(\$request_method != POST\) \{ return 405; \}/);
  assert.match(locations, /limit_req zone=calculator_analytics_event burst=10 nodelay;/);
  assert.match(locations, /client_max_body_size 2k;/);
  assert.match(locations, /access_log off;/);
  assert.match(locations, /fastcgi_param SCRIPT_FILENAME \$document_root\/analytics-api\/event\.php;/);

  assert.match(locations, /location = \/api\/analytics\/summary\s*\{/);
  assert.match(locations, /if \(\$request_method != GET\) \{ return 405; \}/);
  assert.match(locations, /fastcgi_param SCRIPT_FILENAME \$document_root\/analytics-api\/summary\.php;/);
  assert.equal((locations.match(/fastcgi_pass unix:\/run\/php\/php8\.3-fpm\.sock;/g) || []).length, 2);
  assert.doesNotMatch(locations, /proxy_pass|127\.0\.0\.1:8787|fastcgi_path_info|rewrite\s/i);
});

test('analytics dashboard and summary require basic auth and prevent indexing or storage', () => {
  const locations = read('ops', 'nginx', 'calculator-analytics-locations.conf');
  const authFile = /auth_basic_user_file \/etc\/nginx\/\.htpasswd-calculator-analytics;/g;

  assert.match(locations, /location = \/analytics\s*\{\s*return 301 \/analytics\/;\s*\}/s);
  assert.match(locations, /location \^~ \/analytics\/\s*\{[\s\S]*?auth_basic "Private calculator analytics";[\s\S]*?auth_basic_user_file \/etc\/nginx\/\.htpasswd-calculator-analytics;[\s\S]*?X-Robots-Tag "noindex, noarchive" always;[\s\S]*?Cache-Control "no-store" always;/);
  assert.match(locations, /location = \/api\/analytics\/summary\s*\{[\s\S]*?auth_basic "Private calculator analytics";[\s\S]*?auth_basic_user_file \/etc\/nginx\/\.htpasswd-calculator-analytics;[\s\S]*?Cache-Control "no-store" always;/);
  assert.equal((locations.match(authFile) || []).length, 2);
});

test('analytics source and unintended paths are denied', () => {
  const locations = read('ops', 'nginx', 'calculator-analytics-locations.conf');
  for (const route of [
    'location ^~ /analytics-api/ { return 404; }',
    'location ^~ /ops/ { return 404; }',
    'location ^~ /api/analytics/ { return 404; }',
    'location ~ \\.php(?:/|$) { return 404; }',
  ]) {
    assert.ok(locations.includes(route), `missing deny rule: ${route}`);
  }
});

test('backup uses sqlite online backup with restricted files and exact bounded retention', () => {
  const script = read('ops', 'analytics-backup.sh');
  assert.match(script, /^#!\/usr\/bin\/env bash/m);
  assert.match(script, /set -euo pipefail/);
  assert.match(script, /umask 077/);
  assert.match(script, /db=\/var\/lib\/real-estate-calculator\/analytics\.sqlite/);
  assert.match(script, /backup_dir=\/var\/backups\/real-estate-calculator\/analytics/);
  assert.match(script, /install -d -m 0700 "\$backup_dir"/);
  assert.match(script, /sqlite3 "\$db" "\.backup '\$backup_file'"/);
  assert.match(script, /-maxdepth 1 -type f -name 'analytics-\*\.sqlite'/);
  assert.match(script, /tail -z -n \+31/);
  assert.match(script, /"\$backup_dir"\/analytics-\*\.sqlite\) rm -- "\$old_backup"/);
  assert.doesNotMatch(script, /rm\s+-[A-Za-z]*r[A-Za-z]*\s|rm\s+-[A-Za-z]*f[A-Za-z]*r[A-Za-z]*\s|find .* -delete/);
});

test('backup cron runs once each day in Taiwan time', () => {
  const cron = read('ops', 'analytics-backup.cron');
  assert.match(cron, /^CRON_TZ=Asia\/Taipei$/m);
  assert.match(cron, /^17 3 \* \* \* root \/usr\/local\/sbin\/calc-analytics-backup$/m);
});

test('operations documentation preserves static public delivery and Node boundary', () => {
  const docs = ['DEPLOY.md', 'README.md', 'AGENTS.md'].map((file) => [file, read(file)]);
  for (const [file, document] of docs) {
    assert.match(document, /PHP-FPM|php8\.3-fpm\.sock/i, `${file} must describe PHP-FPM analytics`);
    assert.match(document, /static|靜態/i, `${file} must preserve static public calculators`);
    assert.match(document, /tainanwei\.service.*inactive|inactive.*tainanwei\.service/is, `${file} must preserve inactive Node service`);
    assert.match(document, /8787.*(?:未監聽|unlistened|not listening)|(?:未監聽|unlistened|not listening).*8787/is, `${file} must preserve closed Node port`);
    assert.doesNotMatch(document, /production[^\n]{0,80}npm start|npm start[^\n]{0,80}production/i, `${file} must not require npm start in production`);
    assert.doesNotMatch(document, /production[^\n]{0,80}(?:Node listener|Node 服務|Node server)|(?:Node listener|Node 服務|Node server)[^\n]{0,80}production/i, `${file} must not require a production Node listener`);
  }

  const deploy = read('DEPLOY.md');
  for (const value of [
    '/var/lib/real-estate-calculator/analytics.sqlite',
    '/etc/real-estate-calculator/analytics.env',
    '/etc/nginx/.htpasswd-calculator-analytics',
    '/var/backups/real-estate-calculator/analytics/',
    'database_path',
    'hmac_key',
    'allowed_origin',
    'xiaowei',
    'nginx -t',
  ]) {
    assert.ok(deploy.includes(value), `DEPLOY.md must document ${value}`);
  }
  assert.match(deploy, /rollback/i, 'DEPLOY.md must document rollback');
  assert.match(deploy, /一次|one-time|random/i, 'DEPLOY.md must require a one-time generated password');
  assert.doesNotMatch(deploy, /password\s*[:=]\s*[^\s`<]+/i, 'DEPLOY.md must not embed a Basic Auth password');
});
