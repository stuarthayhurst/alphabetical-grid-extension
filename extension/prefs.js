// Main imports
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

// Extension system imports
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const PrefsPage = GObject.registerClass(
    class PrefsPage extends Adw.PreferencesPage {
        _init(pageInfo, groupsInfo, settingsInfo, settings) {
            super._init({
                title: pageInfo[0],
                icon_name: pageInfo[1],
            });

            this._extensionSettings = settings;
            this._settingGroups = {};

            // Initialize settings and groups
            this._initializeGroups(groupsInfo);
            this._initializeSettings(settingsInfo);
        }

        _initializeGroups(groupsInfo) {
            groupsInfo.forEach((groupInfo) => {
                const groupId = groupInfo[0];
                const groupTitle = groupInfo[1];

                this._settingGroups[groupId] = new Adw.PreferencesGroup();
                this._settingGroups[groupId].set_title(groupTitle);
                this.add(this._settingGroups[groupId]);
            });
        }

        _initializeSettings(settingsInfo) {
            settingsInfo.forEach((settingInfo) => {
                const [groupId, key, title, subtitle, extraData] = settingInfo;

                // Validate group existence
                if (!(groupId in this._settingGroups)) return;

                let settingRow;
                if (extraData === null) {
                    // Create a switch row
                    settingRow = this._createSwitchRow(title, subtitle, key);
                } else {
                    // Create a combo row
                    settingRow = this._createComboRow(title, subtitle, key, extraData);
                }

                this._settingGroups[groupId].add(settingRow);
            });
        }

        _createSwitchRow(title, subtitle, key) {
            const switchRow = new Adw.SwitchRow({ title, subtitle });

            this._extensionSettings.bind(
                key,          // GSettings key
                switchRow,    // Bind target
                'active',     // Property to share
                Gio.SettingsBindFlags.DEFAULT
            );

            return switchRow;
        }

        _createComboRow(title, subtitle, key, dropdownOptions) {
            const stringList = new Gtk.StringList();
            dropdownOptions.forEach(([value, label]) => stringList.append(label));

            const comboRow = new Adw.ComboRow({
                title,
                subtitle,
                model: stringList,
            });

            comboRow._dropdownData = dropdownOptions;
            comboRow._settingKey = key;

            comboRow.connect('notify::selected-item', (row) => {
                const index = row.get_selected();
                const value = row._dropdownData[index][0];
                this._extensionSettings.set_string(row._settingKey, value);
            });

            return comboRow;
        }

        addLinks(window, linksInfo, groupName) {
            const linksGroup = new Adw.PreferencesGroup();
            linksGroup.set_title(groupName);
            this.add(linksGroup);

            linksInfo.forEach(([title, subtitle, uri]) => {
                const linkRow = this._createLinkRow(title, subtitle, uri, window);
                linksGroup.add(linkRow);
            });
        }

        _createLinkRow(title, subtitle, uri, window) {
            const linkRow = new Adw.ActionRow({
                title,
                subtitle,
                activatable: true,
            });

            linkRow.connect('activated', () => {
                const uriLauncher = new Gtk.UriLauncher();
                uriLauncher.set_uri(uri);
                uriLauncher.launch(window, null, null);
            });

            return linkRow;
        }
    }
);

export default class AppGridPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const pageInfo = [_('Settings'), 'preferences-system-symbolic'];

        const groupsInfo = [
            ['general', _('General settings')],
            ['developer', _('Developer settings')],
        ];

        const dropdownOptions = [
            ['alphabetical', _('Alphabetical')],
            ['start', _('Start')],
            ['end', _('End')],
        ];

        const settingsInfo = [
            ['general', 'sort-folder-contents', _('Sort folder contents'), _('Sort folder contents alphabetically'), null],
            ['general', 'folder-order-position', _('Folder position'), _('Position folders in the grid'), dropdownOptions],
            ['developer', 'logging-enabled', _('Enable logging'), _('Log extension messages to system logs'), null],
        ];

        const settingsPage = new PrefsPage(pageInfo, groupsInfo, settingsInfo, this.getSettings());

        const linksInfo = [
            [_('Report an issue'), _('GitHub issue tracker'), 'https://github.com/stuarthayhurst/alphabetical-grid-extension/issues'],
            [_('Donate via GitHub'), _('Become a sponsor'), 'https://github.com/sponsors/stuarthayhurst'],
            [_('Donate via PayPal'), _('Thanks for your support'), 'https://www.paypal.me/stuartahayhurst'],
        ];
        settingsPage.addLinks(window, linksInfo, _('Links'));

        window.add(settingsPage);
        window.set_search_enabled(true);
    }
}
