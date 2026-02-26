#!/bin/sh
set -e

IMAGE=reactai-demo
CONTAINER=reactai-demo-test
PORT=8080

# Load .env
export $(grep -v '^#' .env | xargs)

echo "==> Building image..."
docker build -t $IMAGE .

echo ""
echo "==> Starting container..."
docker rm -f $CONTAINER 2>/dev/null || true
docker run -d --name $CONTAINER -p $PORT:$PORT -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" $IMAGE

echo ""
echo "==> Waiting for server to be ready..."
for i in $(seq 1 15); do
  if curl -sf http://localhost:$PORT/api/registry > /dev/null 2>&1; then
    break
  fi
  printf "  attempt $i/15...\n"
  sleep 1
done

echo ""
echo "==> [1/3] GET /  (webapp)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/)
echo "    HTTP $STATUS"
[ "$STATUS" = "200" ] && echo "    PASS" || echo "    FAIL"

echo ""
echo "==> [2/3] GET /api/registry  (JSON registry)"
BODY=$(curl -s http://localhost:$PORT/api/registry)
echo "    $(echo $BODY | head -c 120)..."
echo $BODY | grep -q '"key"' && echo "    PASS" || echo "    FAIL"

echo ""
echo "==> [3/3] POST /api/sessions  (creates session)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:$PORT/api/sessions)
echo "    HTTP $STATUS"
{ [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; } && echo "    PASS" || echo "    FAIL"

echo ""
echo "==> Container logs:"
docker logs $CONTAINER

echo ""
echo "==> Stopping container..."
docker rm -f $CONTAINER

echo ""
echo "Done. Open http://localhost:$PORT to test manually (re-run without cleanup to keep container up)."
