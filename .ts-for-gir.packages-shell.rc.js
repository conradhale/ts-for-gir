export default {
    modules: [
      'Gio-2.0',
      'Clutter-17',
      'Gdk-4.0',
      'GioUnix-2.0',
      'GLib-2.0',
      'GObject-2.0',
      'Mtk-17',
      'Meta-17',
      'Polkit-1.0',
      'Shell-17',
      'GnomeBG-4.0',
      'GnomeDesktop-4.0',
      'Malcontent-0',
      'St-17',
    ],
    girDirectories: [
        // General gir files in this repository
        './girs',
    ],
    ignore: [
        'Colorhug-1.0', // Duplicate of ColorHug-1.0
        'GUPnP-DLNA-1.0', // Same namespace as GUPnP-1.0.gir
        'ClutterGst-1.0', // Depends on GstBase-0.10
        'GstAudio-0.10', // Depends on GstBase-0.10
    ],
    ignoreVersionConflicts: true,
    promisify: true,
    onlyVersionPrefix: false,
    package: true,
    reporter: true
}
