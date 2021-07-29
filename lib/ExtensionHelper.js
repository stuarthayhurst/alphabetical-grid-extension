const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Config = imports.misc.config;
const shellVersion = parseFloat(Config.PACKAGE_VERSION);

function logMessage(message) {
  if (Me.metadata.debug == true) {
    log('alphabetical-app-grid: ' + message);
  }
}
