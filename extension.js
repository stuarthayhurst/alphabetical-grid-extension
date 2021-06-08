const {GLib, Gio, Shell} = imports.gi;
const Main = imports.ui.main;
const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

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
    //Get access to appDisplay
    this._appDisplay = Main.overview._overview._controls._appDisplay;
    //Get GNOME shell version
    this._shellVersion = Number.parseInt(Config.PACKAGE_VERSION.split('.'));
    //Create AppSystem
    this._appSystem = new Shell.AppSystem();
    //Create a lock to prevent code fighting itself to change gsettings
    this._currentlyUpdating = false;
    //Array of empty folders to ignore
    this._ignoredFolders = [];
  }

  _logMessage(message) {
    log('alphabetical-app-grid: ' + message);
  }

  //Called by reorderGrid()
  _reorderFolderContents(dryrun) {
    this._logMessage(_('Reordering folder contents'));

    //Get array of folders from 'folder-children' key
    let folderArray = this.folderSettings.get_value('folder-children').get_strv();

    //Loop through all folders, and reorder their contents
    folderArray.forEach((targetFolder, i) => {
      //Get the contents of the folder, from gsettings value
      let folderContentsSettings = Gio.Settings.new_with_path('org.gnome.desktop.app-folders.folder', '/org/gnome/desktop/app-folders/folders/' + targetFolder + '/');
      let folderContents = folderContentsSettings.get_value('apps').get_strv();
      folderContents = this._orderByDisplayName(folderContents);

      //If the folder is empty, delete it
      if (String(folderContents) == "") {
        this._ignoredFolders.push(targetFolder);
      }

      //Return early if no changes should be made
      if (dryrun == true) {
        return;
      }

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
    let numRemovedApps = 0;
    inputArray.forEach((currentTarget, i) => {
      //Decide if it's an app or a folder
      let folderArray = this.folderSettings.get_value('folder-children').get_strv();
      let removeTarget = false;
      let displayName;

      if (folderArray.includes(currentTarget)) { //Folder
        if (!this._ignoredFolders.includes(currentTarget)) { //Folder isn't empty
          let targetFolderSettings = Gio.Settings.new_with_path('org.gnome.desktop.app-folders.folder', '/org/gnome/desktop/app-folders/folders/' + currentTarget + '/');
          displayName = targetFolderSettings.get_string('name');
        } else { //Folder is empty
          removeTarget = true;
        }
      } else { //App
        //Lookup display name of each app
        let appInfo = this._appSystem.lookup_app(currentTarget);
        if (appInfo != null) {
          displayName = appInfo.get_name();
        } else { //App doesn't exist, so remove from array
          removeTarget = true;
        }
      }
      if (removeTarget == false) {
        inputArray[i - numRemovedApps] = new String(displayName);
        inputArray[i - numRemovedApps].desktopFile = currentTarget;
      } else { //App doesn't exist, so remove from array
        inputArray = inputArray.filter(element => element != currentTarget);
        numRemovedApps += 1;
      }
    });

    //Alphabetically sort the folder's contents, by the display name
    inputArray.sort();

    //Replace each element with the app's .desktop filename
    inputArray.forEach((currentTarget, i) => { inputArray[i] = currentTarget.desktopFile; });

    return inputArray;
  }

  _moveFolders(position) {
    //Get list of folders
    let folderArray = this.folderSettings.get_value('folder-children').get_strv();

    //Filter out ignored folders and alphabetically order
    folderArray = this._orderByDisplayName(folderArray);

    //Create GVariant to set folder positions
    let pages = [];
    let variantDict = {};
    if (position == 'start') {
      folderArray.forEach((currentFolder, i) => {
        variantDict[currentFolder] = new GLib.Variant('a{sv}', {
          'position': new GLib.Variant('i', i),
        });
      });
      pages.push(variantDict);
    }

    this.shellSettings.set_value('app-picker-layout', new GLib.Variant('aa{sv}', pages));
  }

  reorderGrid() {
    //Alphabetically order the contents of each folder, if enabled
    this._reorderFolderContents(!this._extensionSettings.get_boolean('sort-folder-contents'));

    //Alphabetically order the grid, by blanking the gsettings value for 'app-picker-layout'
    if (this.shellSettings.is_writable('app-picker-layout')) {
      //Reset app grid layout gsettings value
      this.shellSettings.set_value('app-picker-layout', new GLib.Variant('aa{sv}', []));

      let folderPositionSetting = this._extensionSettings.get_string('folder-order-position');
      if (folderPositionSetting != 'alphabetical') {
        //Set positions folders to the configured position
        this._moveFolders(folderPositionSetting);
      }

      //Trigger a refresh of the app grid, if shell version is greater than 40
      if (this._shellVersion < 40) {
        this._logMessage(_('Running GNOME shell 3.38 or lower, skipping reload'));
      } else {
        //Use call() so 'this' applies to this._appDisplay
        this._reloadAppDisplay.call(this._appDisplay);
      }

      this._logMessage(_('Reordered grid'));
    } else {
      this._logMessage(_('org.gnome.shell app-picker-layout is unwritable, skipping reorder'));
    }
  }

  waitForFolderChange() {
    //If a folder was made or deleted, trigger a reorder
    this.folderSignal = this.folderSettings.connect('changed::folder-children', () => {
      if (this._currentlyUpdating == false) { //Detect lock to avoid multiple changes at once
        this._currentlyUpdating = true;

        this._logMessage(_('Folders changed, triggering reorder'));
        this.reorderGrid();

        this._currentlyUpdating = false;
      }
    });
  }

  waitForExternalReorder() {
    //Connect to gsettings and wait for the order to change
    this.reorderSignal = this.shellSettings.connect('changed::app-picker-layout', () => {
      if (this._currentlyUpdating == false) { //Detect lock to avoid multiple changes at once
        this._currentlyUpdating = true;

        this._logMessage(_('App grid layout changed, triggering reorder'));
        this.reorderGrid();

        this._currentlyUpdating = false;
      }
    });
  }

  waitForFavouritesChange() {
    //Connect to gsettings and wait for the favourite apps to change
    this.favouriteAppsSignal = this.shellSettings.connect('changed::favorite-apps', () => {
      if (this._currentlyUpdating == false) { //Detect lock to avoid multiple changes at once
        this._currentlyUpdating = true;

        //When the favourites changed, reorder the grid
        this._logMessage(_('Favourite apps changed, triggering reorder'));
        this.reorderGrid();

        this._currentlyUpdating = false;
      }
    });
  }

  waitForSettingsChange() {
    //Connect to gsettings and wait for the favourite apps to change
    this.folderContentsSignal = this._extensionSettings.connect('changed', () => {
      if (this._currentlyUpdating == false) { //Detect lock to avoid multiple changes at once
        this._currentlyUpdating = true;

        //When the favourites changed, reorder the grid
        this._logMessage(_('Extension gsettings values changed, triggering reorder'));
        this.reorderGrid();

        this._currentlyUpdating = false;
      }
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
