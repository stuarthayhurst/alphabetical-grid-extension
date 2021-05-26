#!/bin/bash
#This script is derived from the awesome Fly-Pie Project (https://github.com/Schneegans/Fly-Pie), originally licensed under the MIT license (https://github.com/Schneegans/Fly-Pie/blob/develop/LICENSE)
#Modifications were made in order to make the script work with this repository
#This script creates a compiled *.mo translation file for each *.po file in the 'po' directory

#Exit on failure
set -e

if ! command -v msgfmt &> /dev/null; then
  echo -e "\nERROR: Could not find msgfmt"; exit 1
fi

#Change to repository root
cd "$( cd "$( dirname "$0" )" && pwd )/.." || \
  { echo -e "\nERROR: Could not find the repository root"; exit 1; }

echo "Compiling locales:"
for FILE in po/*.po; do
  #Handle the case of no .po files, see SC2045
  [[ -e "$FILE" ]] || { echo -e "\nERROR: No .po files found, exiting"; exit 1; }
  #Extract the language code from the filename.
  LANGUAGE="${FILE##*/}"
  LANGUAGE="${LANGUAGE%.*}"

  #Compile the corresponding *.mo file.
  echo -n "  Creating localization for '$LANGUAGE'..."
  mkdir -p "locale/$LANGUAGE/LC_MESSAGES"
  msgfmt --check "$FILE" -o "locale/$LANGUAGE/LC_MESSAGES/messages.mo"
  echo " done"
done

echo "All locales compiled"
