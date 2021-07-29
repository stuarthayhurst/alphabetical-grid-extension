//Local extension imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { AppGridHelper } = Me.imports.lib;

//Handle GNOME Shell version
const Config = imports.misc.config;
const ShellVersion = parseFloat(Config.PACKAGE_VERSION);

//AppDisplay based off of version
const AppDisplay = ShellVersion < 40 ? Main.overview.viewSelector.appDisplay : Main.overview._overview._controls._appDisplay;

//Main imports
const { GLib, Gio, Shell } = imports.gi;
const Main = imports.ui.main;

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
    //Create AppSystem
    this._appSystem = new Shell.AppSystem();
    //Create a lock to prevent code fighting itself to change gsettings
    this._currentlyUpdating = false;
  }

  _logMessage(message) {
    if (Me.metadata.debug == true) {
      log('alphabetical-app-grid: ' + message);
    }
  }

  //Called by reorderGrid()
  _reorderFolderContents() {
    this._logMessage(_('Reordering folder contents'));

    //Get array of folders from 'folder-children' key
    let folderArray = this.folderSettings.get_value('folder-children').get_strv();

    //Loop through all folders, and reorder their contents
    folderArray.forEach((targetFolder, i) => {
      //Get the contents of the folder, from gsettings value
      let folderContentsSettings = Gio.Settings.new_with_path('org.gnome.desktop.app-folders.folder', '/org/gnome/desktop/app-folders/folders/' + targetFolder + '/');
      let folderContents = folderContentsSettings.get_value('apps').get_strv();

      //Reorder the contents of the folder
      folderContents = this._orderByDisplayName(folderContents);

      //Set the gsettings value for 'apps' to the ordered list
      let currentOrder = folderContentsSettings.get_value('apps').get_strv();
      if (String(currentOrder) != String(folderContents)) {
        folderContentsSettings.set_value('apps', new GLib.Variant('as', folderContents));
      }
    });
  }

  //Returns an ordered version of 'inputArray', ordered by display name
  _orderByDisplayName(inputArray) {
    //Loop through array contents and get their display names
    inputArray.forEach((currentTarget, i) => {
      let folderArray = this.folderSettings.get_value('folder-children').get_strv();
      let displayName;

      //Lookup display name of each item (decide if it's an app or folder first)
      if (folderArray.includes(currentTarget)) { //Folder
        let targetFolderSettings = Gio.Settings.new_with_path('org.gnome.desktop.app-folders.folder', '/org/gnome/desktop/app-folders/folders/' + currentTarget + '/');

        //Get folder name and attempt to translate
        displayName = targetFolderSettings.get_string('name');
        if (targetFolderSettings.get_boolean('translate')) {
          let translation = Shell.util_get_translated_folder_name(displayName);
          if (translation !== null) {
            displayName = translation;
          }
        }

      } else { //App
        let appInfo = this._appSystem.lookup_app(currentTarget);
        if (appInfo != null) {
          displayName = appInfo.get_name();
        }
      }

      inputArray[i] = new String(displayName);
      inputArray[i].desktopFile = currentTarget;
    });

    function caseInsensitiveSort(a, b) {
      a = a.toLowerCase();
      b = b.toLowerCase();
      if(a > b) {
        return 1;
      } else if(a < b) {
        return -1;
      } else {
        return 0;
      }
    }

    //Alphabetically sort the folder's contents, by the display name
    inputArray.sort(caseInsensitiveSort);

    //Replace each element with the app's .desktop filename
    inputArray.forEach((currentTarget, i) => { inputArray[i] = currentTarget.desktopFile; });

    return inputArray;
  }

  _appListToPages(itemList) {
    const itemsPerPage = AppDisplay._grid.itemsPerPage;
    let rawPages = [];

    //Split itemList into pages of items
    itemList.forEach((item, i) => {
      const page = Math.floor(i / itemsPerPage);
      const position = i % itemsPerPage;
      if (position == 0) {
        rawPages.push([]);
      }
      rawPages[page].push(item);
    });

    //Create GVariant of packed pages for all grid items
    let appPages = [];
    rawPages.forEach((page, index) => {
      let pageData = {};
      page.forEach((currentItem, i) => {
        pageData[currentItem] = new GLib.Variant('a{sv}', {
          'position': new GLib.Variant('i', i),
        });
      });
      appPages.push(pageData);
    });

    return appPages;
  }

  _getGridOrder(folderPosition) {
    //Get array of all grid items and save the ids
    let itemList = AppDisplay._loadApps();
    itemList.forEach((item, i) => {
      itemList[i] = item.id;
    });

    //Get list of potential folders (each folder may not exist, as it's empty)
    let potentialFolders = this.folderSettings.get_value('folder-children').get_strv();
    let folderArray = [];

    //If folders need to be ordered separately, split them out of itemList into folderArray
    if (folderPosition != 'alphabetical') {
      potentialFolders.forEach((potentialFolder, i) => {
        if (itemList.includes(potentialFolder)) {
          folderArray.push(potentialFolder);
          itemList.splice(itemList.indexOf(potentialFolder), 1);
        }
      });
    }

    //Sort itemList alphabetically
    itemList = this._orderByDisplayName(itemList);

    //If folderAttay isn't empty, sort it and add to correct position in itemList
    if (folderArray.length) {
      //Sort folderArray
      folderArray = this._orderByDisplayName(folderArray);
      //Add to start or end  of itemList
      if (folderPosition == 'start') {
        itemList = folderArray.concat(itemList);
      } else if (folderPosition == 'end') {
        itemList.push(...folderArray);
      }
    }

    //Send itemList to _appListToPages() to be packaged into pages
    itemList = this._appListToPages(itemList);
    return itemList;
  }

  reorderGrid() {
    //Alphabetically order the contents of each folder, if enabled
    if (this.extensionSettings.get_boolean('sort-folder-contents') == true) {
      this._reorderFolderContents();
    }

    //Alphabetically order the grid
    if (this.shellSettings.is_writable('app-picker-layout')) {
      //Get the desired order of the grid, including folders
      let folderPositionSetting = this.extensionSettings.get_string('folder-order-position');
      let gridOrder = this._getGridOrder(folderPositionSetting);
      this.shellSettings.set_value('app-picker-layout', new GLib.Variant('aa{sv}', gridOrder));

      //Trigger a refresh of the app grid, if enabled
      if (this.extensionSettings.get_boolean('auto-refresh-grid') == true) {
        this._logMessage(_('Automatic grid refresh enabled, refreshing grid'));
        AppGridHelper.reloadAppGrid(AppDisplay);
      }

      this._logMessage(_('Reordered grid'));
    } else {
      this._logMessage(_('org.gnome.shell app-picker-layout is unwritable, skipping reorder'));
    }
  }

  //Helper functions

  _checkUpdatingLock(logMessage) {
    //Detect lock to avoid multiple changes at once
    if (this._currentlyUpdating == false) {
      this._currentlyUpdating = true;

      this._logMessage(logMessage);
      this.reorderGrid();

      this._currentlyUpdating = false;
    }
  }

  //Create listeners to trigger reorders of the grid when needed

  waitForFolderChange() {
    //If a folder was made or deleted, trigger a reorder
    this.foldersChangedSignal = this.folderSettings.connect('changed::folder-children', () => {
      this._checkUpdatingLock(_('Folders changed, triggering reorder'));
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
}
