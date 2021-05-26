#!/bin/bash
#This script is derived from the awesome Fly-Pie Project (https://github.com/Schneegans/Fly-Pie), originally licensed under the MIT license (https://github.com/Schneegans/Fly-Pie/blob/develop/LICENSE)
#Modifications were made in order to make the script work with this repository
#This script takes 'po/messages.pot' and compiles the latest '.po' file(s) from it
#Usage: 'update-po.sh -l <LANG-CODE>', use '-a' to update all '.po' files

#Create a new translation from 'messages.pot'
promptNewTranslation() {
  if [[ -n "$1" ]]; then
    echo -n "The translation for '$1' does not exist. Do you want to create it? [Y/n] "
    read -r reply

    if [[ "$reply" = "Y" ]] || [[ "$reply" = "y" ]]; then
      msginit --input=po/messages.pot --locale="$1" --output-file="po/$1.po"
      #Add copyright info
      sed -i "2s/.*/# Copyright (C) $(date +%Y) Stuart Hayhurst/" "po/$1.po"
    fi
  fi
}

if ! command -v msgmerge &> /dev/null; then
  echo -e "\nERROR: Could not find msgmerge"; exit 1
fi

#Change to repository root
cd "$( cd "$( dirname "$0" )" && pwd )/.." || \
  { echo -e "\nERROR: Could not find the repository root"; exit 1; }

if [[ "$1" == "-l" ]]; then #Update/Create one specific '.po' file
  #Check if a valid language code was given
  if [[ -f "po/$2.po" ]]; then
    echo -n "Updating '$2.po'"
    msgmerge --previous -U "po/$2.po" po/messages.pot

    #Output translation progress
    echo -n "  "; msgfmt --check --verbose --output-file=/dev/null "po/$2.po"
  else
    promptNewTranslation "$2"
  fi
elif [[ "$1" == "-a" ]]; then #Update all '.po' files
  for FILE in po/*.po; do
    #Handle no .po files
    [[ -e "$FILE" ]] || { echo -e "\nERROR: No .po files found, exiting."; exit 1; }
    echo -n "Updating '$FILE'"
    msgmerge --previous -U "$FILE" po/messages.pot
    #Output translation progress
    echo -n "  "; msgfmt --check --verbose --output-file=/dev/null "$FILE"
  done
else
  echo "ERROR: You need to specify a flag!"; exit 1
fi
