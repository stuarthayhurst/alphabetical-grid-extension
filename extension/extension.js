/* exported init enable disable */

//Local extension imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { AppGridHelper, ExtensionHelper } = Me.imports.lib;

//Main imports
const { GLib, Gio, Shell } = imports.gi;
const Main = imports.ui.main;

//Access required objects and systems
const AppDisplay = AppGridHelper.AppDisplay;
const Controls = Main.overview._overview._controls;
const Dash = Controls.dash;

function init() {
  ExtensionUtils.initTranslations();
}

function enable() {
  gridReorder = new Extension();
  ExtensionHelper.loggingEnabled = Me.metadata.debug || gridReorder.extensionSettings.get_boolean('logging-enabled');

  //Patch shell, reorder and trigger listeners
  AppDisplay._redisplay();
  gridReorder.patchShell();
  gridReorder.startListeners();
  gridReorder.reorderGrid('Reordering app grid');
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
    this.shellSettings = new Gio.Settings( {schema: 'org.gnome.shell'} );
    //Load gsettings values for folders, to access 'folder-children'
    this.folderSettings = new Gio.Settings( {schema: 'org.gnome.desktop.app-folders'} );
    //Load gsettings values for the extension itself
    this.extensionSettings = ExtensionUtils.getSettings();
    //Save original shell functions
    this._originalCompareItems = AppDisplay._compareItems;
    this._originalRedisplay = AppDisplay._redisplay;
    //Create a lock to prevent code triggering multiple reorders at once
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
      AppGridHelper.reloadAppGrid.call(AppDisplay);
    }

    //Patched version of _compareItems(), to apply custom order
    let extensionSettings = this.extensionSettings;
    let folderSettings = this.folderSettings;
    function _patchedCompareItems(a, b) {
      let folderPosition = extensionSettings.get_string('folder-order-position');
      let folderArray = folderSettings.get_value('folder-children').get_strv();
      return AppGridHelper.compareItems(a, b, folderPosition, folderArray);
    }

    //Patch the internal functions
    AppDisplay._compareItems = _patchedCompareItems;
    ExtensionHelper.logMessage('Patched item comparison');

    AppDisplay._redisplay = _patchedRedisplay;
    ExtensionHelper.logMessage('Patched redisplay');
  }

  unpatchShell() {
    //Unpatch the internal functions for extension shutdown
    AppDisplay._compareItems = this._originalCompareItems;
    ExtensionHelper.logMessage('Unpatched item comparison');

    AppDisplay._redisplay = this._originalRedisplay;
    ExtensionHelper.logMessage('Unpatched redisplay');
  }

  //Helper functions

  reorderGrid(logMessage) {
    //Detect lock to avoid multiple changes at once
    if (!this._currentlyUpdating && !AppDisplay._pageManager._updatingPages) {
      this._currentlyUpdating = true;
      ExtensionHelper.logMessage(logMessage);

      //Alphabetically order the contents of each folder, if enabled
      if (this.extensionSettings.get_boolean('sort-folder-contents')) {
        ExtensionHelper.logMessage('Reordering folder contents');
        AppGridHelper.reorderFolderContents();
      }

      //Wait a small amount of time to avoid clashing with animations
      this._reorderGridTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
        //Redisplay the app grid and release the lock
        AppDisplay._redisplay();
        this._currentlyUpdating = false;
        this._reorderGridTimeoutId = null;
        return GLib.SOURCE_REMOVE;
      });
    }
  }

  //Listener functions below

  startListeners() {
    //Persistent listeners
    this._waitForGridReorder();
    this._waitForFavouritesChange();
    this._waitForSettingsChange();
    this._waitForInstalledAppsChange();
    this._waitForFolderChange();

    //One time connections
    this._reorderOnceOnDisplay();

    ExtensionHelper.logMessage('Connected to listeners');
  }

  disconnectListeners() {
    this.shellSettings.disconnect(this._reorderSignal);
    Main.overview.disconnect(this._dragReorderSignal);
    this.shellSettings.disconnect(this._favouriteAppsSignal);
    this.extensionSettings.disconnect(this._settingsChangedSignal);
    Shell.AppSystem.get_default().disconnect(this._installedAppsChangedSignal);
    this.folderSettings.disconnect(this._foldersChangedSignal);

    if (this._reorderOnceOnDisplaySignal != null) {
      Dash.showAppsButton.disconnect(this._reorderOnceOnDisplaySignal);
    }

    //Clean up timeout sources
    if (this._reorderGridTimeoutId != null) {
      GLib.Source.remove(this._reorderGridTimeoutId);
    }

    ExtensionHelper.logMessage('Disconnected from listeners');
  }

  _waitForGridReorder() {
    //Connect to gsettings and wait for the order to change
    this._reorderSignal = this.shellSettings.connect('changed::app-picker-layout', () => {
      this.reorderGrid('App grid layout changed, triggering reorder');
    });

   //Connect to the main overview and wait for an item to be dragged
    this._dragReorderSignal = Main.overview.connect('item-drag-end', () => {
      this.reorderGrid('App movement detected, triggering reorder');
    });
  }

  _reorderOnceOnDisplay() {
    //Reorder once when the app grid is opened
    this._reorderOnceOnDisplaySignal = Dash.showAppsButton.connect('notify::checked', () => {
      //Only run required code if app overview toggle is usable
      if (!Controls._ignoreShowAppsButtonToggle) {
        this.reorderGrid('App grid opened, triggering one-off reorder');
        Dash.showAppsButton.disconnect(this._reorderOnceOnDisplaySignal);
        this._reorderOnceOnDisplaySignal = null;
      }
    });
  }

  _waitForFavouritesChange() {
    //Connect to gsettings and wait for the favourite apps to change
    this._favouriteAppsSignal = this.shellSettings.connect('changed::favorite-apps', () => {
      this.reorderGrid('Favourite apps changed, triggering reorder');
    });
  }

  _waitForSettingsChange() {
    //Connect to gsettings and wait for the extension's settings to change
    this._settingsChangedSignal = this.extensionSettings.connect('changed', () => {
      ExtensionHelper.loggingEnabled = Me.metadata.debug || this.extensionSettings.get_boolean('logging-enabled');
      this.reorderGrid('Extension gsettings values changed, triggering reorder');
    });
  }

  _waitForFolderChange() {
    //If a folder was made or deleted, trigger a reorder
    this._foldersChangedSignal = this.folderSettings.connect('changed::folder-children', () => {
      this.reorderGrid('Folders changed, triggering reorder');
    });
  }

  _waitForInstalledAppsChange() {
    //Wait for installed apps to change
    this._installedAppsChangedSignal = Shell.AppSystem.get_default().connect('installed-changed', () => {
      this.reorderGrid('Installed apps changed, triggering reorder');
    });
  }
}
