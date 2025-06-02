#!/bin/bash

patterns=("*.js" "*.sh" Makefile)

#Fail if any tracked file matching the patterns has a non-ASCII character
failed=false;
for file in $(git ls-files "${patterns[@]}"); do
  if [[ $(cat "$file") = *[![:ascii:]]* ]]; then
    failed="true"
    echo "$file contains non-ASCII characters"
  fi
done

if [[ "$failed" == "true" ]]; then
  exit 1
fi
