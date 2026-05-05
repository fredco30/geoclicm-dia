#!/bin/bash
# ============================================================================
# setup-stripe-env.sh
# ----------------------------------------------------------------------------
# Configure les variables Stripe dans /var/www/geoclicmedia/back/.env
# en mode interactif (l'utilisateur tape les valeurs sensibles, le script
# ne les laisse pas dans l'historique bash).
#
# Usage :
#   bash deploy/setup-stripe-env.sh
#
# Idempotent : si une variable existe déjà, le script propose de la garder
# ou de la remplacer. Backup auto du .env avant modification.
# ============================================================================
set -euo pipefail

ENV_FILE="/var/www/geoclicmedia/back/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Fichier $ENV_FILE introuvable."
    exit 1
fi

# Backup
BACKUP_FILE="${ENV_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "✅ Backup créé : $BACKUP_FILE"
echo ""

# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

# upsert_var KEY VALUE : ajoute KEY=VALUE si pas présent, ou remplace l'existant.
upsert_var() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Remplace la ligne existante (utilise | comme séparateur sed pour éviter conflit avec / dans les URLs)
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        echo "  ↻ ${key} mis à jour"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
        echo "  + ${key} ajouté"
    fi
}

# ----------------------------------------------------------------------------
# Valeurs déjà connues (publiques, hardcodables)
# ----------------------------------------------------------------------------

PK_TEST="pk_test_51TThDHCGC4ASP2WYyITV4gcHayTLbIgSxbeiq7gtavMog5MpfrwMT8oiYBSTcB0ILRenordHXRvl8mjHLFisrX8F00zEtY2zBT"
PRICE_BASIC="price_1TThg2CIEzafBxmTJWErfLfd"
PRICE_PREMIUM="price_1TThqECIEzafBxmTP9Z3CZiM"
SITE_URL_VAL="https://media.geoclic.fr"

echo "📝 Configuration des variables non-sensibles..."
upsert_var "STRIPE_TEST_PUBLIC_KEY" "$PK_TEST"
upsert_var "STRIPE_LIVE_MODE" "False"
upsert_var "STRIPE_PRICE_BASIC" "$PRICE_BASIC"
upsert_var "STRIPE_PRICE_PREMIUM" "$PRICE_PREMIUM"
upsert_var "SITE_URL" "$SITE_URL_VAL"
echo ""

# ----------------------------------------------------------------------------
# Secret key (sensible) — saisie interactive masquée
# ----------------------------------------------------------------------------

echo "🔐 STRIPE_TEST_SECRET_KEY (sk_test_...)"
echo "   Récupère-la sur https://dashboard.stripe.com/test/apikeys"
echo "   (bouton 'Reveal test key' sur la ligne 'Secret key')"
echo ""

# Si déjà présente avec valeur réelle, on demande confirmation
if grep -q "^STRIPE_TEST_SECRET_KEY=sk_test_" "$ENV_FILE"; then
    if ! grep -q "^STRIPE_TEST_SECRET_KEY=sk_test_REMPLACE" "$ENV_FILE"; then
        read -p "   Une sk_test est déjà configurée. La remplacer ? (o/N) : " replace
        if [[ "$replace" != "o" && "$replace" != "O" ]]; then
            echo "  ✓ sk_test conservée."
            SK_SET=false
        else
            SK_SET=true
        fi
    else
        SK_SET=true
    fi
else
    SK_SET=true
fi

if [ "${SK_SET:-true}" = "true" ]; then
    read -s -p "   Colle ta sk_test ici (saisie masquée) puis Entrée : " SK_VALUE
    echo ""
    if [ -z "$SK_VALUE" ]; then
        echo "  ⚠️  Valeur vide, sk_test non modifiée."
    elif [[ "$SK_VALUE" != sk_test_* ]]; then
        echo "  ⚠️  La valeur ne commence pas par sk_test_, suspect. Annulation."
        exit 1
    else
        upsert_var "STRIPE_TEST_SECRET_KEY" "$SK_VALUE"
        unset SK_VALUE
    fi
fi
echo ""

# ----------------------------------------------------------------------------
# Webhook secret (sensible) — placeholder si pas encore configuré
# ----------------------------------------------------------------------------

echo "🔔 DJSTRIPE_WEBHOOK_SECRET (whsec_...)"
echo "   À configurer APRÈS création du webhook Stripe."
echo "   Pour l'instant, placeholder. Re-lance ce script quand tu auras le whsec_."
echo ""

if grep -q "^DJSTRIPE_WEBHOOK_SECRET=whsec_" "$ENV_FILE"; then
    if grep -q "^DJSTRIPE_WEBHOOK_SECRET=whsec_REMPLACE\|^DJSTRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER" "$ENV_FILE"; then
        WHSEC_SET=true
    else
        read -p "   Un whsec est déjà configuré. Le remplacer ? (o/N) : " replace_whsec
        if [[ "$replace_whsec" == "o" || "$replace_whsec" == "O" ]]; then
            WHSEC_SET=true
        else
            echo "  ✓ whsec conservé."
            WHSEC_SET=false
        fi
    fi
else
    WHSEC_SET=true
fi

if [ "${WHSEC_SET:-true}" = "true" ]; then
    read -s -p "   Colle ton whsec_ (vide = placeholder) puis Entrée : " WHSEC_VALUE
    echo ""
    if [ -z "$WHSEC_VALUE" ]; then
        upsert_var "DJSTRIPE_WEBHOOK_SECRET" "whsec_PLACEHOLDER_TO_SET_AFTER_WEBHOOK_CREATION"
        echo "  ✓ Placeholder posé. Re-lance ce script après avoir créé le webhook."
    elif [[ "$WHSEC_VALUE" != whsec_* ]]; then
        echo "  ⚠️  La valeur ne commence pas par whsec_, suspect. Placeholder posé."
        upsert_var "DJSTRIPE_WEBHOOK_SECRET" "whsec_PLACEHOLDER_TO_SET_AFTER_WEBHOOK_CREATION"
    else
        upsert_var "DJSTRIPE_WEBHOOK_SECRET" "$WHSEC_VALUE"
        unset WHSEC_VALUE
    fi
fi
echo ""

# ----------------------------------------------------------------------------
# Restart Django
# ----------------------------------------------------------------------------

echo "🔄 Redémarrage de Django..."
sudo systemctl restart geoclicmedia-django
sleep 1
if systemctl is-active --quiet geoclicmedia-django; then
    echo "✅ Django redémarré et actif."
else
    echo "❌ Django ne démarre pas. Logs :"
    sudo journalctl -u geoclicmedia-django -n 20 --no-pager
    exit 1
fi
echo ""
echo "🎉 Configuration Stripe OK. Variables présentes :"
grep -E "^(STRIPE|DJSTRIPE|SITE_URL)=" "$ENV_FILE" | cut -d= -f1
