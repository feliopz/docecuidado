#!/bin/bash
# Gera PNGs do app a partir de doce-cuidado/assets/ (originais do GPT)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/assets"
DST="$ROOT/src/assets"
mkdir -p "$DST/marketing"

convert "$SRC/icone.png" -filter Lanczos -resize 1024x1024^ -gravity center -extent 1024x1024 "$DST/icon.png"
convert "$SRC/splash-fundo-transparnete.png" -filter Lanczos -resize 380x380 -background none -gravity center -extent 400x400 "$DST/splash-icon.png"
convert "$SRC/splash-fundo-transparnete.png" -filter Lanczos -resize 660x660 -background none -gravity center -extent 1024x1024 "$DST/android-icon-foreground.png"
convert "$SRC/fundo-abstrato.png" -filter Lanczos -resize 1024x1024^ -gravity center -extent 1024x1024 "$DST/android-icon-background.png"
convert "$SRC/icone-monocromatico-removebg-preview.png" -filter Lanczos -resize 660x660 -background none -gravity center -extent 1024x1024 "$DST/android-icon-monochrome.png"
convert "$SRC/icone-notificacao-branco-sem-fundo.png" -filter Lanczos -resize 96x96 -background none "$DST/notification-icon.png"
convert "$SRC/icone.png" -filter Lanczos -resize 48x48 "$DST/favicon.png"
convert "$SRC/loading-gotinha-com-fundo.png" -filter Lanczos -resize 320x320 "$DST/loading.png"
convert "$SRC/gotinha-chef-empty-recipe.png" -filter Lanczos -resize 240x240 -background none "$DST/empty-recipes.png"
convert "$SRC/banner-playstore-gotinha.png" -filter Lanczos -resize 1024x500^ -gravity center -extent 1024x500 "$DST/marketing/feature-graphic.png"
convert "$SRC/gota-com-fundo-branco-removebg-preview.png" -filter Lanczos -resize 512x512 -background none "$DST/gotinha-mascot.png"

echo "OK — assets em $DST"
