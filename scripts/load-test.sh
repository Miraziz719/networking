#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# Load Test Script — Auto-Scaling Simulation
# BTEC Unit 6: Networking in the Cloud
#
# Simulates high traffic to demonstrate:
#   - Load distribution across services
#   - Round-robin behaviour under load
#   - How horizontal scaling handles increased requests
#
# Usage:
#   chmod +x scripts/load-test.sh
#   ./scripts/load-test.sh [--requests 200] [--concurrency 20] [--url http://localhost]
# ══════════════════════════════════════════════════════════════════════════════

set -e

# ── Defaults ─────────────────────────────────────────────────────────────────
REQUESTS=100
CONCURRENCY=10
BASE_URL="http://localhost"
ENDPOINT="/api/"

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --requests)    REQUESTS="$2";    shift ;;
    --concurrency) CONCURRENCY="$2"; shift ;;
    --url)         BASE_URL="$2";    shift ;;
    *) echo "Unknown param: $1"; exit 1 ;;
  esac
  shift
done

TARGET="${BASE_URL}${ENDPOINT}"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   BTEC Unit 6 — Load Test / Auto-Scaling Simulation     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Target URL    : ${YELLOW}${TARGET}${NC}"
echo -e "  Total requests: ${YELLOW}${REQUESTS}${NC}"
echo -e "  Concurrency   : ${YELLOW}${CONCURRENCY}${NC}"
echo ""

# ── Check dependencies ────────────────────────────────────────────────────────
if ! command -v curl &>/dev/null; then
  echo -e "${RED}Error: curl is required${NC}"
  exit 1
fi

# ── Counters ──────────────────────────────────────────────────────────────────
ERP_COUNT=0
CRM_COUNT=0
SUCCESS=0
FAILURE=0
TOTAL_TIME=0

declare -A HOSTNAMES

# ── Run requests ──────────────────────────────────────────────────────────────
echo -e "${BLUE}▶ Starting load test...${NC}"
echo ""

START_TIME=$(date +%s%N)

for i in $(seq 1 $REQUESTS); do
  # Fire up to $CONCURRENCY requests in background
  (
    RESP=$(curl -s -w "\n%{http_code}\n%{time_total}" "${TARGET}" 2>/dev/null)
    HTTP_CODE=$(echo "$RESP" | tail -2 | head -1)
    TIME=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | head -1)

    SERVICE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('service','unknown'))" 2>/dev/null || echo "unknown")
    echo "${HTTP_CODE}|${TIME}|${SERVICE}"
  ) &

  # Throttle concurrency
  if (( i % CONCURRENCY == 0 )); then
    wait
    echo -ne "  Progress: ${i}/${REQUESTS} requests sent...\r"
  fi
done
wait

END_TIME=$(date +%s%N)
ELAPSED=$(( (END_TIME - START_TIME) / 1000000 ))

echo ""
echo ""

# ── Re-run sequentially to count results ─────────────────────────────────────
echo -e "${BLUE}▶ Running analysis pass (${REQUESTS} sequential requests)...${NC}"
echo ""

for i in $(seq 1 $REQUESTS); do
  RESP=$(curl -s -w "|%{http_code}|%{time_total}" "${TARGET}" 2>/dev/null)
  HTTP_CODE=$(echo "$RESP" | awk -F'|' '{print $(NF-1)}')
  TIME_S=$(echo "$RESP" | awk -F'|' '{print $NF}')
  BODY=$(echo "$RESP" | awk -F'|' 'NF>2{print $1}')

  TIME_MS=$(echo "$TIME_S * 1000" | bc 2>/dev/null || echo "0")
  TOTAL_TIME=$(echo "$TOTAL_TIME + $TIME_MS" | bc 2>/dev/null || echo "$TOTAL_TIME")

  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS=$((SUCCESS + 1))

    SERVICE_TYPE=$(echo "$BODY" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read().split('|')[0] if '|' in sys.stdin.read() else sys.stdin.read())
    print(d.get('serviceType', 'unknown'))
except:
    print('unknown')
" 2>/dev/null || echo "unknown")

    HOSTNAME=$(echo "$BODY" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('hostname', 'unknown'))
except:
    print('unknown')
" 2>/dev/null || echo "unknown")

    if echo "$SERVICE_TYPE" | grep -qi "ERP"; then
      ERP_COUNT=$((ERP_COUNT + 1))
    else
      CRM_COUNT=$((CRM_COUNT + 1))
    fi

    HOSTNAMES[$HOSTNAME]=$(( ${HOSTNAMES[$HOSTNAME]:-0} + 1 ))
  else
    FAILURE=$((FAILURE + 1))
  fi

  # Progress indicator
  if (( i % 10 == 0 )); then
    echo -ne "  Analysing: ${i}/${REQUESTS}\r"
  fi
done

echo ""

# ── Calculate stats ───────────────────────────────────────────────────────────
TOTAL=$((ERP_COUNT + CRM_COUNT))
if [ $TOTAL -gt 0 ]; then
  ERP_PCT=$(echo "scale=1; $ERP_COUNT * 100 / $TOTAL" | bc)
  CRM_PCT=$(echo "scale=1; $CRM_COUNT * 100 / $TOTAL" | bc)
  DIFF=$(echo "scale=1; $ERP_PCT - $CRM_PCT" | bc | tr -d -)
  if [ $TOTAL -gt 0 ]; then
    AVG_TIME=$(echo "scale=0; $TOTAL_TIME / $TOTAL" | bc 2>/dev/null || echo "N/A")
  fi
fi

# ── Print results ─────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    LOAD TEST RESULTS                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}✅ Successful${NC} : ${SUCCESS}"
echo -e "  ${RED}❌ Failed${NC}     : ${FAILURE}"
echo -e "  📊 Total       : ${REQUESTS}"
echo ""
echo -e "  ${BLUE}📦 ERP Service 1${NC}    : ${ERP_COUNT} requests  (${ERP_PCT:-0}%)"
echo -e "  ${GREEN}🏪 CRM/WMS Service 2${NC}: ${CRM_COUNT} requests  (${CRM_PCT:-0}%)"
echo ""
echo -e "  ⏱️  Avg latency  : ${AVG_TIME:-N/A}ms"
echo ""

if [ ${#HOSTNAMES[@]} -gt 0 ]; then
  echo -e "  ${YELLOW}Container distribution (scaling demo):${NC}"
  for host in "${!HOSTNAMES[@]}"; do
    echo -e "    🐳 ${host}: ${HOSTNAMES[$host]} requests"
  done
  echo ""
fi

# Balance quality
if [ -n "$DIFF" ] && command -v bc &>/dev/null; then
  if (( $(echo "$DIFF <= 5" | bc -l) )); then
    echo -e "  ⭐ Load balance quality: ${GREEN}EXCELLENT${NC} (${DIFF}% deviation)"
  elif (( $(echo "$DIFF <= 15" | bc -l) )); then
    echo -e "  👍 Load balance quality: ${YELLOW}GOOD${NC} (${DIFF}% deviation)"
  else
    echo -e "  ⚠️  Load balance quality: ${RED}SKEWED${NC} (${DIFF}% deviation)"
  fi
fi

echo ""
echo -e "${CYAN}  BTEC Note: With round-robin load balancing, each service${NC}"
echo -e "${CYAN}  should receive ~50% of requests. Add replicas with:${NC}"
echo -e "${YELLOW}  docker compose up --scale service-1=3 --scale service-2=3${NC}"
echo ""
