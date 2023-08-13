#!/bin/bash
#This script generates the latest '.po' file(s) from the source
#Usage: 'update-po.sh -l <LANG-CODE>', use '-a' to update all '.po' files

#Create a new translation from 'build/messages.pot'
promptNewTranslation() {
  if [[ -n "$1" ]]; then
    echo -n "The translation for '$1' does not exist, do you want to create it? [Y/n] "
    read -r reply

    if [[ "$reply" = "Y" ]] || [[ "$reply" = "y" ]]; then
      msginit --input="../$BUILD_DIR/messages.pot" --locale="$1" --output-file="po/$1.po"
      #Add copyright info
      sed -i "2s/.*/# Copyright (C) $(date +%Y) Stuart Hayhurst/" "po/$1.po"
    fi
  fi
}

#Update translation file $1
updateTranslation() {
  echo -n "Updating '$1': "
  msgmerge --previous -U --quiet "$1" "../$BUILD_DIR/messages.pot"
  msgfmt --check --verbose --output-file=/dev/null "$1"
}

#Change to repository root and exit on failure
set -e
cd "$( cd "$( dirname "$0" )" && pwd )/.." || exit 1

#Set build directory if missing, and create it
if [[ "$BUILD_DIR" == "" ]]; then
  BUILD_DIR="build"
fi
mkdir -p "$BUILD_DIR"

#Generate pot file and swap to extension source dir
./scripts/update-pot.sh
cd "extension" || exit 1

if [[ "$1" == "-l" ]]; then #Update / create one specific '.po' file
  #Check if a valid language code was given
  if [[ -f "po/$2.po" ]]; then
    updateTranslation "po/$2.po"
  else
    promptNewTranslation "$2"
  fi
elif [[ "$1" == "-a" ]]; then #Update all '.po' files
  for file in po/*.po; do
    #Handle no .po files
    [[ -e "$file" ]] || { echo -e "\nERROR: No .po files found"; exit 1; }
    updateTranslation "$file"
  done
else
  echo "ERROR: You need to specify a flag"; exit 1
fi
