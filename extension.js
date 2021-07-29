//Local extension imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { AppGridHelper, ExtensionHelper } = Me.imports.lib;
const ShellVersion = ExtensionHelper.shellVersion;

//Main imports
const { GLib, Gio } = imports.gi;

//Use _() for translations
const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

function init() {
  ExtensionUtils.initTranslations();
}

function enable() {
  gridReorder = new Extension();
  //Reorder initially, to provide an intial reorder, as well as apps not already taken care of
  gridReorder.reorderGrid();
  //Wait until the grid is reordered or app folders changed for further reorders
  gridReorder.waitForExternalReorder();
  gridReorder.waitForFavouritesChange();
  gridReorder.waitForFolderChange();
  gridReorder.waitForSettingsChange();
}

function disable() {
  //Disconnect from events and clean up
  gridReorder.shellSettings.disconnect(gridReorder.reorderSignal);
  gridReorder.shellSettings.disconnect(gridReorder.favouriteAppsSignal);
  gridReorder.folderSettings.disconnect(gridReorder.foldersChangedSignal);
  gridReorder.extensionSettings.disconnect(gridReorder.settingsChangedSignal);
  //Only disconnect from folder renaming signals if they were connected to
  if (gridReorder.folderNameSignals.length) {
    gridReorder.waitForFolderRename('disconnect');
  }
  gridReorder = null;
}

class Extension {
  constructor() {
    //Load gsettings values for GNOME Shell, to access 'app-picker-layout'
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
  }

  reorderGrid() {
    //Alphabetically order the contents of each folder, if enabled
    if (this.extensionSettings.get_boolean('sort-folder-contents') == true) {
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
      if (this.extensionSettings.get_boolean('auto-refresh-grid') == true) {
        ExtensionHelper.logMessage(_('Automatic grid refresh enabled, refreshing grid'));
        AppGridHelper.reloadAppGrid();
      }

      ExtensionHelper.logMessage(_('Reordered grid'));
    } else {
      ExtensionHelper.logMessage(_('org.gnome.shell app-picker-layout is unwritable, skipping reorder'));
    }
  }

  //Create listeners to trigger reorders of the grid when needed

  waitForFolderChange() {
    //If a folder was made or deleted, trigger a reorder
    this.foldersChangedSignal = this.folderSettings.connect('changed::folder-children', () => {
      ExtensionHelper.checkUpdatingLock(_('Folders changed, triggering reorder'));
    });

    //Each time folders update, the folders this connects to need to be refreshed
    if (ShellVersion > 3.36) { //Trigger reorder when folders are renamed on GNOME 40+
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
          ExtensionHelper.checkUpdatingLock(_('Folder renamed, triggering reorder'));

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
      ExtensionHelper.checkUpdatingLock(_('App grid layout changed, triggering reorder'));
    });
  }

  waitForFavouritesChange() {
    //Connect to gsettings and wait for the favourite apps to change
    this.favouriteAppsSignal = this.shellSettings.connect('changed::favorite-apps', () => {
      ExtensionHelper.checkUpdatingLock(_('Favourite apps changed, triggering reorder'));
    });
  }

  waitForSettingsChange() {
    //Connect to gsettings and wait for the extension's settings to change
    this.settingsChangedSignal = this.extensionSettings.connect('changed', () => {
      ExtensionHelper.checkUpdatingLock(_('Extension gsettings values changed, triggering reorder'));
    });
  }
}
