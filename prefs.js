const {GObject, Gtk, GdkPixbuf, GLib, Gio} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

//Use _() for translations
const _ = imports.gettext.domain(Me.metadata.uuid).gettext;
//Get GNOME shell version
const shellVersion = Number.parseInt(imports.misc.config.PACKAGE_VERSION.split('.'));

var PrefsWidget = class PrefsWidget {
  constructor() {
    this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.alphabetical-app-grid');

    this._builder = new Gtk.Builder();
    this.widget = new Gtk.ScrolledWindow();
    this._builder.set_translation_domain(Me.metadata.uuid);

    //Use different API methods for GTK 3 / 4
    if (shellVersion < 40) { //GTK 3
      this._builder.add_from_file(Me.path + '/prefs.ui');
      this.widget.add(this._builder.get_object('main-prefs'));
    } else { //GTK 4
      this._builder.add_from_file(Me.path + '/prefs-gtk4.ui');
      this.widget.set_child(this._builder.get_object('main-prefs'));
    }

    //Bind folder contents ordering slider to gsettings
    this._settings.bind(
      'sort-folder-contents',
      this._builder.get_object('sort-folders-switch'),
      'active',
      Gio.SettingsBindFlags.DEFAULT
    );

    //Bind folder position slider to gsettings
    this._settings.bind(
      'folder-order-position',
      this._builder.get_object('folder-order-dropdown'),
      'active-id',
      Gio.SettingsBindFlags.DEFAULT
    );

    //Bind grid refresh toggle slider to gsettings
    this._settings.bind(
      'auto-refresh-grid',
      this._builder.get_object('refresh-grid-switch'),
      'active',
      Gio.SettingsBindFlags.DEFAULT
    );

  }

  showAbout() {
    let logo = Gtk.Image.new_from_file(Me.path + '/icon.svg');
    if (shellVersion < 40) { //GTK 3
      logo = logo.get_pixbuf();
    } else { //GTK 4
      logo = logo.get_paintable();
    }

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
      logo: logo,
      version: 'v' + Me.metadata.version.toString(),
      website: Me.metadata.url.toString(),
      website_label: _('Contribute on GitHub'),
      modal: true
    });
    aboutDialog.present();
  }
}

function init() {
  ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
  let settingsWindow = new PrefsWidget();
  let settingsWidget = settingsWindow.widget;
  if (shellVersion < 40) { //GTK 3
    settingsWidget.show_all();
  } else { //GTK 4
    settingsWidget.show();
  }

  settingsWidget.connect('realize', () => {
    let window
    if (shellVersion < 40) { //GTK 3
      window = settingsWidget.get_toplevel();
    } else { //GTK 4
      window = settingsWidget.get_root();
    }
    let headerBar = window.get_titlebar();

    //Create a button on the header bar and show the about menu when clicked
    let aboutButton = Gtk.Button.new_with_label(_('About'));
    aboutButton.connect('clicked', () => {
      settingsWindow.showAbout();
    });

    //Modify header bar title and add about menu button
    headerBar.title = _('Alphabetical App Grid Preferences');
    headerBar.pack_start(aboutButton);
    aboutButton.show();
  });

  return settingsWidget;
}
