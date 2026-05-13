set -eu
set -o pipefail

cd /root/apps/blogs-next

if [ ! -f .next/standalone/server.js ]; then
  echo "STANDALONE_MISSING"
  exit 1
fi

pm2 delete blogs-next >/dev/null 2>&1 || true
pm2 delete blogs-next-canary >/dev/null 2>&1 || true
pm2 delete blogs-next-standalone-canary >/dev/null 2>&1 || true

oldpid=$(ps -eo pid,args | awk '/next-server/ && !/awk/ { print $1; exit }')
echo "OLDPID=${oldpid:-none}"
if [ -n "${oldpid:-}" ]; then
  kill "$oldpid" || true
  sleep 2
fi

PORT=8081 HOSTNAME=0.0.0.0 NODE_ENV=production \
  pm2 start ./.next/standalone/server.js \
  --name blogs-next \
  --cwd /root/apps/blogs-next \
  --update-env

sleep 8

echo '--- PM2 ---'
pm2 list

echo '--- PORT ---'
ss -ltnp | grep ':8081 ' || true

echo '--- PROD CURL ---'
curl -I -fsS http://127.0.0.1:8081/

echo '--- LOGS ---'
pm2 logs blogs-next --lines 60 --nostream || true

echo '--- SAVE ---'
pm2 save
systemctl status pm2-root --no-pager -n 20 || true