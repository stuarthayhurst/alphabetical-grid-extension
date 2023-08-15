#!/bin/bash
#This script scans the source code for any translatable strings and create the build/messages.pot

#Change to repository root and exit on failure
set -e
cd "$( cd "$( dirname "$0" )" && pwd )/.." || exit 1

#Set build directory if missing, and create it
if [[ "$BUILD_DIR" == "" ]]; then
  BUILD_DIR="build"
fi
mkdir -p "$BUILD_DIR"

#Update the template file with the strings from the source files
xgettext --from-code=UTF-8 \
         --add-comments=Translators \
         --copyright-holder="Stuart Hayhurst" \
         --package-name="alphabetical-grid-extension" \
         --output="$BUILD_DIR/messages.pot" \
         -- extension/*.js extension/ui/*/*.ui

#Replace some lines of the header with our own
sed -i '1s/.*/# <LANGUAGE> translation for the Alphabetical App Grid GNOME Shell Extension./' "$BUILD_DIR/messages.pot"
sed -i "2s/.*/# Copyright (C) $(date +%Y) Stuart Hayhurst/" "$BUILD_DIR/messages.pot"
sed -i '17s/CHARSET/UTF-8/' "$BUILD_DIR/messages.pot"

echo "Generated translation list"
