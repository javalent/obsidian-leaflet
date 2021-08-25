## Localization

The plugin has full localization support, and will attempt to load the current Obsidian locale. If one does not exist, it will fall back to English.

### Adding a new Locale

New locales can be added by creating a pull request. Two things should be done in this pull request:

1. Create the locale in the `locales` folder by copying the `en.ts` file. This file should be given a name matching the string returned by `moment.locale()`.
2. Create the translation by editing the value of each property.
3. Add the import in `locales.ts`.
4. Add the language to the `localeMap` variable.

#### Wildcards

Some strings in the locale have wildcards in them, such as `%1`. This is used by the plugin to insert dynamic data into the translated string.

For example:

`Loading Obsidian Leaflet v%1`: The plugin will insert the version number for `%1`.

This allows control of plural syntaxes or placement of file names in the sentence.
