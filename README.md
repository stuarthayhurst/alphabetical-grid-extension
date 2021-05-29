## Alphabetical App Grid GNOME Extension
  - Restore the alphabetical ordering of the app grid, removed in GNOME 3.38
  - App folders are saved, and treated like regular apps when sorting
  - Supports GNOME 3.38+, earlier versions are untested, and unnecessary
  - Get the extension from [here](https://extensions.gnome.org/extension/4269/alphabetical-app-grid/)
  - This project is licensed under GPL 3.0

## Known issues:
  - **On GNOME 3.38, the shell needs to be reloaded for the reorder to take effect**
  - **Newly added applications are only reordered when the extension restarts, or when another application is moved**

![Extension](docs/icon.png)

## Build system usage:
  - `make build`: Creates extension zip
  - `make release`: Updates translations and creates extension zip
  - `make translations`: Updates translations
  - `make install`: Installs the extension
  - `make uninstall`: Uninstalls the extension
  - `make clean`: Deletes extension zip and `locale` directory

## Build dependencies: (Only required if running `make build`)
  - gnome-extensions
  - gettext
  - sed

## Create an extension bundle:
  - `make build`
  - For release, `make release` creates the bundle with updated translations

## Install the extension from releases:
  - Extract the zip to `~/.local/share/gnome-shell-extensions/AlphabeticalAppGrid@stuarthayhurst/`

## Install the extension from source:
  - `make build`
  - `make install`
  - Reload GNOME
  - Enable the extension

### Screenshot:
![Extension](docs/screenshot.png)
