## Changelog:

### v26 - `2022-09-11`:
 - Added GNOME 43 metadata support

### v25 - `2022-07-22`
 - Added Arabic translation - [Omar](https://github.com/ots25) (#69)
 - README fixes (#70)

### v24 - `2022-05-27`
 - Updated Russian translation (#61)
 - Added Italian translation - [Albano](https://github.com/albanobattistella) (#64)
 - Added Taiwanese Mandarin translation - [Oliver](https://github.com/olivertzeng) (#68)
 - Updated pull request template
 - Updated GitHub runner to Ubuntu 22.04
 - Build system fixes

### v23 - `2022-04-16`
 - Fixed large amounts of apps missing from the app grid (#59)
 - Improved troubleshooting section in README

### v22 - `2022-04-07`
 - Fixed folders not being updated when contents change

### v21 - `2022-04-06`
 - Reimplement UI using pages
 - Added a new 'About' page, with support for GNOME 42
 - Added a new 'Credits' page, for extension developers and translators
 - Replaced preferences title with page switcher
 - Replaced extension icon with an svg
 - Miscellaneous settings menu design improvements
 - Updated README and showcase screenshots
 - General code fixes (Primarily target GNOME 40+, styling, code quality improvements)
 - Build system improvements (Output, structure)

### v20 - `2022-03-12`
 - Russian translation fixes (#53, #54)
 - GNOME 42 support (no changes required)

### v19 - `2022-02-18`
 - Added Russian translation - [Nikolay](https://github.com/sngvy) (#52)
 - Stop translating log messages, as they're for debugging

### v18 - `2022-01-29`
 - Added Spanish translation - [Óscar](https://github.com/oscfdezdz) (#49)

### v17 - `2022-01-18`
 - Updated donation link
 - Updated copyright year
 - Silenced build system icon output

### v16 - `2021-11-22`
 - README and changelog fixes
 - Minor Makefile improvement (Fixed -o7 quotes ending before content starts)
 - Removed "Show favourite apps on the app grid" option, as it's out of the project's scope
   - Use [this](https://extensions.gnome.org/extension/4485/favourites-in-appgrid/) extension instead

### v15 - `2021-10-09`
 - Hotfix: Actually disconnect from GLib timeouts

### v14 - `2021-10-09`
 - Fixed app grid not being reordered if the same pair of apps were swapped twice
 - Fixed favourite apps not starting in the correct place
 - Fixed initial reorder sometimes being incorrect #43
 - Updated pull request template
 - Build system improvements #39, #40
 - README improvements

### v13 - `2021-09-21`
 - Added icon compressor (`make compress`) and optimised svg icon (`make prune`)
 - Added French translation (#33, #34) - [Philipp Kiemle](https://github.com/daPhipz) + A couple others
 - Added build system checks to GitHub CI Pipeline
 - Added comments for translators and tweaked translation strings (#36)
 - Added bug report, feature request and pull request templates
 - Added more documentation on build system targets and debugging (#38)
 - Added code of conduct and contributing guidelines
 - Fixed extension icon not showing up on some distros
 - Use `Gio.Settings` to create GSettings objects
 - Removed unused imports

### v12: - `2021-08-28`
 - General code, build system and README improvements
 - Added setting to toggle logging (Previously the metadata had to be modified)
 - Added debugging section to README
 - Added GNOME 41 support
 - Fixed some unnecessary features not being disabled on GNOME 3.38
 - Fixed greyed out UI elements only being partially greyed out
 - Fixed shell crashing if apps were moved out of a folder and into the same folder as the source (#29)
 - Fixed shell crashing randomly when apps are installed / reduce frequency (I couldn't reliably reproduce it to troubleshoot properly)
 - Restructured Glade .ui files

### v11: - `2021-08-04`
 - Hotfix: Correct code for upload to GNOME Extensions website

### v10: - `2021-08-04`
 - Added automatic grid reordering when the installed apps change
 - Added setting to enable displaying favourite apps on the grid (#20)
 - Added timestamp to debug information / logging
 - Added more verbose logging
 - Added Dutch translation - [Heimen Stoffels](https://github.com/Vistaus)
 - Fixed some characters being sent to the end of the grid (#24)
 - Fixed floating icons after making new folders
 - Fixed some folders not being reordered when renamed
 - Improved settings menu
 - Improved code quality
 - Moved `gettext` to install dependencies

### v9: - `2021-07-29`
 - Added setting to toggle automatic refresh of the app grid
 - Added check that that the folder settings GSettings key used is writable before attempting to write to it
 - Updated build system targets and added new tweaks
 - Updated documentation on build system and dependencies
 - Internal code improvements

### v8: - `2021-06-17`
 - Added donation button to README and preferences
 - Added changelog
 - Fixed folders not automatically reordering when their names are changed (GNOME 40)
 - Fixed error when disconnecting from connected signals
 - Fixed incorrect position in grid for some folders (GNOME 40)
 - Improved repository structure
 - Only send log messages when debugging is enabled (In `metadata.json`)
 - Miscellaneous code fixes and improvements

### v7: - `2021-06-11`
 - Added settings to choose position of folders (Alphabetical, start or end)
 - Suport instant redisplaying of the grid order on GNOME 3.38
 - General code improvements

### v6: - `2021-06-03`
 - Added settings menu
 - Added setting to toggle folder contents reordering
 - Added more files to make clean target
 - Added shellcheck GitHub CI runner
 - Fixed apps not reordering when favourite apps change
 - Replaced script to compile locales
 - Updated documentation
 - Increased consistency of code styling

### v5: - `2021-05-29`
 - Added translation support
 - Added new build system
 - Added German translation - [Philipp Kiemle](https://github.com/daPhipz)
 - Fixed folder contents not being reordered
 - Fixed a typo in a log message
 - Updated documentation
 - General code improvements

### v4: - `2021-05-20`
 - Updated `README.md`
 - Reorder the grid when folders are created or destroyed

### v3: - `2021-05-16`
 - Increased code consistency
 - Updated `README.md`
 - Updated the showcase screenshot
 - Added GNOME 40 support
 - Check gsettings key is writable before writing to it
 - Added support for instant redisplaying of the grid order

### v2: - `2021-05-10`
 - App grid is now initially reordered when the extension is enabled

### v1: - `2021-05-10`
 - Initial release
