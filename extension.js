const ExtensionUtils = imports.misc.extensionUtils;

function enable() {
  //Wait until the grid is reordered to do anything
  gridReorder = new Extension();
  gridReorder._reorderGrid();
  gridReorder.waitForExternalReorder();
}

function disable() {
  //Disconnect from events and clean up
  gridReorder.shellSettings.disconnect(gridReorder.reorderSignal);
  gridReorder = null;
}

class Extension {
  constructor() {
    //Load gsettings values for GNOME Shell
    this.shellSettings = ExtensionUtils.getSettings('org.gnome.shell');
  }

  _reorderGrid() {
    //Alphabetically order the grid, by resetting the gsettings value for 'app-picker-layout'
    if (this.shellSettings.is_writable('app-picker-layout')) {
      this.shellSettings.reset('app-picker-layout');
      this._logMessage('Reordered grid');
    } else {
      this._logMessage('org.gnome.shell app-picker-layout in unwritable, skipping reorder')
    }
  }

  _logMessage(message) {
    log('alphabetical-app-grid: ' + message);
  }

  waitForExternalReorder() {
    //Connect to gsettings and wait for the order to change
    this.reorderSignal = this.shellSettings.connect('changed::app-picker-layout', () => {
      //Work out if the change was internal or external
      let appLayout = this.shellSettings.get_value('app-picker-layout');
      if (appLayout.recursiveUnpack() != '') {
        //When an external change is picked up, reorder the grid
        this._logMessage('App grid layout changed, triggering reorder');
        this._reorderGrid();
      }
    });
  }
}
