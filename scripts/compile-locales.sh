#!/bin/bash

# This script is derived from the awesome Fly-Pie Project (https://github.com/Schneegans/Fly-Pie),
# originally licensed under the MIT license (https://github.com/Schneegans/Fly-Pie/blob/develop/LICENSE).
# Modifications were made in order to make the script work with this repository.

# This script creates a compiled *.mo translation file for each *.po file in the 'po'
# directory. This script doesn't need to be executed manually, it gets called by create-release.sh.

# Exit the script when one command fails.
set -e

# Check if all necessary commands are available.
if ! command -v msgfmt &> /dev/null
then
  echo "ERROR: Could not find msgfmt. On Ubuntu based systems, check if the gettext package is installed!"
  exit 1
fi

# Go to the repo root.
cd "$( cd "$( dirname "$0" )" && pwd )/.." || \
  { echo "ERROR: Could not find the repo root."; exit 1; }

for FILE in po/*.po
do
  # Handle the case of no .po files, see SC2045
  [[ -e "$FILE" ]] || { echo "ERROR: No .po files found, exiting."; exit 1; }
  # Extract the language code from the filename.
  LANGUAGE="${FILE##*/}"
  LANGUAGE="${LANGUAGE%.*}"

  # Compile the corresponding *.mo file.
  echo "Creating localization for '$LANGUAGE'..."
  mkdir -p locale/"$LANGUAGE"/LC_MESSAGES
  msgfmt --check --verbose "$FILE" -o locale/"$LANGUAGE"/LC_MESSAGES/messages.mo
done

echo "All locales compiled!"
