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
function orderByDisplayName(inputArray) {
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

    inputArray[i] = new String(displayName);
    inputArray[i].desktopFile = currentTarget;
  });

  //Alphabetically sort the folder's contents, by the display name
  inputArray.sort((a, b) => {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if(a > b) {
      return 1;
    } else if(a < b) {
      return -1;
    }
    return 0;
  });

  //Replace each element with the app's .desktop filename
  inputArray.forEach((currentTarget, i) => { inputArray[i] = currentTarget.desktopFile; });
  return inputArray;
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

function reloadAppGrid() {
  //Reload app grid to apply any pending changes
  AppDisplay._pageManager._loadPages();
  AppDisplay._redisplay();

  const { itemsPerPage } = AppDisplay._grid;
  //Array of apps, sorted alphabetically
  let apps = AppDisplay._loadApps().sort(AppDisplay._compareItems.bind(AppDisplay));

  //Move each app to correct grid postion
  apps.forEach((icon, i) => {
    const page = Math.floor(i / itemsPerPage);
    const position = i % itemsPerPage;
    AppDisplay._moveItem(icon, page, position);
  });

  //Emit 'view-loaded' signal
  AppDisplay.emit('view-loaded');
}
