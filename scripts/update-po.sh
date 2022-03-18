#!/bin/bash
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

#Change to repository root and exit on failure
set -e
cd "$( cd "$( dirname "$0" )" && pwd )/.." || exit 1
cd "extension" || exit 1

if [[ "$1" == "-l" ]]; then #Update / create one specific '.po' file
  #Check if a valid language code was given
  if [[ -f "po/$2.po" ]]; then
    echo -n "Updating '$2.po'"
    msgmerge --previous -U "po/$2.po" po/messages.pot

    echo -n "  "; msgfmt --check --verbose --output-file=/dev/null "po/$2.po"
  else
    promptNewTranslation "$2"
  fi
elif [[ "$1" == "-a" ]]; then #Update all '.po' files
  for file in po/*.po; do
    #Handle no .po files
    [[ -e "$file" ]] || { echo -e "\nERROR: No .po files found, exiting."; exit 1; }
    echo -n "Updating '$file'"
    msgmerge --previous -U "$file" po/messages.pot

    echo -n "  "; msgfmt --check --verbose --output-file=/dev/null "$file"
  done
else
  echo "ERROR: You need to specify a flag!"; exit 1
fi
