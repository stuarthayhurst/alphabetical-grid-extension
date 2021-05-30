const {GObject, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init () {}

function buildPrefsWidget () {
  let widget = new MyPrefsWidget();
  widget.show_all();
  return widget;
}

const MyPrefsWidget = GObject.registerClass(
class MyPrefsWidget extends Gtk.ScrolledWindow {

  _init (params) {

    super._init(params);

    let builder = new Gtk.Builder();
    builder.set_translation_domain(Me.metadata.uuid);
    //Load the Glade UI layout file
    builder.add_from_file(Me.path + '/prefs.ui');
    
    this.add( builder.get_object('main-prefs') );
  }
});