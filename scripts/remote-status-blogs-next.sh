set -eu
set -o pipefail

echo '--- PM2 LIST ---'
pm2 list || true

echo '--- PM2 ROOT ---'
systemctl enable --now pm2-root || true
systemctl status pm2-root --no-pager -n 20 || true

echo '--- PORT 8081 ---'
ss -ltnp | grep ':8081 ' || true

echo '--- CURL ---'
curl -I -fsS http://127.0.0.1:8081/

echo '--- PROCESS ---'
ps -eo pid,args | grep -E 'next-server|server.js' | grep -v grep || true