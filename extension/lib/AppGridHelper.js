/* exported reorderFolderContents compareItems reloadAppGrid */

//Main imports
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

//Helpers to provide alphabetical ordering
function alphabeticalSort(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  return a.localeCompare(b);
}

//Reorders folder contents, called with this as the extension's instance
export function reorderFolderContents() {
  //Get array of folders from 'folder-children' key
  let folderArray = this._folderSettings.get_value('folder-children').get_strv();

  //Loop through all folders, and reorder their contents
  folderArray.forEach((targetFolder) => {
    //Get the contents of the folder, from gsettings value
    let folderContentsSettings = Gio.Settings.new_with_path('org.gnome.desktop.app-folders.folder', '/org/gnome/desktop/app-folders/folders/' + targetFolder + '/');
    let folderContents = folderContentsSettings.get_value('apps').get_strv();

    //Reorder the contents of the folder
    folderContents = orderByDisplayName(this._appSystem, folderContents);

    //Set the gsettings value for 'apps' to the ordered list
    let currentOrder = folderContentsSettings.get_value('apps').get_strv();
    if (String(currentOrder) != String(folderContents)) {
      if (folderContentsSettings.is_writable('apps')) {
        folderContentsSettings.set_value('apps', new GLib.Variant('as', folderContents));
      }
    }
  });

  //Refresh the folders
  this._appDisplay._folderIcons.forEach((folder) => {
    folder.view._redisplay();
  });
}

//Returns an ordered version of 'inputArray', ordered by display name
//inputArray should be an array of app ids
function orderByDisplayName(appSystem, inputArray) {
  let outputArray = [];

  //Loop through array contents and get their display names
  inputArray.forEach((currentTarget) => {
    let displayName;
    let appInfo = appSystem.lookup_app(currentTarget);
    if (appInfo != null) {
      displayName = appInfo.get_name();
    }

    //Add item to outputArray, saving the id as a property
    outputArray.push(new String(displayName));
    outputArray[outputArray.length - 1].desktopFile = currentTarget;
  });

  //Alphabetically sort the folder's contents, by the display name
  outputArray.sort(alphabeticalSort);

  //Replace each element with the app's .desktop filename
  outputArray.forEach((currentTarget, i) => {outputArray[i] = currentTarget.desktopFile;});
  return outputArray;
}

//Replaces shell's _compareItems() to provide custom order
export function compareItems(a, b, folderPosition, folderArray) {
  //Skip extra steps if a regular alphabetical order is required
  if (folderPosition === 'alphabetical') {
    return alphabeticalSort(a.name, b.name);
  }

  let isAFolder = folderArray.includes(a._id);
  let isBFolder = folderArray.includes(b._id);

  //If they're both folders or both apps, order alphabetically
  if (isAFolder == isBFolder) {
    return alphabeticalSort(a.name, b.name);
  }

  //If one is a folder, move it to the configured position
  return (folderPosition === 'start') ^ isAFolder ? 1 : -1;
}

//Called during custom _redisplay()
export function reloadAppGrid() {
  //Refresh folders
  this._folderIcons.forEach((icon) => {
    icon.view._redisplay();
  });

  //Existing apps
  let currentApps = this._orderedItems.slice();
  let currentAppIds = currentApps.map(icon => icon.id);

  //Array of apps, sorted according to extension preferences
  let newApps = this._loadApps().sort(this._compareItems.bind(this));
  let newAppIds = newApps.map(icon => icon.id);

  //Compare the 2 sets of apps
  let addedApps = newApps.filter(icon => !currentAppIds.includes(icon.id));
  let removedApps = currentApps.filter(icon => !newAppIds.includes(icon.id));

  //Clear removed apps
  removedApps.forEach((icon) => {
    this._removeItem(icon);
    icon.destroy();
  });

  //Move each app to the correct grid postion
  const {itemsPerPage} = this._grid;
  newApps.forEach((icon, i) => {
    const page = Math.floor(i / itemsPerPage);
    const position = i % itemsPerPage;

    if (addedApps.includes(icon)) {
      this._addItem(icon, page, position);
    } else {
      this._moveItem(icon, page, position);
    }
  });

  this._orderedItems = newApps;

  //Emit 'view-loaded' signal
  this.emit('view-loaded');
}
