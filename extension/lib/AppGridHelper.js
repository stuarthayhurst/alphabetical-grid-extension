/* exported AppDisplay reorderFolderContents compareItems reloadAppGrid */

//Local extension imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { ExtensionHelper } = Me.imports.lib;
const ShellVersion = ExtensionHelper.shellVersion;

//Main imports
const { GLib, Gio, Shell } = imports.gi;
const Main = imports.ui.main;

//Get access to the AppDisplay, also used by extension.js
var AppDisplay = ShellVersion >= 40 ? Main.overview._overview._controls._appDisplay : Main.overview.viewSelector.appDisplay;

let folderSettings = new Gio.Settings( {schema: 'org.gnome.desktop.app-folders'} );

//Reorders folder contents
function reorderFolderContents() {
  //Get array of folders from 'folder-children' key
  let folderArray = folderSettings.get_value('folder-children').get_strv();

  //Loop through all folders, and reorder their contents
  folderArray.forEach((targetFolder) => {
    //Get the contents of the folder, from gsettings value
    let folderContentsSettings = Gio.Settings.new_with_path('org.gnome.desktop.app-folders.folder', '/org/gnome/desktop/app-folders/folders/' + targetFolder + '/');
    let folderContents = folderContentsSettings.get_value('apps').get_strv();

    //Reorder the contents of the folder
    folderContents = orderByDisplayName(folderContents);

    //Set the gsettings value for 'apps' to the ordered list
    let currentOrder = folderContentsSettings.get_value('apps').get_strv();
    if (String(currentOrder) != String(folderContents)) {
      if (folderContentsSettings.is_writable('apps')) {
        folderContentsSettings.set_value('apps', new GLib.Variant('as', folderContents));
      }
    }
  });

  //Refresh the folders
  AppDisplay._folderIcons.forEach((folder) => {
    folder.view._redisplay();
  });
}

//Returns an ordered version of 'inputArray', ordered by display name
//inputArray should be an array of app ids
function orderByDisplayName(inputArray) {
  let outputArray = [];

  //Loop through array contents and get their display names
  inputArray.forEach((currentTarget) => {
    let displayName;

    let appInfo = Shell.AppSystem.get_default().lookup_app(currentTarget);
    if (appInfo != null) {
      displayName = appInfo.get_name();
    }

    //Add item to outputArray, saving the id as a property
    outputArray.push(new String(displayName));
    outputArray[outputArray.length - 1].desktopFile = currentTarget;
  });

  //Alphabetically sort the folder's contents, by the display name
  outputArray.sort((a, b) => {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a.localeCompare(b);
  });

  //Replace each element with the app's .desktop filename
  outputArray.forEach((currentTarget, i) => { outputArray[i] = currentTarget.desktopFile; });
  return outputArray;
}

//Helper to provide alphabetical ordering
function alphabeticalSort(a, b) {
  let aName = a.name.toLowerCase();
  let bName = b.name.toLowerCase();
  return aName.localeCompare(bName);
}

//Replaces shell's _compareItems() to provide custom order
function compareItems(a, b, folderPosition, folderArray) {
  //Skip extra steps if a regular alphabetical order is required
  if (folderPosition == 'alphabetical') {
    return alphabeticalSort(a, b);
  }

  let isAFolder = folderArray.includes(a._id);
  let isBFolder = folderArray.includes(b._id);

  //If they're both folders or both apps, order alphabetically
  if (isAFolder == isBFolder) {
    return alphabeticalSort(a, b);
  }

  //If one is a folder, move it to the configured position
  if (isAFolder) { //Item a is the folder
    if (folderPosition == 'start') {
      return -1; //Move a before b
    } else {
      return 1; //Move a after b
    }
  } else { //Item b is the folder
    if (folderPosition == 'start') {
      return 1; //Move a after b
    } else {
      return -1; //Move a before b
    }
  }
}

//Called during custom _redisplay()
function reloadAppGrid() {
  //Array of apps, sorted according to extension preferences
  let apps = this._loadApps().sort(this._compareItems.bind(this));
  const { itemsPerPage } = this._grid;

  //Move each app to correct grid postion
  apps.forEach((icon, i) => {
    const page = Math.floor(i / itemsPerPage);
    const position = i % itemsPerPage;
    this._moveItem(icon, page, position);
  });

  //Emit 'view-loaded' signal
  this.emit('view-loaded');
}
