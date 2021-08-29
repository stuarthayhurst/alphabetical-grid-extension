//Local extension imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { AppGridHelper, ExtensionHelper } = Me.imports.lib;
const ShellVersion = ExtensionHelper.shellVersion;

//Main imports
const { GLib, Gio, Shell } = imports.gi;
const Main = imports.ui.main;
const ParentalControlsManager = imports.misc.parentalControlsManager;

//Translation imports
const Gettext = imports.gettext;
Gettext.textdomain(Me.metadata.uuid);
Gettext.bindtextdomain(Me.metadata.uuid, ExtensionSystem.extensionMeta[Me.metadata.uuid].path + "/locale");

//Use _() for translations
const _ = Gettext.gettext;

//Access required objects and systems
const AppDisplay = ShellVersion < 40 ? Main.overview.viewSelector.appDisplay : Main.overview._overview._controls._appDisplay;

function init() {
  ExtensionUtils.initTranslations();
}

function enable() {
  gridReorder = new Extension();
  ExtensionHelper.loggingEnabled = Me.metadata.debug || gridReorder.extensionSettings.get_boolean('logging-enabled');

  //Patch shell, reorder and trigger listeners
  gridReorder.patchShell();
  gridReorder.reorderGrid(Gettext.pgettext('log-message','Reordering app grid'));
  gridReorder.startListeners();
}

function disable() {
  //Disconnect from events and clean up
  gridReorder.disconnectListeners();
  gridReorder.unpatchShell();

  gridReorder = null;
}

class Extension {
  constructor() {
    //Load gsettings values for GNOME Shell
    this.shellSettings = ExtensionUtils.getSettings('org.gnome.shell');
    //Load gsettings values for folders, to access 'folder-children'
    this.folderSettings = ExtensionUtils.getSettings('org.gnome.desktop.app-folders');
    //Load gsettings values for the extension itself
    this.extensionSettings = ExtensionUtils.getSettings();
    //Save original shell functions
    this._originalCompareItems = AppDisplay._compareItems;
    this._originalRedisplay = AppDisplay._redisplay;
    this._originalLoadApps = AppDisplay._loadApps;
    //Save whether or not favourite apps are currently shown
    this._favouriteAppsShown = false;
    //Create a lock to prevent code fighting itself to change gsettings
    this._currentlyUpdating = false;
  }

  patchShell() {
    //Patched functions delcared here for access to extension's variables

    //Patched version of _redisplay() to apply custom order
    let originalRedisplay = this._originalRedisplay;
    function _patchedRedisplay() {
      //Call original redisplay code to handle added and removed items
      originalRedisplay.call(this);
      //Call patched redisplay code to reorder the items
      AppGridHelper.reloadAppGrid();
    }

    //Patched version of _compareItems(), to apply custom order
    let extensionSettings = this.extensionSettings;
    let folderSettings = this.folderSettings;
    function _patchedCompareItems(a, b) {
      let folderPosition = extensionSettings.get_string('folder-order-position');
      let folderArray = folderSettings.get_value('folder-children').get_strv();
      return AppGridHelper.compareItems(a, b, folderPosition, folderArray);
    }

    //Actually patch the internal functions
    AppDisplay._compareItems = _patchedCompareItems;
    ExtensionHelper.logMessage(Gettext.pgettext('log-message','Patched item comparison'));

    AppDisplay._redisplay = _patchedRedisplay;
    ExtensionHelper.logMessage(Gettext.pgettext('log-message','Patched redisplay'));
  }

  unpatchShell() {
    //Unpatch the internal functions for extension shutdown
    AppDisplay._compareItems = this._originalCompareItems;
    ExtensionHelper.logMessage(Gettext.pgettext('log-message','Unpatched item comparison'));

    AppDisplay._redisplay = this._originalRedisplay;
    ExtensionHelper.logMessage(Gettext.pgettext('log-message','Unpatched redisplay'));
  }

  //Helper functions

  reorderGrid(logMessage) {
    //Detect lock to avoid multiple changes at once
    if (!this._currentlyUpdating) {
      this._currentlyUpdating = true;
      ExtensionHelper.logMessage(logMessage);

      //Alphabetically order the contents of each folder, if enabled
      if (this.extensionSettings.get_boolean('sort-folder-contents')) {
        ExtensionHelper.logMessage(Gettext.pgettext('log-message','Reordering folder contents'));
        AppGridHelper.reorderFolderContents();
      }

      //Wait a small amount of time to avoid clashing with animations
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
        //Redisplay the app grid and release the lock
        AppDisplay._redisplay();
        this._currentlyUpdating = false;
      });
    }
  }

  setShowFavouriteApps(targetState) {
    //Declare locally for access
    let currentState = this._favouriteAppsShown;
    let shellSettings = this.shellSettings;
    let originalLoadApps = this._originalLoadApps;

    //Monkey-patched wrapper for _loadApps() to not remove favourite apps
    function _patchedLoadApps() {
      let originalIsFavorite = AppDisplay._appFavorites.isFavorite;

      //Temporarily disable the shell's ability to detect a favourite app
      AppDisplay._appFavorites.isFavorite = function () { return false; };
      let appList = originalLoadApps.call(this);
      AppDisplay._appFavorites.isFavorite = originalIsFavorite;

      return appList;
    }

    if (currentState == targetState) { //Do nothing if the current state and target state match
      if (currentState) {
        ExtensionHelper.logMessage(Gettext.pgettext('log-message','Favourite apps are already shown'));
      } else {
        ExtensionHelper.logMessage(Gettext.pgettext('log-message','Favourite apps are already hidden'));
      }
      return;

    } else if (targetState) { //Show favourite apps, by patching _loadApps()
      ExtensionHelper.logMessage(Gettext.pgettext('log-message','Showing favourite apps on the app grid'));
      AppDisplay._loadApps = _patchedLoadApps;
    } else { //Hide favourite apps, by restoring _loadApps()
      ExtensionHelper.logMessage(Gettext.pgettext('log-message','Hiding favourite apps on the app grid'));
      AppDisplay._loadApps = originalLoadApps;
    }
    this._favouriteAppsShown = targetState;

    //Trigger reorder with new changes
    this.reorderGrid(Gettext.pgettext('log-message','Reordering app grid, due to favourite apps'));
  }

  //Listener functions below

  startListeners() {
    this._waitForExternalReorder();
    this._waitForFavouritesChange();
    this._waitForSettingsChange();
    this._waitForInstalledAppsChange();
    this._waitForFolderChange();

    //Only needed on GNOME 40
    if (ShellVersion > 3.38) {
      this._handleShowFavouriteApps();
    }

    ExtensionHelper.logMessage(Gettext.pgettext('log-message','Connected to listeners'))
  }

  disconnectListeners() {
    this.shellSettings.disconnect(this._reorderSignal);
    this.shellSettings.disconnect(this._favouriteAppsSignal);
    this.extensionSettings.disconnect(this._settingsChangedSignal);
    Shell.AppSystem.get_default().disconnect(this._installedAppsChangedSignal);
    this.folderSettings.disconnect(this._foldersChangedSignal);

    //Disable showing the favourite apps on the app grid
    this.extensionSettings.disconnect(this._showFavouritesSignal);
    this.setShowFavouriteApps(false);

    ExtensionHelper.logMessage(Gettext.pgettext('log-message','Disconnected from listeners'))
  }

  _handleShowFavouriteApps() {
    //Set initial state
    this.setShowFavouriteApps(this.extensionSettings.get_boolean('show-favourite-apps'));
    //Wait for show favourite apps to be toggled
    this._showFavouritesSignal = this.extensionSettings.connect('changed::show-favourite-apps', () => {
      this.setShowFavouriteApps(this.extensionSettings.get_boolean('show-favourite-apps'));
    });
  }

  _waitForExternalReorder() {
    //Connect to gsettings and wait for the order to change
    this._reorderSignal = this.shellSettings.connect('changed::app-picker-layout', () => {
      this.reorderGrid(Gettext.pgettext('log-message','App grid layout changed, triggering reorder'));
    });
  }

  _waitForFavouritesChange() {
    //Connect to gsettings and wait for the favourite apps to change
    this._favouriteAppsSignal = this.shellSettings.connect('changed::favorite-apps', () => {
      this.reorderGrid(Gettext.pgettext('log-message','Favourite apps changed, triggering reorder'));
    });
  }

  _waitForSettingsChange() {
    //Connect to gsettings and wait for the extension's settings to change
    this._settingsChangedSignal = this.extensionSettings.connect('changed', () => {
      ExtensionHelper.loggingEnabled = Me.metadata.debug || this.extensionSettings.get_boolean('logging-enabled');
      this.reorderGrid(Gettext.pgettext('log-message','Extension gsettings values changed, triggering reorder'));
    });
  }

  _waitForFolderChange() {
    //If a folder was made or deleted, trigger a reorder
    this._foldersChangedSignal = this.folderSettings.connect('changed::folder-children', () => {
      this.reorderGrid(Gettext.pgettext('log-message','Folders changed, triggering reorder'));
    });
  }

  _waitForInstalledAppsChange() {
    //Wait for installed apps to change
    this._installedAppsChangedSignal = Shell.AppSystem.get_default().connect('installed-changed', () => {
      this.reorderGrid(Gettext.pgettext('log-message','Installed apps changed, triggering reorder'));
    });
  }
}
