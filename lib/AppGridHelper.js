//Local extension imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { ExtensionHelper } = Me.imports.lib;
const ShellVersion = ExtensionHelper.shellVersion;

//Main imports
const { GLib, Gio, Shell } = imports.gi;
const Main = imports.ui.main;

//Access required objects and systems
const AppDisplay = ShellVersion < 40 ? Main.overview.viewSelector.appDisplay : Main.overview._overview._controls._appDisplay;
const AppSystem = new Shell.AppSystem();

let folderSettings = ExtensionUtils.getSettings('org.gnome.desktop.app-folders');

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
}

//Returns an ordered version of 'inputArray', ordered by display name
//inputArray should be an array of app ids
function orderByDisplayName(inputArray) {
  let outputArray = [];

  //Loop through array contents and get their display names
  inputArray.forEach((currentTarget, i) => {
    let folderArray = folderSettings.get_value('folder-children').get_strv();
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
      let appInfo = AppSystem.lookup_app(currentTarget);
      if (appInfo != null) {
        displayName = appInfo.get_name();
      }
    }

    //If the display name was found, add to outputArray
    if (displayName !== '') {
      outputArray.push(new String(displayName));
      outputArray[outputArray.length - 1].desktopFile = currentTarget;
    }
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

//Packs an array of apps and folders into pages, returns the pages
function appListToPages(itemList) {
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
  rawPages.forEach((page) => {
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

//Returns an alphabetically ordered app grid, respection extension settings
function getGridOrder(folderPosition) {
  //Get array of all grid items and save the ids
  let itemList = AppDisplay._loadApps();
  itemList.forEach((item, i) => {
    itemList[i] = item.id;
  });

  //Get list of potential folders (each folder may not exist, as it's empty)
  let potentialFolders = folderSettings.get_value('folder-children').get_strv();
  let folderArray = [];

  //If folders need to be ordered separately, split them out of itemList into folderArray
  if (folderPosition != 'alphabetical') {
    potentialFolders.forEach((potentialFolder) => {
      if (itemList.includes(potentialFolder)) {
        folderArray.push(potentialFolder);
        itemList.splice(itemList.indexOf(potentialFolder), 1);
      }
    });
  }

  //Sort itemList alphabetically
  itemList = orderByDisplayName(itemList);

  //If folderArray isn't empty, sort it and add to correct position in itemList
  if (folderArray.length) {
    //Sort folderArray
    folderArray = orderByDisplayName(folderArray);
    //Add to start or end  of itemList
    if (folderPosition == 'start') {
      itemList = folderArray.concat(itemList);
    } else if (folderPosition == 'end') {
      itemList.push(...folderArray);
    }
  }

  //Send itemList to appListToPages() to be packaged into pages
  itemList = appListToPages(itemList);
  return itemList;
}

function alphabeticalSort(a, b) {
  let aName = a.name.toLowerCase();
  let bName = b.name.toLowerCase();
  return aName.localeCompare(bName);
}

function compareItems(a, b, folderPosition, folderArray) {
  //Skip extra steps if a regular alphabetical order is required
  if (folderPosition == 'alphabetical') {
    return alphabeticalSort(a, b);
  }

  let isAFolder = folderArray.includes(a._id) ? true : false;
  let isBFolder = folderArray.includes(b._id) ? true : false;

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

function reloadAppGrid() {
  //Array of apps, sorted according to extension preferences
  let apps = AppDisplay._loadApps().sort(AppDisplay._compareItems.bind(AppDisplay));
  const { itemsPerPage } = AppDisplay._grid;

  //Move each app to correct grid postion
  apps.forEach((icon, i) => {
    const page = Math.floor(i / itemsPerPage);
    const position = i % itemsPerPage;
    AppDisplay._moveItem(icon, page, position);
  });

  //Emit 'view-loaded' signal
  AppDisplay.emit('view-loaded');
}
