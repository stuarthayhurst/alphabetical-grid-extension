#!/bin/bash
#This script is derived from the awesome Fly-Pie Project (https://github.com/Schneegans/Fly-Pie), originally licensed under the MIT license (https://github.com/Schneegans/Fly-Pie/blob/develop/LICENSE)
#Modifications were made in order to make the script work with this repository
#This script creates a new release of the extension

#Exit on failure
set -e

#Change to repository root
cd "$( cd "$( dirname "$0" )" && pwd )/.." || \
  { echo -e "\nERROR: Could not find the repository root"; exit 1; }

scripts/compile-locales.sh

# Delete any old zip and pack everything together
if gnome-extensions pack --force --extra-source=LICENSE.txt; then
  echo -e "\nExtension packed successfully"
else
  echo -e "\nERROR: Could not pack the extension"
fi

if [[ "$1" == *"-i"* ]]; then
  #Install the extension, but only if this would not overwrite the git repository.
  if [[ "$(pwd)" != *".local/share/gnome-shell/extensions/AlphabeticalAppGrid@stuarthayhurst" ]]; then
    gnome-extensions install AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip --force || \
    { echo -e "\nERROR: Could not install the extension"; exit 1; }
  fi
  echo "Restart GNOME Shell to finish the update"
fi

#If the package is too big, print a warning.
if [[ "$(stat -c %s AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip)" -gt 4096000 ]]; then
  echo -e "\nWARNING! The extension is too big to be uploaded to the extensions website, keep it smaller than 4096 KB!"
fi
