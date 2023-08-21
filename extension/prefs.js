/* exported AppGridPrefs */

//Main imports
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

//Extension system imports
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

var PrefsPage = GObject.registerClass(
class PrefsPage extends Adw.PreferencesPage {
  _init(pageInfo, groupsInfo, settingsInfo, settings) {
    super._init({
      title: pageInfo[0],
      icon_name: pageInfo[1]
    });

    this._extensionSettings = settings;
    this._settingGroups = {};
    this._settingRows = {};

    //Setup settings
    this._createGroups(groupsInfo);
    this._createSettings(settingsInfo);
  }

  _createGroups(groupsInfo) {
    //Store groups, set title and add to window
    groupsInfo.forEach((groupInfo) => {
      this._settingGroups[groupInfo[0]] = new Adw.PreferencesGroup();
      this._settingGroups[groupInfo[0]].set_title(groupInfo[1]);
      this.add(this._settingGroups[groupInfo[0]]);
    });
  }

  _createSettings(settingsInfo) {
    settingsInfo.forEach(settingInfo => {
      //Check the target group exists
      if (!(settingInfo[0] in this._settingGroups)) {
        return;
      }

      //Create a row with a switch, title and subtitle
      let settingRow = new Adw.SwitchRow({
        title: settingInfo[2],
        subtitle: settingInfo[3]
      });

      //Connect the switch to the setting
      this._extensionSettings.bind(
        settingInfo[1], //GSettings key to bind to
        settingRow, //Object to bind to
        'active', //The property to share
        Gio.SettingsBindFlags.DEFAULT
      );

      //Add the row to the group, and save for later
      this._settingGroups[settingInfo[0]].add(settingRow);
      this._settingRows[settingInfo[1]] = settingRow;
    });
  }

  addLinks(window, linksInfo, groupName) {
    //Setup and add links group to window
    let linksGroup = new Adw.PreferencesGroup();
    linksGroup.set_title(groupName);
    this.add(linksGroup);

    linksInfo.forEach((linkInfo) => {
      //Create a row for the link widget
      let linkEntryRow = new Adw.ActionRow({
        title: linkInfo[0],
        subtitle: linkInfo[1],
        activatable: true
      });

      //Open the link when clicked
      linkEntryRow.connect('activated', () => {
        let uriLauncher = new Gtk.UriLauncher();
        uriLauncher.set_uri(linkInfo[2]);
        uriLauncher.launch(window, null, null);
      });

      linksGroup.add(linkEntryRow);
    });
  }
});

export default class AppGridPrefs extends ExtensionPreferences {
  //Create preferences window with libadwaita
  fillPreferencesWindow(window) {
    //Translated title, icon name
    let pageInfo = [_('Settings'), 'preferences-system-symbolic'];

    let groupsInfo = [
      //Group ID, translated title
      ['general', _('General settings')],
      ['developer', _('Developer settings')]
    ];

    let settingsInfo = [
      //Group ID, setting key, title, subtitle
      ['general', 'sort-folder-contents', _('Sort folder contents'), _('')],
      ['general', 'folder-order-position',  _('Position of ordered folders'), _('')],
      ['developer', 'logging-enabled-switch',  _('Enable extension logging'), _('')]
    ];

    //Create settings page from info
    let settingsPage = new PrefsPage(pageInfo, groupsInfo, settingsInfo, this.getSettings());

    //Define and add links
    let linksInfo = [
      //Translated title, link
      [_('Report an issue'), _('GitHub issue tracker'), 'https://github.com/stuarthayhurst/alphabetical-grid-extension/issues'],
      [_('Donate via GitHub'), _('Become a sponsor'), 'https://github.com/sponsors/stuarthayhurst'],
      [_('Donate via PayPal'), _('Thanks for your support :)'), 'https://www.paypal.me/stuartahayhurst']
    ];
    settingsPage.addLinks(window, linksInfo, _("Links"));

    //Add the pages to the window, enable searching
    window.add(settingsPage);
    window.set_search_enabled(true);
  }
}
