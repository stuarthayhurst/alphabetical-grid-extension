//Local extension imports
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { ExtensionHelper } = Me.imports.lib;
const ShellVersion = ExtensionHelper.shellVersion;

//Main imports
const { Gtk, Gio } = imports.gi;
const Adw = ShellVersion >= 42 ? imports.gi.Adw : null;

//Use _() for translations
const _ = imports.gettext.domain(Me.metadata.uuid).gettext;

var PrefsWidget = class PrefsWidget {
  constructor() {
    this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.alphabetical-app-grid');

    this._builder = new Gtk.Builder();
    this._builder.set_translation_domain(Me.metadata.uuid);

    this.createPreferences();
    this.createAbout();
  }

  createPreferences() {
    //Use different UI file for GNOME 40+ and 3.38
    if (ShellVersion >= 40) {
      this._builder.add_from_file(Me.path + '/prefs-gtk4.ui');
    } else {
      this._builder.add_from_file(Me.path + '/prefs.ui');
    }

    //Get the settings container widget
    this.widget = this._builder.get_object('main-prefs');

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

  createAbout() {
    let logo = Gtk.Image.new_from_file(Me.path + '/icon.svg');
    //Different method to get image data for GNOME 40+ and 3.38
    if (ShellVersion >= 40) {
      logo = logo.get_paintable();
    } else {
      logo = logo.get_pixbuf();
    }

    //Create about page
    this.aboutDialogue = new Gtk.AboutDialog({
      authors: ['Stuart Hayhurst <stuart.a.hayhurst@gmail.com>'],
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
  }

  showAbout() {
    //Show the about page as a modal
    this.aboutDialogue.present();
  }
}

function init() {
  ExtensionUtils.initTranslations();
}

function fillPreferencesWindow(window) {
  //Create pages and widgets
  let settingsWindow = new PrefsWidget();
  let settingsPage = new Adw.PreferencesPage();
  let settingsGroup = new Adw.PreferencesGroup();
  let aboutPage = new Adw.PreferencesPage();
  let aboutGroup = new Adw.PreferencesGroup();

  //Build the settings page
  settingsPage.set_title(_('Settings'));
  settingsPage.set_icon_name('preferences-system-symbolic');
  settingsGroup.add(settingsWindow.widget);
  settingsPage.add(settingsGroup);

  //Get about widget
  let builder = new Gtk.Builder();
  builder.set_translation_domain(Me.metadata.uuid);
  builder.add_from_file(Me.path + '/about-gtk4.ui');
  let aboutWidget = builder.get_object('about-page');

  //Fill in the about widget
  builder.get_object('extension-version').set_label('v' + Me.metadata.version.toString());
  builder.get_object('extension-icon').set_from_file(Me.path + '/icon.svg');

  //Build the about page
  aboutPage.set_title(_('About'));
  settingsPage.set_icon_name('help-about-symbolic');
  aboutGroup.add(aboutWidget);
  aboutPage.add(aboutGroup);

  //Add the pages to the window
  window.add(settingsPage);
  window.add(aboutPage);
}

function buildPrefsWidget() {
  let settingsWindow = new PrefsWidget();
  let settingsWidget = new Gtk.ScrolledWindow();

  //Create settings page differently for GNOME 40+ and 3.38
  if (ShellVersion >= 40) {
    settingsWidget.set_child(settingsWindow.widget);
  } else {
    settingsWidget.add(settingsWindow.widget);
  }

  //Enable all elements differently for GNOME 40+ and 3.38
  if (ShellVersion >= 40) {
    settingsWidget.show();
  } else {
    settingsWidget.show_all();
  }

  //Add an 'About' button to the top bar, when window is ready
  settingsWidget.connect('realize', () => {
    let window;
    if (ShellVersion >= 40) {
      window = settingsWidget.get_root();
    } else {
      window = settingsWidget.get_toplevel();
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
