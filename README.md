## Alphabetical App Grid GNOME Extension
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate?hosted_button_id=G2REEPPNZK9GN)
  - Restore the alphabetical ordering of the app grid, removed in GNOME 3.38
  - Supports GNOME 3.38+, earlier versions are untested, and unnecessary
  - Get the extension from [here](https://extensions.gnome.org/extension/4269/alphabetical-app-grid/)
  - This project is licensed under GPL 3.0
  - Any donations are greatly appreciated :)

![Extension](docs/icon.png)

## Install the extension from releases:
  - Extract the zip to `~/.local/share/gnome-shell-extensions/AlphabeticalAppGrid@stuarthayhurst/`
  - Reload GNOME
  - Enable the extension

## Install the extension from source:
  - Make sure the install dependencies are installed
  - `make build`
  - `make install`
  - Reload GNOME
  - Enable the extension

## Build system usage:
  - ### Common targets: Regular build system targets to build, install and uninstall
    - `make build`: Compiles GSettings schemas and creates extension zip
    - `make check`: Runs checks on built extension zip
    - `make install`: Installs the extension
    - `make uninstall`: Uninstalls the extension
  - ### Development targets: These targets are aimed at developers and translators
    - `make clean`: Deletes extension zip, `locale` and automatic backups
    - `make gtk4`: Creates a GTK 4 UI from the GTK 3 UI file (Should be run after any changes to files in `ui/`)
    - `make translations`: Updates translations
    - `make prune`: Removes rubbish from any .svgs in `docs/`
    - `make compress`: Losslessly compresses any .pngs in `docs/`
    - `make release`: Updates the GTK 4 UI, translations, then creates and checks an extension zip
    - `make package`: Creates the extension zip from the project's current state (Only useful for debugging)

## Install dependencies:
  - gettext
  - gnome-extensions
  - libglib2.0-bin

## Build dependencies: (Only required if running `make release`)
  - `All install dependencies`
  - sed (`make translations`)
  - libgtk-4-bin (`make gtk4`)
  - python3 (`make prune`)
  - optipng (`make compress`)

## Want to help?
  - Help with the project is always appreciated, refer to `docs/CONTRIBUTING.md` to get started
  - Documentation, code, translations and UI improvements are all welcome!

## Bug reporting / debugging:
  - A log of what the extension is doing is very helpful for fixing issues
  - The extension logs to the system logs when enabled, which can be accessed with `journalctl /usr/bin/gnome-shell`
  - A live feed of GNOME's logs can be accessed with `journalctl /usr/bin/gnome-shell -f -o cat`
  - To enable logging, the setting can be found under the `Developer settings` section of the extension's settings: ![Enable logging](docs/enable-logging.png)


### Screenshot:
![Extension](docs/screenshot.png)
