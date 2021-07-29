#!/bin/bash
#This script is derived from the awesome Fly-Pie Project (https://github.com/Schneegans/Fly-Pie), originally licensed under the MIT license (https://github.com/Schneegans/Fly-Pie/blob/develop/LICENSE)
#Modifications were made in order to make the script work with this repository

# This script scans the source code for any translatable strings and updates the po/messages.pot file accordingly

#Exit on failure
set -e

if ! command -v xgettext &> /dev/null; then
  echo -e "\nERROR: Could not find xgettext"; exit 1
fi

#Change to repository root
cd "$( cd "$( dirname "$0" )" && pwd )/.." || \
  { echo -e "\nERROR: Could not find the repository root"; exit 1; }

#Update the template file with the strings from the source tree
echo "Generating 'messages.pot'..."
xgettext --from-code=UTF-8 \
         --add-comments=Translators \
         --copyright-holder="Stuart Hayhurst" \
         --package-name="alphabetical-grid-extension" \
         --output=po/messages.pot \
         -- *.js lib/*.js ui/*.ui

#Replace some lines of the header with our own.
sed -i '1s/.*/# <LANGUAGE> translation for the Alphabetical App Grid GNOME Shell Extension./' po/messages.pot
sed -i "2s/.*/# Copyright (C) $(date +%Y) Stuart Hayhurst/" po/messages.pot
sed -i '17s/CHARSET/UTF-8/' po/messages.pot

echo "'messages.pot' generated!"
