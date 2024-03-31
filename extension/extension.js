/* exported AppGridManager */

//Local imports
import * as AppGridHelper from './lib/AppGridHelper.js';

//Main imports
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';

import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as OverviewControls from 'resource:///org/gnome/shell/ui/overviewControls.js';

//Extension system imports
import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';

//Access required objects and systems
const Controls = Main.overview._overview._controls;

export default class AppGridManager extends Extension {
  enable() {
    let extensionSettings = this.getSettings();

    //Patch shell, setup listeners and reorder
    this._gridReorder = new AppGridExtension(extensionSettings);
    this._gridReorder.reorderGrid('Reordering app grid');
  }

   disable() {
    //Disconnect from events, unpatch shell and clean up
    this._gridReorder.destroy();
    this._gridReorder = null;
  }
}

class AppGridExtension {
  constructor(extensionSettings) {
    this._injectionManager = new InjectionManager();
    this._appSystem = Shell.AppSystem.get_default();
    this._appDisplay = Controls._appDisplay;

    this._extensionSettings = extensionSettings;
    this._shellSettings = new Gio.Settings({schema: 'org.gnome.shell'});
    this._folderSettings = new Gio.Settings({schema: 'org.gnome.desktop.app-folders'});

    this._loggingEnabled = this._extensionSettings.get_boolean('logging-enabled');
    this._currentlyUpdating = false;

    this._patchShell();
    this._connectListeners();
  }

  reorderGrid(logText) {
    //Detect lock to avoid multiple changes at once
    if (!this._currentlyUpdating && !this._appDisplay._pageManager._updatingPages) {
      this._currentlyUpdating = true;
      this._debugMessage(logText);

      //Alphabetically order the contents of each folder, if enabled
      if (this._extensionSettings.get_boolean('sort-folder-contents')) {
        this._debugMessage('Reordering folder contents');
        AppGridHelper.reorderFolderContents.call(this);
      }

      //Wait a small amount of time to avoid clashing with animations
      this._reorderGridTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
        //Redisplay the app grid
        this._appDisplay._redisplay();

        //Release the lock and clean up
        this._currentlyUpdating = false;
        this._reorderGridTimeoutId = null;
        return GLib.SOURCE_REMOVE;
      });
    }
  }

  destroy() {
    Main.overview.disconnectObject(this);
    Controls._stateAdjustment.disconnectObject(this);
    this._appSystem.disconnectObject(this);
    this._shellSettings.disconnectObject(this);
    this._extensionSettings.disconnectObject(this);
    this._folderSettings.disconnectObject(this);

    //Clean up timeout sources
    if (this._reorderGridTimeoutId != null) {
      GLib.Source.remove(this._reorderGridTimeoutId);
    }

    this._debugMessage('Disconnected from listeners / timeouts');

    //Unpatch the internal functions for extension shutdown
    this._injectionManager.clear();
    this._debugMessage('Unpatched item comparison');
    this._debugMessage('Unpatched redisplay');
  }

  _debugMessage(message) {
    if (this._loggingEnabled) {
      let date = new Date();
      let timestamp = date.toTimeString().split(' ')[0];
      log('alphabetical-app-grid [' + timestamp + ']: ' + message);
    }
  }

  _patchShell() {
    //Patch the app comparison
    this._injectionManager.overrideMethod(AppDisplay.AppDisplay.prototype,
      '_compareItems', () => {
        this._debugMessage('Patching _compareItems');

        //Patched version of _compareItems(), to apply custom order
        let extensionSettings = this._extensionSettings;
        let folderSettings = this._folderSettings;
        return function _compareItemsWrapper(a, b) {
          let folderPosition = extensionSettings.get_string('folder-order-position');
          let folderArray = folderSettings.get_value('folder-children').get_strv();
          return AppGridHelper.compareItems.call(this, a, b, folderPosition, folderArray);
        };
      });

    //Patch the app grid redisplay
    this._injectionManager.overrideMethod(AppDisplay.AppDisplay.prototype,
      '_redisplay', () => {
        this._debugMessage('Patching _redisplay');
        return AppGridHelper.reloadAppGrid;
      });
  }

  _connectListeners() {
    //Connect to gsettings and wait for the order or favourites to change
    this._shellSettings.connectObject(
      'changed::app-picker-layout',
      () => this.reorderGrid('App grid layout changed, triggering reorder'),
      'changed::favorite-apps',
      () => this.reorderGrid('Favourite apps changed, triggering reorder'),
      this);

    //Connect to the main overview and wait for an item to be dragged
    this._dragReorderSignal = Main.overview.connectObject('item-drag-end',
      () => this.reorderGrid('App movement detected, triggering reorder'),
      this);

    //Reorder when a folder is made or destroyed
    this._folderSettings.connectObject('changed::folder-children',
      () => this.reorderGrid('Folders changed, triggering reorder'),
      this);

    //Reorder when installed apps change
    this._appSystem.connectObject('installed-changed',
      () => this.reorderGrid('Installed apps changed, triggering reorder'),
      this);

    //Connect to gsettings and wait for the extension's settings to change
    this._extensionSettings.connectObject('changed', () => {
      this._loggingEnabled = this._extensionSettings.get_boolean('logging-enabled');
      this.reorderGrid('Extension gsettings values changed, triggering reorder');
    }, this);

    //Reorder when the app grid is opened
    Controls._stateAdjustment.connectObject('notify::value', () => {
      if (Controls._stateAdjustment.value == OverviewControls.ControlsState.APP_GRID) {
        this.reorderGrid('App grid opened, triggering reorder');
      }
    }, this);

    this._debugMessage('Connected to listeners');
  }
}
