# Contributing to alphabetical-grid-extension
## Overview:
  - Your contributions and pull requests are welcome, this project can always use extra help!
  - In short, to contribute:
    - Make an issue describing what you're working on
    - Thoroughly test the contribution
    - Create a merge request, and make any requested changes

## Suggestions for contributing:
  - New or improved translations
  - Fixes and additions to documentation
  - Bug fixes and feature additions
  - UI improvements

## Translations:
  - To add a new language, use `./scripts/update-po.sh -l [LANGUAGE CODE]`
  - `.po` files can be found in `extension/po/`
  - All translations can be refreshed with `make translations`
  - Strings marked with `fuzzy` may need a better translation
  - Blank strings need a translation added

## UI changes:
  - The UI is built programmatically with `libadwaita`, in `extension/prefs.js`
  - Changes to this must be compatible with the oldest version of GNOME supported
    - If this won't work, it can be conditionally enabled
    - If there's a good enough reason to drop the old version, this is also an option

## Documentation changes:
  - British English should be used in documentation, as well as consistent styling
  - Any new dependencies should be documented under the relevant dependency section
  - Documented information should be updated if the behaviour has changed

## Build system changes:
  - If the behaviour of a target is modified, it should be documented in `README.md`, under "Build system usage"
  - New build system targets should be documented there, and removed targets removed from there as well
  - New scripts should be placed in `scripts/`, and existing scripts are all located there

## Code changes:
  - The extension bundle can be created with `make build`
  - `make install` will install the bundle from `make build`
  - After changes have been made, run `make build; make check` to check the built bundle is alright
  - The extension can be removed with `make uninstall`, if it's non-functional
  - Debugging information can be found in `README.md`, under "Bug reporting / debugging"

## Submitting a pull request:
  - When you believe your contribution to be complete, submit a pull request
    - Follow the template provided when creating a pull request, and fill out relevant information
    - If the code isn't ready to be merged yet, submit the changes as a draft
  - Your changes will be reviewed and either given suggestions for changes, or it'll be approved and merged
  - If possible, please write a summary of changes you made. This makes it easier to make a new release and document the changes

## Other informaton:
  - ALL changes must be allowed under the license (See `LICENSE.md`)
  - ALL changes and discussions must abide by the Code of Conduct (`docs/CODE_OF_CONDUCT.md`)
