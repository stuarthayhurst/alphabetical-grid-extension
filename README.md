## Alphabetical App Grid GNOME Extension
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate?hosted_button_id=G2REEPPNZK9GN)
  - Restore the alphabetical ordering of the app grid, removed in GNOME 3.38
  - Supports GNOME 3.38+, earlier versions are untested, and unnecessary
  - Get the extension from [here](https://extensions.gnome.org/extension/4269/alphabetical-app-grid/)
  - This project is licensed under GPL 3.0
  - Any donations are greatly appreciated :)

## Known issues:
  - **Newly added applications aren't automatically reordered**

![Extension](docs/icon.png)

## Install the extension from releases:
  - Extract the zip to `~/.local/share/gnome-shell-extensions/AlphabeticalAppGrid@stuarthayhurst/`
  - Reload GNOME
  - Enable the extension

## Install the extension from source:
  - `make build`
  - `make install`
  - Reload GNOME
  - Enable the extension

## Build system usage:
  - `make build`: Creates GTK 4 UI, compiles gsettings schemas and creates extension zip
  - `make release`: Updates translations and creates extension zip
  - `make package`: Creates the extension zip from the project's current state (Only useful for debugging)
  - `make gtk4`: Creates a GTK 4 UI from the GTK 3 UI file
  - `make translations`: Updates translations
  - `make install`: Installs the extension
  - `make uninstall`: Uninstalls the extension
  - `make clean`: Deletes extension zip and `locale` directory

## Build dependencies: (Only required if running `make release`)
  - gnome-extensions
  - gettext (Translations)
  - libglib2.0-bin (Translations)
  - libgtk-4-bin (GTK)
  - sed (Translations)

## Create an extension bundle:
  - `make build`
  - For release, `make release` creates the bundle with updated translations

## Want to help?
  - To enable logging from the extension, set `debug` to `true` in `metadata.json`
  - ### Translations:
    - To add a new language, use `./scripts/update-po.sh -l [LANGUAGE CODE]`
    - `.po` files can be found in `po/`
    - All translations can be refreshed with `make translations`
    - Strings marked with `fuzzy` may need a better translation
    - Blank strings need a translation added
  - ### Code and documentation:
    - Changes are welcome, as long as they are documented, well explained and necessary
    - Make your changes and submit a pull request, where it'll shortly be reviewed
    - If any changes are requested, please make the changes and wait for it to be re-reviewed

### Screenshot:
![Extension](docs/screenshot.png)
