set -eu
set -o pipefail

echo '--- BEFORE PM2 ---'
pm2 list || true

echo '--- BEFORE PROCESS ---'
ps -eo pid,args | grep -E 'next-server|server\.js' | grep -v grep || true

echo '--- BEFORE PORT ---'
ss -ltnp | grep ':8081 ' || true

cd /root/apps/blogs-next

echo '--- CLEANUP PM2 RECORDS ---'
pm2 delete blogs-next >/dev/null 2>&1 || true

echo '--- CLEANUP PROCESS ---'
pkill -f 'next-server' || true
pkill -f '.next/standalone/server.js' || true
sleep 3

echo '--- START PM2 ---'
PORT=8081 HOSTNAME=0.0.0.0 NODE_ENV=production \
  pm2 start ./.next/standalone/server.js \
  --name blogs-next \
  --cwd /root/apps/blogs-next \
  --update-env

sleep 6

echo '--- AFTER PM2 ---'
pm2 list

echo '--- AFTER PROCESS ---'
ps -eo pid,args | grep -E 'next-server|server\.js' | grep -v grep || true

echo '--- AFTER PORT ---'
ss -ltnp | grep ':8081 ' || true

echo '--- CURL ---'
curl -I -fsS http://127.0.0.1:8081/

echo '--- SAVE ---'
pm2 save

echo '--- PM2 ROOT ---'
systemctl enable --now pm2-root >/dev/null 2>&1 || true
systemctl status pm2-root --no-pager -n 20 || true