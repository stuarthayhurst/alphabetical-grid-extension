/* exported ExtensionManager */

//Local imports
import * as AppGridHelper from './lib/AppGridHelper.js';

//Main imports
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as OverviewControls from 'resource:///org/gnome/shell/ui/overviewControls.js';

//Extension system imports
import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';

//Access required objects and systems
const AppDisplay = AppGridHelper.AppDisplay;
const Controls = Main.overview._overview._controls;

var loggingEnabled = false;
function logMessage(message) {
  if (loggingEnabled) {
    let date = new Date();
    let timestamp = date.toTimeString().split(' ')[0];
    log('alphabetical-app-grid [' + timestamp + ']: ' + message);
  }
}

export default class ExtensionManager extends Extension {
  enable() {
    this._gridReorder = new AppGridExtension(this.getSettings());
    loggingEnabled = this._gridReorder.extensionSettings.get_boolean('logging-enabled');

    //Patch shell, reorder and trigger listeners
    AppDisplay._redisplay();
    this._gridReorder.patchShell();
    this._gridReorder.startListeners();
    this._gridReorder.reorderGrid('Reordering app grid');
  }

   disable() {
    //Disconnect from events and clean up
    this._gridReorder.disconnectListeners();
    this._gridReorder.unpatchShell();

    this._gridReorder = null;
  }
}

class AppGridExtension {
  constructor(extensionSettings) {
    this._injectionManager = new InjectionManager();
    //Load gsettings values for GNOME Shell
    this.shellSettings = new Gio.Settings( {schema: 'org.gnome.shell'} );
    //Load gsettings values for folders, to access 'folder-children'
    this.folderSettings = new Gio.Settings( {schema: 'org.gnome.desktop.app-folders'} );
    //Load gsettings values for the extension itself
    this.extensionSettings = extensionSettings;
    //Create a lock to prevent code triggering multiple reorders at once
    this._currentlyUpdating = false;
  }

  patchShell() {
    //Patched version of _redisplay() to apply custom order
    function _patchedRedisplay() {
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
    this._injectionManager.overrideMethod(AppDisplay, '_compareItems', _patchedCompareItems);
    logMessage('Patched item comparison');

    this._injectionManager.overrideMethod(AppDisplay, '_redisplay', _patchedRedisplay);
    logMessage('Patched redisplay');
  }

  unpatchShell() {
    //Unpatch the internal functions for extension shutdown
    this._injectionManager.clear();
    logMessage('Unpatched item comparison');
    logMessage('Unpatched redisplay');
  }

  //Helper functions

  reorderGrid(logText) {
    //Detect lock to avoid multiple changes at once
    if (!this._currentlyUpdating && !AppDisplay._pageManager._updatingPages) {
      this._currentlyUpdating = true;
      logMessage(logText);

      //Alphabetically order the contents of each folder, if enabled
      if (this.extensionSettings.get_boolean('sort-folder-contents')) {
        logMessage('Reordering folder contents');
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
    this._reorderOnDisplay();

    logMessage('Connected to listeners');
  }

  disconnectListeners() {
    this.shellSettings.disconnect(this._reorderSignal);
    Main.overview.disconnect(this._dragReorderSignal);
    this.shellSettings.disconnect(this._favouriteAppsSignal);
    this.extensionSettings.disconnect(this._settingsChangedSignal);
    Shell.AppSystem.get_default().disconnect(this._installedAppsChangedSignal);
    this.folderSettings.disconnect(this._foldersChangedSignal);

    if (this._reorderOnDisplaySignal != null) {
      Controls._stateAdjustment.disconnect(this._reorderOnDisplaySignal);
    }

    //Clean up timeout sources
    if (this._reorderGridTimeoutId != null) {
      GLib.Source.remove(this._reorderGridTimeoutId);
    }

    logMessage('Disconnected from listeners');
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

  _reorderOnDisplay() {
    //Reorder when the app grid is opened
    this._reorderOnDisplaySignal = Controls._stateAdjustment.connect('notify::value', () => {
      if (Controls._stateAdjustment.value == OverviewControls.ControlsState.APP_GRID) {
        this.reorderGrid('App grid opened, triggering reorder');
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
      loggingEnabled = this.extensionSettings.get_boolean('logging-enabled');
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
