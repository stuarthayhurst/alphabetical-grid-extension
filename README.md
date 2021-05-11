## Alphabetical App Grid GNOME Extension
  - Restore the alphabetical ordering of the app grid, removed in GNOME 3.38
  - App folders are saved, and treated like regular apps when sorting
  - Supports GNOME 3.38+, earlier versions are untested, and unnecessary
  - Get the extension from [here](https://extensions.gnome.org/extension/4269/alphabetical-app-grid/)
  - This project is licensed under GPL 3.0

## Known issues:
  - The following issues are known, and are planned to be fixed:
  - **The shell needs to be reloaded for the reorder to take effect**
  - **Newly added applications are only reordered alphabetically when the shell is reloaded**

![Extension](docs/icon.png)
## Create an extension bundle:
  - `gnome-extensions pack ../alphabetical-grid-extension`

## Install the extension bundle:
  - `gnome-extensions install AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip`
  - Reload GNOME
  - Enable the extension

### Screenshot:
![Extension](docs/screenshot.png)
