//Local extension
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

//Main imports / globals
const Config = imports.misc.config;
var shellVersion = parseFloat(Config.PACKAGE_VERSION);

//Functions to assist program operation

var loggingEnabled = false;

function logMessage(message) {
  if (loggingEnabled) {
    date = new Date();
    timestamp = date.toTimeString().split(' ')[0];
    log('alphabetical-app-grid [' + timestamp + ']: ' + message);
  }
}
