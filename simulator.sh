#!/usr/bin/env bash
# sim-init.sh — Simula l'inizializzazione dei moduli display, qr e cless.
# Per ogni modulo, appena riceve <module>/0/event/started pubblica
# <module>/0/command/setConfig con il contenuto di <module>.init.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BROKER="localhost"
PORT="1883"

MODULES=(display qr cless)

# Verifica che i file di init esistano
for module in "${MODULES[@]}"; do
    file="$SCRIPT_DIR/${module}.init.json"
    if [[ ! -f "$file" ]]; then
        echo "ERRORE: file non trovato: $file" >&2
        exit 1
    fi
done

# Costruisce la lista di topic da sottoscrivere
TOPICS=()
for module in "${MODULES[@]}"; do
    TOPICS+=("-t" "${module}/0/event/started")
done

echo "Broker: $BROKER:$PORT"
echo "In ascolto su: ${MODULES[*]/#/} (event/started)"
echo "---"

# mosquitto_sub -v stampa "<topic> <payload>" per ogni messaggio
mosquitto_sub -h "$BROKER" -p "$PORT" -v "${TOPICS[@]}" | \
while IFS= read -r line; do
    topic="${line%% *}"   # tutto prima del primo spazio
    module="${topic%%/*}" # primo segmento del topic (display / qr / cless)

    config_file="$SCRIPT_DIR/${module}.init.json"
    pub_topic="${module}/0/command/setConfig"
    payload="$(cat "$config_file")"

    echo "[$(date '+%H:%M:%S')] $topic → pubblica su $pub_topic"
    mosquitto_pub -h "$BROKER" -p "$PORT" -t "$pub_topic" -m "$payload"

    # Per il display, dopo setConfig mostra la schermata MAIN
    if [[ "$module" == "display" ]]; then
        show_topic="display/0/command/show"
        show_payload='{"data":{"layout":"MAIN"}}'
        echo "[$(date '+%H:%M:%S')] display → pubblica su $show_topic"
        mosquitto_pub -h "$BROKER" -p "$PORT" -t "$show_topic" -m "$show_payload"
    fi
done
