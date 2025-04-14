// Main imports
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

// Helper: Sort alphabetically
function alphabeticalSort(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}

// Reorders folder contents; called with "this" as the extension's instance
export function reorderFolderContents() {
    const folderArray = this._folderSettings.get_value('folder-children').get_strv();

    folderArray.forEach((folderName) => {
        const folderSettingsPath = `/org/gnome/desktop/app-folders/folders/${folderName}/`;
        const folderContentsSettings = Gio.Settings.new_with_path('org.gnome.desktop.app-folders.folder', folderSettingsPath);
        let folderContents = folderContentsSettings.get_value('apps').get_strv();

        // Reorder contents alphabetically
        folderContents = orderByDisplayName(this._appSystem, folderContents);

        // Update settings only if the order changed
        const currentOrder = folderContentsSettings.get_value('apps').get_strv();
        if (String(currentOrder) !== String(folderContents) && folderContentsSettings.is_writable('apps')) {
            folderContentsSettings.set_value('apps', new GLib.Variant('as', folderContents));
        }
    });

    // Refresh folder icons
    this._appDisplay._folderIcons.forEach((folder) => folder.view._redisplay());
}

// Order an array of app IDs by their display names
function orderByDisplayName(appSystem, inputArray) {
    const outputArray = inputArray.map((appId) => {
        const appInfo = appSystem.lookup_app(appId);
        const displayName = appInfo ? appInfo.get_name() : '';
        return { displayName, appId };
    });

    // Sort by display name and return the ordered app IDs
    return outputArray
        .sort((a, b) => alphabeticalSort(a.displayName, b.displayName))
        .map(({ appId }) => appId);
}

// Custom sorting logic for items
export function compareItems(a, b, folderPosition, folderArray) {
    const isAFolder = folderArray.includes(a._id);
    const isBFolder = folderArray.includes(b._id);

    if (folderPosition === 'alphabetical' || isAFolder === isBFolder) {
        return alphabeticalSort(a.name, b.name);
    }

    // Position folders based on preference ('start' or 'end')
    return folderPosition === 'start' ^ isAFolder ? 1 : -1;
}

// Refresh the app grid display with custom ordering
export function reloadAppGrid() {
    // Refresh folder views
    this._folderIcons.forEach((icon) => icon.view._redisplay());

    const currentApps = [...this._orderedItems];
    const currentAppIds = currentApps.map((icon) => icon.id);
    const newApps = this._loadApps().sort(this._compareItems.bind(this));
    const newAppIds = newApps.map((icon) => icon.id);

    // Identify added and removed apps
    const addedApps = newApps.filter((icon) => !currentAppIds.includes(icon.id));
    const removedApps = currentApps.filter((icon) => !newAppIds.includes(icon.id));

    // Remove old apps
    removedApps.forEach((icon) => {
        this._removeItem(icon);
        icon.destroy();
    });

    // Reposition apps in the grid
    const { itemsPerPage } = this._grid;
    newApps.forEach((icon, index) => {
        const page = Math.floor(index / itemsPerPage);
        const position = index % itemsPerPage;

        if (addedApps.includes(icon)) {
            this._addItem(icon, page, position);
        } else {
            this._moveItem(icon, page, position);
        }
    });

    this._orderedItems = newApps;

    // Emit 'view-loaded' signal
    this.emit('view-loaded');
}
