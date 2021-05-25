#!/bin/bash

# This script is derived from the awesome Fly-Pie Project (https://github.com/Schneegans/Fly-Pie),
# originally licensed under the MIT license (https://github.com/Schneegans/Fly-Pie/blob/develop/LICENSE).
# Modifications were made in order to make the script work with this repository.

# This script takes 'po/messages.pot' and compiles the latest '.po' file(s) from it.
# Usage: update-po.sh -l <LANG-CODE>, where <LANG-CODE> is the language code of the file
# you want to update. Pass '-a' to update all '.po' files.

# Print usage info
usage() {
  echo "Use '-l <LANG-CODE>' to update a specific '.po' file."
  echo "Use '-a' to update all '.po' files."
}

# Create a new translation from 'messages.pot'. Do not update the template because
# of potential merge conflicts. This is done in a seperate step.
promptNewTranslation() {
  echo -n "The translation for '$1' does not exist. Do you want to create it? [Y/n] "
  read -r reply

  # Default to 'Yes' when no answer given
  if [ -z "$reply" ] || [ "$reply" = "Y" ] ||  [ "$reply" = "y" ]; then
    msginit --input=po/messages.pot --locale="$1" --output-file="po/$1.po"
    # Add Copyright info
    sed -i "2s/.*/# Copyright (C) $(date +%Y) Stuart Hayhurst/" po/"$1".po
  fi
}


if ! command -v msgmerge &> /dev/null
then
  echo "ERROR: Could not find msgmerge. On Ubuntu based systems, check if the gettext package is installed!"
  exit 1
fi

# Go to the repo root.
cd "$( cd "$( dirname "$0" )" && pwd )/.." || \
  { echo "ERROR: Could not find the repo root."; exit 1; }

while getopts l:a FLAG; do
  case $FLAG in

    l)  # Update/Create one specific '.po' file.
        # Check if a valid language code was passed.
        if test -f po/"$OPTARG".po; then
          echo -n "Updating '$OPTARG.po' "
          msgmerge --previous -U po/"$OPTARG".po po/messages.pot

          # Check the state of the translation progress.
          # We don't want to actually create a .mo file, so we direct it to /dev/null.
          msgfmt --check --verbose --output-file=/dev/null po/"$OPTARG".po
          exit
        else
          promptNewTranslation "$OPTARG"
          exit
        fi;;

    a)  # Update all '.po' files.
        for FILE in po/*.po; do
          # handle the case of no .po files, see SC2045
          [[ -e "$FILE" ]] || { echo "ERROR: No .po files found, exiting."; exit 1; }
          echo -n "Updating '$FILE' "
          msgmerge --previous -U "$FILE" po/messages.pot

          # Check the state of the translation progress.
          msgfmt --check --verbose "$FILE"
        done
        exit;;

    *)  # Handle invalid flags.
        echo "ERROR: Invalid flag!"
        usage
        exit 1;;
  esac
done

# In case no flag was specified
echo "ERROR: You need to specify a flag!"
usage
exit 1
