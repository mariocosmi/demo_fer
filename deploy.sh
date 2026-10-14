#!/usr/bin/env bash
# deploy.sh — Pacchetto della demo FER e installazione sul validatore.
#
# Uso: ./deploy.sh [VALIDATORE] [--install]
#   senza argomenti   crea solo deploy/demo-fer.zip
#   VALIDATORE        copia lo zip in /tmp del validatore con fdg (es. 23)
#   --install         installa anche la demo in /solari/emotikiosk/static/fer,
#                     copia i suoni da /solari/emotikiosk/sounds e riavvia cog
#
# cog mostra la demo solo se /solari/etc/cog-monit.cfg contiene
# COGMONIT_URL=http://127.0.0.1:8088/static/fer/index.html (impostazione una tantum).

set -euo pipefail

TARGET=""
INSTALL=0
for arg in "$@"; do
    case "$arg" in
        --install) INSTALL=1 ;;
        -*) echo "Opzione sconosciuta: $arg" >&2; exit 2 ;;
        *) TARGET="$arg" ;;
    esac
done
if [[ $INSTALL -eq 1 && -z "$TARGET" ]]; then
    echo "--install richiede il validatore (es. ./deploy.sh 23 --install)" >&2
    exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

FILES=(index.html config.js logoFER.svg css js)
DEPLOY_DIR="deploy"
ZIP_NAME="demo-fer.zip"
ZIP="$DEPLOY_DIR/$ZIP_NAME"

STATIC_DIR="/solari/emotikiosk/static"
DEST="$STATIC_DIR/fer"
SOUNDS_SRC="/solari/emotikiosk/sounds"
SOUNDS_DEST="$STATIC_DIR/display/sounds"

for f in "${FILES[@]}"; do
    [[ -e "$f" ]] || { echo "File mancante: $f" >&2; exit 1; }
done
for cmd in zip ${TARGET:+fdg}; do
    command -v "$cmd" >/dev/null || { echo "Comando mancante: $cmd" >&2; exit 1; }
done

# Fase 1: pacchetto (la demo è statica, nessuna build)
mkdir -p "$DEPLOY_DIR"
rm -f "$ZIP"
zip -qr "$ZIP" "${FILES[@]}"
echo ">> Pacchetto: $ZIP"

[[ -n "$TARGET" ]] || exit 0

# Fase 2: copia in /tmp del validatore
fdg rsync "$ZIP" "$TARGET:/tmp/$ZIP_NAME" </dev/null
echo ">> Copiato su $TARGET:/tmp/$ZIP_NAME"

[[ $INSTALL -eq 1 ]] || exit 0

# Fase 3: installazione, suoni e riavvio di cog
fdg sudo "$TARGET" "rm -rf $DEST && mkdir -p $DEST $SOUNDS_DEST \
    && unzip -oq /tmp/$ZIP_NAME -d $DEST && rm -f /tmp/$ZIP_NAME \
    && cp $SOUNDS_SRC/sound_ok.wav $SOUNDS_SRC/sound_ko.wav $SOUNDS_DEST/ \
    && chmod -R a+rX $DEST $SOUNDS_DEST \
    && systemctl restart solari-cog.service" </dev/null
echo ">> Installato su $TARGET:$DEST, cog riavviato"
