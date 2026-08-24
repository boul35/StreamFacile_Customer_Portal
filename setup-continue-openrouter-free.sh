#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Continue.dev + OpenRouter Free Models Auto-Configurator
#
# Run from any project directory:
#   ./setup-continue-openrouter-free.sh
#
# What it does:
#   - Fetches CURRENT OpenRouter models
#   - Finds $0/free text models
#   - Prefers models with tool calling
#   - Ranks them using available OpenRouter metadata
#   - Creates ~/.continue/config.yaml
#   - Stores API key in ~/.continue/.env
#   - Backs up existing Continue config
#   - Adds openrouter/free as dynamic fallback
# ============================================================

CONTINUE_DIR="${HOME}/.continue"
CONFIG_FILE="${CONTINUE_DIR}/config.yaml"
ENV_FILE="${CONTINUE_DIR}/.env"
API_URL="https://openrouter.ai/api/v1/models"

# How many individual free models to add.
MAX_MODELS="${MAX_MODELS:-8}"

mkdir -p "$CONTINUE_DIR"

echo
echo "============================================================"
echo " Continue.dev + OpenRouter Free Model Setup"
echo "============================================================"
echo

# ------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------

for cmd in curl python3; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "ERROR: '$cmd' is required but not installed."
        exit 1
    fi
done

# jq is optional
HAS_JQ=0
if command -v jq >/dev/null 2>&1; then
    HAS_JQ=1
fi

# ------------------------------------------------------------
# API key
# ------------------------------------------------------------

if [[ -f "$ENV_FILE" ]]; then
    EXISTING_KEY="$(
        sed -n 's/^OPENROUTER_API_KEY=//p' "$ENV_FILE" \
        | head -n1 \
        | sed 's/^"//; s/"$//'
    )"
else
    EXISTING_KEY=""
fi

if [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
    API_KEY="$OPENROUTER_API_KEY"
elif [[ -n "$EXISTING_KEY" ]]; then
    API_KEY="$EXISTING_KEY"
else
    echo "Enter your NEW OpenRouter API key."
    echo "It will be stored in:"
    echo "  $ENV_FILE"
    echo
    read -rsp "OpenRouter API key: " API_KEY
    echo

    if [[ -z "$API_KEY" ]]; then
        echo "ERROR: No API key supplied."
        exit 1
    fi
fi

# ------------------------------------------------------------
# Test API key
# ------------------------------------------------------------

echo
echo "Testing OpenRouter API..."

HTTP_CODE="$(
    curl -sS \
        -o /tmp/openrouter-models.json \
        -w "%{http_code}" \
        -H "Authorization: Bearer ${API_KEY}" \
        "$API_URL"
)"

if [[ "$HTTP_CODE" != "200" ]]; then
    echo
    echo "ERROR: OpenRouter API returned HTTP $HTTP_CODE"
    echo
    cat /tmp/openrouter-models.json
    echo
    exit 1
fi

echo "OpenRouter API: OK"

# ------------------------------------------------------------
# Save API key securely
# ------------------------------------------------------------

cat > "$ENV_FILE" <<EOF
OPENROUTER_API_KEY=${API_KEY}
EOF

chmod 600 "$ENV_FILE"

echo "API key saved securely to:"
echo "  $ENV_FILE"

# ------------------------------------------------------------
# Backup existing config
# ------------------------------------------------------------

if [[ -f "$CONFIG_FILE" ]]; then
    BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
    cp "$CONFIG_FILE" "$BACKUP_FILE"

    echo
    echo "Existing Continue config backed up:"
    echo "  $BACKUP_FILE"
fi

# ------------------------------------------------------------
# Generate YAML using Python
# ------------------------------------------------------------

export CONTINUE_DIR
export CONFIG_FILE
export MAX_MODELS

python3 <<'PY'
import json
import os
import re
from pathlib import Path
from datetime import datetime

data_file = Path("/tmp/openrouter-models.json")
config_file = Path(os.environ["CONFIG_FILE"])
max_models = int(os.environ.get("MAX_MODELS", "8"))

data = json.loads(data_file.read_text())

models = data.get("data", [])

def price_is_free(model):
    pricing = model.get("pricing") or {}

    prompt = pricing.get("prompt", "1")
    completion = pricing.get("completion", "1")

    try:
        return float(prompt) == 0 and float(completion) == 0
    except Exception:
        return False


def is_text_model(model):
    arch = model.get("architecture") or {}

    inputs = arch.get("input_modalities") or []
    outputs = arch.get("output_modalities") or []

    return (
        "text" in inputs
        and "text" in outputs
    )


def supports_tools(model):
    params = model.get("supported_parameters") or []

    return (
        "tools" in params
        or "tool_choice" in params
    )


def is_deprecated(model):
    # OpenRouter sometimes exposes expiration dates.
    expiration = model.get("expiration_date")

    if not expiration:
        return False

    try:
        expiry = datetime.fromisoformat(
            expiration.replace("Z", "+00:00")
        )

        from datetime import timezone
        return expiry < datetime.now(timezone.utc)

    except Exception:
        return False


def intelligence_score(model):
    benchmarks = model.get("benchmarks") or {}

    possible = [
        "artificial_index",
        "intelligence_index",
        "intelligence",
    ]

    for key in possible:
        value = benchmarks.get(key)

        if isinstance(value, (int, float)):
            return float(value)

    return 0.0


def popularity(model):
    # OpenRouter doesn't guarantee one fixed popularity field
    # in every response, so handle several possibilities.
    for key in [
        "tokens_last_week",
        "usage",
        "popularity",
    ]:
        value = model.get(key)

        if isinstance(value, (int, float)):
            return float(value)

    return 0.0


def context_length(model):
    try:
        return int(model.get("context_length") or 0)
    except Exception:
        return 0


free_models = []

for model in models:

    if not price_is_free(model):
        continue

    if not is_text_model(model):
        continue

    if is_deprecated(model):
        continue

    model_id = model.get("id")

    if not model_id:
        continue

    free_models.append(model)


# ------------------------------------------------------------
# Rank models
#
# Priority:
#   1. Tool calling
#   2. Intelligence benchmark when available
#   3. Popularity
#   4. Context length
# ------------------------------------------------------------

free_models.sort(
    key=lambda m: (
        1 if supports_tools(m) else 0,
        intelligence_score(m),
        popularity(m),
        context_length(m),
    ),
    reverse=True,
)

# Prefer tool-capable models for coding agents.
tool_models = [
    m for m in free_models
    if supports_tools(m)
]

non_tool_models = [
    m for m in free_models
    if not supports_tools(m)
]

selected = []

# First select tool-capable models.
for model in tool_models:
    if len(selected) >= max_models:
        break

    selected.append(model)

# Fill remaining slots if necessary.
for model in non_tool_models:
    if len(selected) >= max_models:
        break

    if model not in selected:
        selected.append(model)


def yaml_string(value):
    value = str(value)
    value = value.replace("\\", "\\\\")
    value = value.replace('"', '\\"')
    return f'"{value}"'


lines = []

lines.append("name: OpenRouter Free Coding")
lines.append("version: 1.0.0")
lines.append("schema: v1")
lines.append("")
lines.append("#")
lines.append("# Automatically generated by setup-continue-openrouter-free.sh")
lines.append("#")
lines.append("# API key is stored in ~/.continue/.env")
lines.append("#")
lines.append("")

lines.append("models:")

# ------------------------------------------------------------
# Dynamic OpenRouter router
# ------------------------------------------------------------

lines.append("  - name: OpenRouter - Free Auto Router")
lines.append("    provider: openai")
lines.append("    model: openrouter/free")
lines.append("    apiBase: https://openrouter.ai/api/v1")
lines.append("    apiKey: ${{ secrets.OPENROUTER_API_KEY }}")
lines.append("    roles:")
lines.append("      - chat")
lines.append("      - edit")
lines.append("      - apply")
lines.append("")

# ------------------------------------------------------------
# Individual best free models
# ------------------------------------------------------------

for index, model in enumerate(selected, start=1):

    model_id = model["id"]
    display_name = model.get("name") or model_id

    tool_support = supports_tools(model)
    context = context_length(model)

    safe_name = re.sub(r"[^A-Za-z0-9._ -]+", "", display_name)
    safe_name = safe_name.strip()

    if not safe_name:
        safe_name = model_id

    lines.append(
        f"  - name: OpenRouter - Free #{index} - {safe_name}"
    )

    lines.append("    provider: openai")
    lines.append(f"    model: {yaml_string(model_id)}")
    lines.append("    apiBase: https://openrouter.ai/api/v1")
    lines.append("    apiKey: ${{ secrets.OPENROUTER_API_KEY }}")

    if tool_support:
        lines.append("    capabilities:")
        lines.append("      - tool_use")

    lines.append("    roles:")
    lines.append("      - chat")
    lines.append("      - edit")
    lines.append("      - apply")

    lines.append("")

config_file.write_text("\n".join(lines))

print()
print("============================================================")
print(" Selected free OpenRouter models")
print("============================================================")
print()

print("Dynamic fallback:")
print("  openrouter/free")
print()

for index, model in enumerate(selected, start=1):

    model_id = model.get("id")
    name = model.get("name", model_id)
    context = context_length(model)
    tools = "tools" if supports_tools(model) else "no-tools"

    print(
        f"{index:2}. {name}"
    )

    print(
        f"    ID: {model_id}"
    )

    print(
        f"    Context: {context:,} tokens"
    )

    print(
        f"    Agent: {tools}"
    )

    print()

print("Generated:")
print(f"  {config_file}")
print()
PY

# ------------------------------------------------------------
# Permissions
# ------------------------------------------------------------

chmod 600 "$CONFIG_FILE"

# ------------------------------------------------------------
# Show config
# ------------------------------------------------------------

echo "============================================================"
echo " Continue configuration complete"
echo "============================================================"
echo

echo "Config:"
echo "  $CONFIG_FILE"
echo

echo "Secrets:"
echo "  $ENV_FILE"
echo

echo "Models configured:"
grep -E '^  - name:' "$CONFIG_FILE" || true

echo
echo "============================================================"
echo " IMPORTANT"
echo "============================================================"
echo
echo "1. Open VS Code."
echo "2. Open Continue."
echo "3. Open the config selector."
echo "4. Select 'OpenRouter Free Coding'."
echo "5. Reload the Continue configuration if necessary."
echo
echo "Your API key is NOT stored in config.yaml."
echo
echo "To see the generated config:"
echo
echo "  cat ~/.continue/config.yaml"
echo
