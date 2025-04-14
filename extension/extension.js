// Local imports
import * as AppGridHelper from './lib/AppGridHelper.js';

// Main imports
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as OverviewControls from 'resource:///org/gnome/shell/ui/overviewControls.js';

// Extension system imports
import { Extension, InjectionManager } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class AppGridManager extends Extension {
    enable() {
        this._gridReorder = new AppGridExtension(this.getSettings());
        this._gridReorder.reorderGrid('Reordering app grid');
    }

    disable() {
        this._gridReorder?.destroy();
        this._gridReorder = null;
    }
}

class AppGridExtension {
    constructor(settings) {
        this._initSettings(settings);
        this._initListeners();
        this._patchShell();
    }

    reorderGrid(logText) {
        if (this._currentlyUpdating || this._appDisplay._pageManager._updatingPages) return;

        this._currentlyUpdating = true;
        this._logDebug(logText);

        if (this._settings.get_boolean('sort-folder-contents')) {
            this._logDebug('Reordering folder contents');
            AppGridHelper.reorderFolderContents.call(this);
        }

        this._scheduleReorder();
    }

    destroy() {
        this._disconnectListeners();
        this._injectionManager.clear();
        this._logDebug('Extension cleaned up.');
    }

    _initSettings(settings) {
        this._settings = settings;
        this._injectionManager = new InjectionManager();
        this._appSystem = Shell.AppSystem.get_default();
        this._appDisplay = Main.overview._overview._controls._appDisplay;
        this._shellSettings = new Gio.Settings({ schema: 'org.gnome.shell' });
        this._folderSettings = new Gio.Settings({ schema: 'org.gnome.desktop.app-folders' });
        this._currentlyUpdating = false;
        this._loggingEnabled = this._settings.get_boolean('logging-enabled');
    }

    _initListeners() {
        const reorderGridCallback = (message) => () => this.reorderGrid(message);

        this._shellSettings.connectObject(
            'changed::app-picker-layout', reorderGridCallback('App picker layout changed'),
            'changed::favorite-apps', reorderGridCallback('Favorites updated'), this);

        Main.overview.connectObject(
            'item-drag-end', reorderGridCallback('App movement detected'), this);

        this._folderSettings.connectObject(
            'changed::folder-children', reorderGridCallback('Folder structure changed'), this);

        this._appSystem.connectObject(
            'installed-changed', reorderGridCallback('Apps installed/uninstalled'), this);

        this._settings.connectObject(
            'changed', () => {
                this._loggingEnabled = this._settings.get_boolean('logging-enabled');
                this.reorderGrid('Settings updated');
            }, this);

        Main.overview._overview._controls._stateAdjustment.connectObject(
            'notify::value', () => {
                if (Controls._stateAdjustment.value === OverviewControls.ControlsState.APP_GRID) {
                    this.reorderGrid('App grid opened');
                }
            }, this);

        this._logDebug('Listeners initialized.');
    }

    _patchShell() {
        this._injectionManager.overrideMethod(AppDisplay.AppDisplay.prototype, '_compareItems', () => {
            this._logDebug('Patching _compareItems');
            const { _compareItemsWrapper } = AppGridHelper;
            return _compareItemsWrapper.bind(this);
        });

        this._injectionManager.overrideMethod(AppDisplay.AppDisplay.prototype, '_redisplay', () => {
            this._logDebug('Patching _redisplay');
            return AppGridHelper.reloadAppGrid;
        });
    }

    _disconnectListeners() {
        Main.overview.disconnectObject(this);
        this._appSystem.disconnectObject(this);
        this._shellSettings.disconnectObject(this);
        this._folderSettings.disconnectObject(this);
        this._settings.disconnectObject(this);
        this._logDebug('Listeners disconnected.');
    }

    _scheduleReorder() {
        this._reorderTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._appDisplay._redisplay();
            this._currentlyUpdating = false;
            this._reorderTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _logDebug(message) {
        if (this._loggingEnabled) {
            const timestamp = new Date().toTimeString().split(' ')[0];
            console.log(`[alphabetical-app-grid ${timestamp}]: ${message}`);
        }
    }
}
