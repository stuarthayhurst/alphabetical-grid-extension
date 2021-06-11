const {GLib, Gio, Shell} = imports.gi;
const Main = imports.ui.main;
const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

//Get GNOME shell version
const shellVersion = Number.parseInt(Config.PACKAGE_VERSION.split('.'));
//Get access to appDisplay
const AppDisplay = shellVersion < 40 ? Main.overview.viewSelector.appDisplay : Main.overview._overview._controls._appDisplay;

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
  gridReorder.folderSettings.disconnect(gridReorder.folderSignal);
  gridReorder.folderSettings.disconnect(gridReorder.settingsChangedSignal);
  gridReorder = null;
}

class Extension {
  constructor() {
    //Load gsettings values for GNOME Shell, to access 'app-picker-layout'
    this.shellSettings = ExtensionUtils.getSettings('org.gnome.shell');
    //Load gsettings values for folders, to access 'folder-children'
    this.folderSettings = ExtensionUtils.getSettings('org.gnome.desktop.app-folders');
    //Load gsettings values for the extension itself
    this._extensionSettings = ExtensionUtils.getSettings();
    //Create AppSystem
    this._appSystem = new Shell.AppSystem();
    //Create a lock to prevent code fighting itself to change gsettings
    this._currentlyUpdating = false;
  }

  _logMessage(message) {
    log('alphabetical-app-grid: ' + message);
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
      //Decide if it's an app or a folder
      let folderArray = this.folderSettings.get_value('folder-children').get_strv();
      let displayName;

      if (folderArray.includes(currentTarget)) { //Folder
        let targetFolderSettings = Gio.Settings.new_with_path('org.gnome.desktop.app-folders.folder', '/org/gnome/desktop/app-folders/folders/' + currentTarget + '/');
        displayName = targetFolderSettings.get_string('name');
      } else { //App
        //Lookup display name of each app
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
    if (this._extensionSettings.get_boolean('sort-folder-contents') == true) {
      this._reorderFolderContents();
    }

    //Alphabetically order the grid
    if (this.shellSettings.is_writable('app-picker-layout')) {
      //Get the desired order of the grid, including folders
      let folderPositionSetting = this._extensionSettings.get_string('folder-order-position');
      let gridOrder = this._getGridOrder(folderPositionSetting);
      this.shellSettings.set_value('app-picker-layout', new GLib.Variant('aa{sv}', gridOrder));

      //Trigger a refresh of the app grid (use call() so 'this' applies to AppDisplay)
      this._reloadAppDisplay.call(AppDisplay);

      this._logMessage(_('Reordered grid'));
    } else {
      this._logMessage(_('org.gnome.shell app-picker-layout is unwritable, skipping reorder'));
    }
  }

  _checkUpdatingLock(logMessage) {
    //Detect lock to avoid multiple changes at once
    if (this._currentlyUpdating == false) {
      this._currentlyUpdating = true;

      this._logMessage(logMessage);
      this.reorderGrid();

      this._currentlyUpdating = false;
    }
  }

  waitForFolderChange() {
    //If a folder was made or deleted, trigger a reorder
    this.folderSignal = this.folderSettings.connect('changed::folder-children', () => {
      this._checkUpdatingLock(_('Folders changed, triggering reorder'));
    });
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
    this.settingsChangedSignal = this._extensionSettings.connect('changed', () => {
      this._checkUpdatingLock(_('Extension gsettings values changed, triggering reorder'));
    });
  }

  _reloadAppDisplay() {
    //Reload app grid to apply any pending changes
    this._pageManager._loadPages();
    this._redisplay();

    const { itemsPerPage } = this._grid;
    //Array of apps, sorted alphabetically
    let apps = this._loadApps().sort(this._compareItems.bind(this));

    //Move each app to correct grid postion
    apps.forEach((icon, index) => {
      const page = Math.floor(index / itemsPerPage);
      const position = index % itemsPerPage;
      this._moveItem(icon, page, position);
    });

    //Emit 'view-loaded' signal
    this.emit('view-loaded');
  }
}
