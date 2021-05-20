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
## Create an extension bundle:
  - `gnome-extensions pack ../alphabetical-grid-extension`

## Install the extension bundle:
  - `gnome-extensions install AlphabeticalAppGrid@stuarthayhurst.shell-extension.zip`
  - Reload GNOME
  - Enable the extension

### Screenshot:
![Extension](docs/screenshot.png)
