# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repo (`demo_fer`) is a Bash simulator for **emotikiosk-sncf** (`../emotikiosk-sncf`): a .NET 10 Native AOT kiosk application for SNCF railway stations. The simulator replicates the initialization handshake that the real hardware drivers perform over MQTT, allowing the kiosk application to boot and reach working state without physical hardware.

## Running the script

```bash
./simulator.sh
```

Prerequisites:
- `mosquitto_sub` and `mosquitto_pub` must be installed (mosquitto-clients package)
- An MQTT broker running at `localhost:1883` (the kiosk app starts one internally via MQTTnet)
- Three config files in the same directory: `display.init.json`, `qr.init.json`, `cless.init.json`

## Architecture of this simulator

**`simulator.sh`** — the only source file. Flow:

1. Validates that all `<module>.init.json` files exist before starting.
2. Subscribes to `display/0/event/started`, `qr/0/event/started`, `cless/0/event/started` in a single `mosquitto_sub` call.
3. For each incoming message, reads the matching `.init.json` and publishes it to `<module>/0/command/setConfig`.
4. If the module is `display`, also publishes `{"data":{"layout":"MAIN"}}` to `display/0/command/show`.

**Configuration:** `BROKER` and `PORT` variables at the top of the script (defaults: `localhost`, `1883`).

## Target system: emotikiosk-sncf

### MQTT conventions

**Topic pattern:** `<driver>/<id>/<direction>/<type>` where direction is `event` (driver → app) or `command` (app → driver).

**Payload wrapper:** all MQTT messages are wrapped as:
```json
{ "timestamp": "2026-03-27T11:30:45Z", "data": { /* actual payload */ } }
```

The `.init.json` files must follow this format.

### Modules simulated here

| Module | `started` event topic | `setConfig` command topic |
|---|---|---|
| `display` | `display/0/event/started` | `display/0/command/setConfig` |
| `qr` | `qr/0/event/started` | `qr/0/command/setConfig` |
| `cless` | `cless/0/event/started` | `cless/0/command/setConfig` |

`cless` = contactless card reader (NFC/EMV terminal).

After `display/0/command/setConfig` the simulator also sends `display/0/command/show` to bring up the MAIN layout. In the real system this is done by `DisplayWrapper` in `TermDev`.

### Key commands the display module accepts

| Topic | Payload `data` |
|---|---|
| `display/0/command/setConfig` | Full layout config JSON (rendered from `displayConfig.0.vm` Scriban template) |
| `display/0/command/show` | `{"layout": "<name>", "bind": {...}, "keyboard": {...}}` |
| `display/0/command/update` | `{"bind": {...}, "keyboard": {...}}` |
| `display/0/command/setLocale` | `{"current": "fr\|en\|it", "default": "..."}` |

### Startup sequence in the real application

1. `Program.Main()` starts all supervisors synchronously.
2. Each hardware driver (display, box, qr, cless) publishes `<module>/0/event/started` when its process is ready.
3. `DisplayWrapper` in `TermDev` handles `display_started`: calls `SetConfig()` which renders `displayConfig.0.vm` and sends `display/0/command/setConfig`, then sends `display/0/command/show`.
4. This simulator replaces steps 2–3 for drivers that are not running.

### Other MQTT topics in the real system (not simulated here)

- `box/0/event/status`, `box/0/event/notify` — validation device events
- `system/0/event/*` — backlight, buttons, audio jack, NTP
- `led/0/command/*` — LED colors and blink patterns
- `audio/0/command/play`, `tts/0/command/say` — audio output
- `application/0/event/started` — periodic heartbeat from `ApplicationManager`

## Notes

- The script uses `set -euo pipefail` — any error exits immediately.
- Comments and error messages are in Italian.
- The `.init.json` files are not versioned here; they must be provided separately before running.
- The real application source is in `../emotikiosk-sncf`; its `CLAUDE.md` has the full architecture.

## Active Technologies
- HTML5 / CSS3 / JavaScript ES6 (vanilla) (001-validatrice-demo)
- N/A (nessuna persistenza dati) (001-validatrice-demo)

## Recent Changes
- 001-validatrice-demo: Added HTML5 / CSS3 / JavaScript ES6 (vanilla)
