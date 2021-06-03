## Alphabetical App Grid GNOME Extension
  - Restore the alphabetical ordering of the app grid, removed in GNOME 3.38
  - Supports GNOME 3.38+, earlier versions are untested, and unnecessary
  - Get the extension from [here](https://extensions.gnome.org/extension/4269/alphabetical-app-grid/)
  - This project is licensed under GPL 3.0

## Known issues:
  - GNOME 3.38 support has been kept, mostly because Ubuntu 21.04 uses it
  - **On GNOME 3.38, the shell needs to be reloaded for the reorder to take effect**
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
  - `make build`: Creates extension zip
  - `make release`: Updates translations and creates extension zip
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
