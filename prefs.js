//Local extension imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { ExtensionHelper } = Me.imports.lib;
const ShellVersion = ExtensionHelper.shellVersion;

//Main imports
const { Gtk, Gio } = imports.gi;

//Use _() for translations
const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

var PrefsWidget = class PrefsWidget {
  constructor() {
    this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.alphabetical-app-grid');

    this._builder = new Gtk.Builder();
    this.widget = new Gtk.ScrolledWindow();
    this._builder.set_translation_domain(Me.metadata.uuid);

    //Use different API methods for GTK 3 / 4
    if (ShellVersion < 40) { //GTK 3
      this._builder.add_from_file(Me.path + '/prefs.ui');
      this.widget.add(this._builder.get_object('main-prefs'));
    } else { //GTK 4
      this._builder.add_from_file(Me.path + '/prefs-gtk4.ui');
      this.widget.set_child(this._builder.get_object('main-prefs'));
    }

    this.settingElements = {
      'sort-folders-switch': {
        'settingKey': 'sort-folder-contents',
        'bindProperty': 'active'
      },
      'folder-order-dropdown': {
        'settingKey': 'folder-order-position',
        'bindProperty': 'active-id'
      },
      'logging-enabled-switch': {
        'settingKey': 'logging-enabled',
        'bindProperty': 'active'
      }
    }

    //Loop through settings toggles and dropdowns and bind together
    Object.keys(this.settingElements).forEach((element) => {
      this._settings.bind(
        this.settingElements[element].settingKey, //GSettings key to bind to
        this._builder.get_object(element), //GTK UI element to bind to
        this.settingElements[element].bindProperty, //The property to share
        Gio.SettingsBindFlags.DEFAULT
      );
    });
  }

  showAbout() {
    let logo = Gtk.Image.new_from_file(Me.path + '/icon.png');
    if (ShellVersion < 40) { //GTK 3
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
      copyright: _('© 2022 Stuart Hayhurst'),
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
  if (ShellVersion < 40) { //GTK 3
    settingsWidget.show_all();
  } else { //GTK 4
    settingsWidget.show();
  }

  settingsWidget.connect('realize', () => {
    let window;
    if (ShellVersion < 40) { //GTK 3
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
