## Changelog:

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

### v8: `- 2021-06-17`
 - Added donation button to README and preferences
 - Added changelog
 - Fixed folders not automatically reordering when their names are changed (GNOME 40)
 - Fixed error when disconnecting from connected signals
 - Fixed incorrect position in grid for some folders (GNOME 40)
 - Improved repository structure
 - Only send log messages when debugging is enabled (In `metadata.json`)
 - Miscellaneous code fixes and improvements

### v7: `- 2021-06-11`
 - Added settings to choose position of folders (Alphabetical, start or end)
 - Suport instant redisplaying of the grid order on GNOME 3.38
 - General code improvements

### v6: `- 2021-06-03`
 - Added settings menu
 - Added setting to toggle folder contents reordering
 - Added more files to make clean target
 - Added shellcheck GitHub CI runner
 - Fixed apps not reordering when favourite apps change
 - Replaced script to compile locales
 - Updated documentation
 - Increased consistency of code styling

### v5: `- 2021-05-29`
 - Added translation support
 - Added new build system
 - Added German translation - [Philipp Kiemle](https://github.com/daPhipz)
 - Fixed folder contents not being reordered
 - Fixed a typo in a log message
 - Updated documentation
 - General code improvements

### v4: `- 2021-05-20`
 - Updated `README.md`
 - Reorder the grid when folders are created or destroyed

### v3: `- 2021-05-16`
 - Increased code consistency
 - Updated `README.md`
 - Updated the showcase screenshot
 - Added GNOME 40 support
 - Check gsettings key is writable before writing to it
 - Added support for instant redisplaying of the grid order

### v2: `- 2021-05-10`
 - App grid is now initially reordered when the extension is enabled

### v1: `- 2021-05-10`
 - Initial release
