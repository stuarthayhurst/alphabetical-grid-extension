const {GObject, Gtk, GdkPixbuf, GLib} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

//Use _() for translations
const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

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

  showAbout() {
    //Create and display an about menu when requested
    let aboutDialog = new Gtk.AboutDialog({
      authors: [
        'Stuart Hayhurst <stuart.a.hayhurst@gmail.com>'
      ],
      //Translators: Do not translate literally. If you want, you can enter your
      //contact details here: "FIRSTNAME LASTNAME <email@addre.ss>, YEAR."
      //If not, "translate" this string with a whitespace character.
      translator_credits: _('translator-credits'),
      program_name: _('Alphabetical App Grid'),
      comments: _('Restore the alphabetical ordering of the app grid'),
      license_type: Gtk.License.GPL_3_0,
      copyright: _('© 2021 Stuart Hayhurst'),
      logo: GdkPixbuf.Pixbuf.new_from_file_at_size(Me.path + '/icon.svg', 128, 128),
      version: 'v' + Me.metadata.version.toString(),
      website: Me.metadata.url.toString(),
      website_label: _('Contribute on GitHub'),
      modal: true
    });
    aboutDialog.present();
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
  let settingsMenu = new PrefsWidget();
  settingsMenu.widget.show_all();

  GLib.timeout_add(0, 0, () => {
    let window = settingsMenu.widget.get_toplevel();
    let headerBar = window.get_titlebar();

    //Create a button on the header bar and show the about menu when clicked
    let aboutButton = Gtk.Button.new_with_label(_('About'));
    //let aboutButton = Gtk.Button.new_from_icon_name('dialog-information-symbolic', 16);
    aboutButton.connect('clicked', () => {
      settingsMenu.showAbout();
    });

    //Modify header bar title and add about menu button
    headerBar.title = _('Alphabetical App Grid Preferences');
    headerBar.pack_start(aboutButton);
    aboutButton.show_all();

    return GLib.SOURCE_REMOVE;
  });

  return settingsMenu.widget;
}
