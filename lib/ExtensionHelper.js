//Local extension
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

//Main imports / globals
const Config = imports.misc.config;
var shellVersion = parseFloat(Config.PACKAGE_VERSION);

//Create a lock to prevent code fighting itself to change gsettings
let currentlyUpdating = false

//Functions to assist program operation

function logMessage(message) {
  if (Me.metadata.debug == true) {
    log('alphabetical-app-grid: ' + message);
  }
}

function checkUpdatingLock(logMessage) {
  //Detect lock to avoid multiple changes at once
  if (currentlyUpdating == false) {
    currentlyUpdating = true;

    ExtensionHelper.logMessage(logMessage);
    this.reorderGrid();

    currentlyUpdating = false;
  }
}
