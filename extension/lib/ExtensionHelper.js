/* exported shellVersion loggingEnabled logMessage */

var shellVersion = parseFloat(imports.misc.config.PACKAGE_VERSION);

//Helper function to send log messages
var loggingEnabled = false;
function logMessage(message) {
  if (loggingEnabled) {
    date = new Date();
    timestamp = date.toTimeString().split(' ')[0];
    log('alphabetical-app-grid [' + timestamp + ']: ' + message);
  }
}
