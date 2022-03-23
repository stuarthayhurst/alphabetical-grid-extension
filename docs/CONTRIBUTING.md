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
  - GUI improvements

## Working with issues:
  - If someone else is already working on a reported issue, feel free help them out. Please don't try and commandeer the issue, if you want to work on something on your own, find another issue
  - Please report large issues before submitting a pull request to fix them
  - If you are working on your own issue, use that report as a space to track information and progress relating to the issue
  - If any help is required, please make it known, instead of silently dropping the issue
    - There's a label to use when help if wanted, to make searching for the issues easier

## General changes:
  - To work on the project, for the repository first, so you can make changes to your copy
  - Each commit should be a meaningful change, and be functional
  - When the changes are ready, submit a pull request, as described in a later section
  - If the changes aren't complete, submit the pull request as a draft instead
  - Changes may be requested, please don't take them personally, they're just to ensure quality and consistency within the extension

## Translations:
  - To add a new language, use `./scripts/update-po.sh -l [LANGUAGE CODE]`
  - `.po` files can be found in `extension/po/`
  - All translations can be refreshed with `make translations`
  - Strings marked with `fuzzy` may need a better translation
  - Blank strings need a translation added
  - If changes to the strings in `extension/ui/*.ui` were made, `make gtk4` should be run
  - If you want, you can add yourself to `extension/credits.json`, in the `translators` section
    - This is displayed in the `Credits` section of the extension preferences menu

## UI Changes:
  - UI files are located in `extension/ui/`, please use Glade to modify them
  - The GTK+ 4 UI files shouldn't be manually edited, instead generated with `make gtk4`
  - No deprecated values should be used, and the UI files should be verified by Glade after modifications
    - Files can be verified by going into the project settings in Glade, then verifying objects though the pop-up

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
  - Debugging mode can be enabled by setting `debug` to `true` in `extension/metadata.json`, or a setting can be toggled in the extension's preferences

## Submitting a pull request:
  - When you believe your contribution to be complete, submit a pull request
    - Follow the template provided when creating a pull request, and fill out relevant information
    - If the code isn't ready to be merged yet, submit the changes as a draft
  - Your changes will be reviewed and either given suggestions for changes, or it'll be approved and merged
  - If possible, please write a summary of changes you made. This makes it easier to make a new release and document the changes

## Other informaton:
  - ALL changes must be allowed under the license (See `LICENSE.md`)
  - ALL changes and discussions must abide by the Code of Conduct (`docs/CODE_OF_CONDUCT.md`)
