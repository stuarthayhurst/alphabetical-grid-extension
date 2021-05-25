#!/bin/bash

# This script is derived from the awesome Fly-Pie Project (https://github.com/Schneegans/Fly-Pie),
# originally licensed under the MIT license (https://github.com/Schneegans/Fly-Pie/blob/develop/LICENSE).
# Modifications were made in order to make the script work with this repository.

# This script creates a new release of the Alphabetical App Grid GNOME extension.
# When the '-i' option is set, it directly installs it to the system.
# When the '-s' option is set, the script throws an error (instead of just a warning) when the
#   zip file is too big. This is recommended when uploading it to the GNOME Extensions website.
#   We think that the limit is 4096 KB, but we found no official documentation on this so far.

# Exit the script when one command fails.
set -e

# Print usage info
usage() {
    echo "Use '-i' to install the extension to your system. To just build it, run the script without any flag."
    echo "Use '-s' to throw an error when the zip size is too big to be uploaded to the Extensions website."
}


# Go to the repo root.
cd "$( cd "$( dirname "$0" )" && pwd )/.." || \
  { echo "ERROR: Could not find the repo root."; exit 1; }

scripts/compile-locales.sh

# Delete any old zip and pack everything together
# shellcheck disable=2015
gnome-extensions pack --force --extra-source=LICENSE.txt . && \
    echo "Extension packed successfully!" || \
    { echo "ERROR: Could not pack the extension."; exit 1; }


while getopts is FLAG; do
	case $FLAG in
		
		i)  # Install the extension, but only if this would not overwrite the git repository.
            if ! [[ $(pwd) == *".local/share/gnome-shell/extensions/AlphabeticalAppGrid@stuarthayhurst" ]]; then
                # shellcheck disable=2015
                gnome-extensions install AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip --force && \
                echo "Extension installed successfully! Now restart the Shell ('Alt'+'F2', then 'r')." || \
                { echo "ERROR: Could not install the extension."; exit 1; }
            else
                echo "Skipping install step, the repo is already located in the extensions directory."
                echo "Restart the Shell to get the updated version ('Alt'+'F2', then 'r')."
            fi;;

        s)  # We need to throw an error because of the zip size
            SIZE_ERROR="true";;

		*)	echo "ERROR: Invalid flag!"
            usage
            exit 1;;
	esac
done

# Check zip file size
SIZE=$(stat -c %s AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip)

# If the zip is too big and a check is requested, throw an error. Otherwise just print a warning.
if [[ "$SIZE" -gt 4096000 ]]; then
    if [ "$SIZE_ERROR" = "true" ]; then
        echo "ERROR! The zip is too big to be uploaded to the Extensions website. Keep it smaller than 4096 KB!"
        exit 2
    else
        echo "WARNING! The zip is too big to be uploaded to the Extensions website. Keep it smaller than 4096 KB!"
    fi
fi
