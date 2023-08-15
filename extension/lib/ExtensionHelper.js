/* exported loggingEnabled logMessage */

//Helper function to send log messages
export var loggingEnabled = false;
export function logMessage(message) {
  if (loggingEnabled) {
    date = new Date();
    timestamp = date.toTimeString().split(' ')[0];
    log('alphabetical-app-grid [' + timestamp + ']: ' + message);
  }
}
