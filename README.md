# 🛣️ Obsidian Hierarchy 🛤️

The Hierarchy Plugin for Obsidian enhances your note-taking experience by visualizing the folder hierarchy of your markdown files directly within the editor. This plugin allows users to see subdirectory structures and modify how file titles are displayed in tabs and backlinks based on their file paths.

## 📸

<img src="https://github.com/user-attachments/assets/41a54812-f998-4dd0-b4df-e1a51e4bf49d" width="500px" />

## Features

-   **Hierarchy View in Editor**: Display the folder structure of the current file in a collapsible hierarchy view within the editor. This provides a clear visual representation of subdirectories and related files.
-   **Tab Title Customization**: Customize the titles of your open tabs. Choose between displaying the full path or just the file name.
-   **Backlink Title Customization**: Modify the way backlink titles are shown by either displaying the full path or only the file name.

## Usage

Once installed, the Hierarchy Plugin will:

-   Automatically display a hierarchy view when you open a markdown file.
-   Update the titles of your open tabs and backlinks to reflect the file path settings.

To configure the plugin:

1. Go to **Settings > Hierarchy Plugin**.
2. Toggle the settings to enable or disable the hierarchy view, tab title customization, and backlink title customization.

## Settings

-   **Display hierarchy in backlinks panel**: Toggle this setting to show the folder hierarchy of files in the backlinks panel, providing more context for each backlink.
-   **Display hierarchy in tab headers**: Enable this setting to show the folder hierarchy in the tab headers, allowing you to see the file's path in addition to its name.
-   **Display hierarchy in editor view**: Enable this setting to display the folder hierarchy below each markdown editor, helping you to quickly see related files in the same directory.

## Tips

If you prefer using paths over tags (like I do), I recommend using **Obsidian Linter**.  
When you use Obsidian's autocomplete feature to insert paths, it often automatically adds aliases to the links. You can prevent this by using the following regular expressions:

- **Regex to find**: `\[\[([^|]+)\|([^|]+)\]\]`
- **Regex to replace**: `[[$1]]`

Additionally, I store all my pages under the `pages/` directory, but I don’t want to start every link with `pages/`. To avoid this, I use the following setting:

- **Regex to find**: `\[\[pages/([^|]+)\]\]`
- **Regex to replace**: `[[$1]]`

This setup will clean up both aliases and the `pages/` prefix, leaving a simple and clean path for your links.

ref. https://platers.github.io/obsidian-linter/settings/custom-rules/#custom-regex-replacements
<img width="500px" src="https://github.com/user-attachments/assets/7ee3f1e8-6f78-44b9-bf80-59c134778555" />

## Contributing

Contributions are welcome! If you have ideas, feature requests, or bug reports, feel free to open an issue or submit a pull request.

## License

This plugin is open-source and available under the MIT License.
