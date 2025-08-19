export default {
    modules: ['Gtk-*', 'Json-*', 'Gee-*'],
    girDirectories: [
        '../../girs',
    ],
    ignoreVersionConflicts: true,
    onlyVersionPrefix: true,
    package: false,
    reporter: true,
}
