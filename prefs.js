const {GObject, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var PrefsWidget = class PrefsWidget {
  constructor() {
    this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.alphabetical-app-grid');

    this._builder = new Gtk.Builder();
    this._builder.set_translation_domain(Me.metadata.uuid);
    this._builder.add_from_file(Me.path + '/prefs.ui');

    this.widget = new Gtk.ScrolledWindow();
    this.widget.add(this._builder.get_object('main-prefs'));

    this._foldersSwitch = this._builder.get_object('sort-folders-switch');

    //Set sliders to match the gsettings vlaues for the extension
    this._updateSwitch(this._foldersSwitch, 'sort-folder-contents');

    //Update gsettings values when switches are toggled
    this._listenForChanges(this._foldersSwitch, 'sort-folder-contents');
  }

  _listenForChanges(targetSwitch, gsettingsKey) {
    //Update gsettings value when switch is toggled
    targetSwitch.connect('state-set', () => {
      this._settings.set_boolean(gsettingsKey, targetSwitch.get_active());
    });
  }

  //Requires the element to toggle and the gsettings key to base it off of
  _updateSwitch(targetSwitch, gsettingsKey) {
    targetSwitch.set_active(this._settings.get_boolean(gsettingsKey));
  }
}

function init() {
  ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
  let settings = new PrefsWidget();
  settings.widget.show_all();
  return settings.widget;
}
