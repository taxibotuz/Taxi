#!/bin/sh
set -e

if [ -n "$PORT" ]; then
  sed -i "s/listen 80;/listen ${PORT};/g" /etc/nginx/conf.d/default.conf
fi

exec "$@"
