//Local extension imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { AppGridHelper, ExtensionHelper } = Me.imports.lib;
const ShellVersion = ExtensionHelper.shellVersion;

//Main imports
const { GLib, Gio, Shell } = imports.gi;
const Main = imports.ui.main;
const ParentalControlsManager = imports.misc.parentalControlsManager;

//Access required objects and systems
const AppDisplay = ShellVersion < 40 ? Main.overview.viewSelector.appDisplay : Main.overview._overview._controls._appDisplay;
const AppSystem = new Shell.AppSystem();

//Use _() for translations
const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

function init() {
  ExtensionUtils.initTranslations();
}

function enable() {
  gridReorder = new Extension();
  //Reorder initially, to provide an initial reorder, as well as apps not already taken care of
  gridReorder.reorderGrid();
  //Trigger all listeners for reorders and other operations
  gridReorder.startListeners();
}

function disable() {
  //Disconnect from events and clean up
  gridReorder.disconnectListeners();

  gridReorder = null;
}

class Extension {
  constructor() {
    //Load gsettings values for GNOME Shell
    this.shellSettings = ExtensionUtils.getSettings('org.gnome.shell');
    //Load gsettings values for folders, to access 'folder-children'
    this.folderSettings = ExtensionUtils.getSettings('org.gnome.desktop.app-folders');
    //Array of signals connected to folder names
    this.folderNameSignals = [];
    //Array of gsettings connected to each folder
    this.individualFolderSettings = [];
    //Load gsettings values for the extension itself
    this.extensionSettings = ExtensionUtils.getSettings();
    //Create a lock to prevent code fighting itself to change gsettings
    this._currentlyUpdating = false;
    //Save whether or not favourite apps are currently shown
    this._favouriteAppsShown = false;
    //Save the original _loadApps function
    this._originalLoadApps = AppDisplay._loadApps;
  }

  reorderGrid() {
    //Alphabetically order the contents of each folder, if enabled
    if (this.extensionSettings.get_boolean('sort-folder-contents')) {
      ExtensionHelper.logMessage(_('Reordering folder contents'));
      AppGridHelper.reorderFolderContents();
    }

    //Alphabetically order the grid
    if (this.shellSettings.is_writable('app-picker-layout')) {
      //Get the desired order of the grid, including folders
      let folderPositionSetting = this.extensionSettings.get_string('folder-order-position');
      let gridOrder = AppGridHelper.getGridOrder(folderPositionSetting);
      this.shellSettings.set_value('app-picker-layout', new GLib.Variant('aa{sv}', gridOrder));

      //Trigger a refresh of the app grid, if enabled
      if (this.extensionSettings.get_boolean('auto-refresh-grid')) {
        ExtensionHelper.logMessage(_('Automatic grid refresh enabled, refreshing grid'));
        AppGridHelper.reloadAppGrid();
      }

      ExtensionHelper.logMessage(_('Reordered grid'));
    } else {
      ExtensionHelper.logMessage(_('org.gnome.shell app-picker-layout is unwritable, skipping reorder'));
    }
  }

  _checkUpdatingLock(logMessage) {
    //Detect lock to avoid multiple changes at once
    if (!this._currentlyUpdating) {
      this._currentlyUpdating = true;

      ExtensionHelper.logMessage(logMessage);
      //Wait an amount of time to avoid clashing with animations
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
        this.reorderGrid();
        this._currentlyUpdating = false;
      });
    }
  }

  setShowFavouriteApps(targetState) {
    let currentState = this._favouriteAppsShown;
    let shellSettings = this.shellSettings;
    let originalLoadApps = this._originalLoadApps;

    //Wrapper for _loadApps() to not remove favourite apps
    function patchedLoadApps() {
      let originalIsFavorite = AppDisplay._appFavorites.isFavorite;

      //Temporarily disable the code's ability to detect a favourite app
      AppDisplay._appFavorites.isFavorite = function () { return false; };
      let appList = originalLoadApps.call(this);
      AppDisplay._appFavorites.isFavorite = originalIsFavorite;

      return appList;
    }

    if (currentState == targetState) { //Do nothing if the current state and target state match
      if (currentState) {
        ExtensionHelper.logMessage(_('Favourite apps are already shown'));
      } else {
        ExtensionHelper.logMessage(_('Favourite apps are already hidden'));
      }

      return;
    } else if (targetState) { //Hide favourite apps, by patching _loadApps()
      ExtensionHelper.logMessage(_('Showing favourite apps on the app grid'));
      AppDisplay._loadApps = patchedLoadApps;

      this._favouriteAppsShown = true;
    } else { //Hide favourite apps, by restoring _loadApps()
      ExtensionHelper.logMessage(_('Hiding favourite apps on the app grid'));
      AppDisplay._loadApps = originalLoadApps;

      this._favouriteAppsShown = false;
    }

    //Trigger reorder with new changes
    this._checkUpdatingLock(_('Reordering app grid, due to favourite apps'));
  }

  //Create listeners to trigger reorders of the grid and other actions when needed

  startListeners() {
    this.waitForExternalReorder();
    this.waitForFavouritesChange();
    this.waitForFolderChange();
    this.waitForSettingsChange();
    this.waitForInstalledAppsChange();

    //Only needed on GNOME 40
    if (ShellVersion > 3.36) {
      this.handleShowFavouriteApps();
    }

    ExtensionHelper.logMessage(_('Connected to listeners'))
  }

  disconnectListeners() {
    this.shellSettings.disconnect(gridReorder.reorderSignal);
    this.shellSettings.disconnect(gridReorder.favouriteAppsSignal);
    this.folderSettings.disconnect(gridReorder.foldersChangedSignal);
    this.extensionSettings.disconnect(gridReorder.settingsChangedSignal);
    AppSystem.disconnect(gridReorder.installedAppsChangedSignal);

    //Disable showing the favourite apps on the app grid
    gridReorder.setShowFavouriteApps(false);

    //Only disconnect from folder renaming signals if they were connected
    if (gridReorder.folderNameSignals.length) {
      this.waitForFolderRename('disconnect');
    }

    ExtensionHelper.logMessage(_('Disconnected from listeners'))
  }

  handleShowFavouriteApps() {
    //Set initial state
    this.setShowFavouriteApps(this.extensionSettings.get_boolean('show-favourite-apps'));
    //Wait for show favourite apps to be toggled
    this.settingsChangedSignal = this.extensionSettings.connect('changed::show-favourite-apps', () => {
      this.setShowFavouriteApps(this.extensionSettings.get_boolean('show-favourite-apps'));
    });
  }

  waitForFolderChange() {
    //If a folder was made or deleted, trigger a reorder
    this.foldersChangedSignal = this.folderSettings.connect('changed::folder-children', () => {
      this._checkUpdatingLock(_('Folders changed, triggering reorder'));
    });

    //Each time folders update, the folders this connects to need to be refreshed
    if (ShellVersion > 3.36) { //Setup listener to trigger reorder when folders are renamed on GNOME 40+
      this.waitForFolderRename('disconnect');
      this.waitForFolderRename('connect');
    }
  }

  waitForFolderRename(operation) {
    if (operation == 'connect') {
      let folderArray = this.folderSettings.get_value('folder-children').get_strv();
      folderArray.forEach((folder, i) => {

        this.individualFolderSettings[i] = Gio.Settings.new_with_path('org.gnome.desktop.app-folders.folder', '/org/gnome/desktop/app-folders/folders/' + folder + '/');

        this.folderNameSignals.push(this.individualFolderSettings[i].connect('changed::name', () => {
          this._checkUpdatingLock(_('Folder renamed, triggering reorder'));
        }));
      });
    } else if (operation == 'disconnect') {
      //Disconnect from signals
      this.folderNameSignals.forEach((signal, i) => {
        this.individualFolderSettings[i].disconnect(signal);
      });

      this.folderNameSignals = [];
      this.individualFolderSettings = [];
    }
  }

  waitForExternalReorder() {
    //Connect to gsettings and wait for the order to change
    this.reorderSignal = this.shellSettings.connect('changed::app-picker-layout', () => {
      this._checkUpdatingLock(_('App grid layout changed, triggering reorder'));
    });
  }

  waitForFavouritesChange() {
    //Connect to gsettings and wait for the favourite apps to change
    this.favouriteAppsSignal = this.shellSettings.connect('changed::favorite-apps', () => {
      this._checkUpdatingLock(_('Favourite apps changed, triggering reorder'));
    });
  }

  waitForSettingsChange() {
    //Connect to gsettings and wait for the extension's settings to change
    this.settingsChangedSignal = this.extensionSettings.connect('changed', () => {
      this._checkUpdatingLock(_('Extension gsettings values changed, triggering reorder'));
    });
  }

  waitForInstalledAppsChange() {
    //Wait for installed apps to change
    this.installedAppsChangedSignal = AppSystem.connect('installed-changed', () => {
      this._checkUpdatingLock(_('Installed apps changed, triggering reorder'));
    });
  }

}
