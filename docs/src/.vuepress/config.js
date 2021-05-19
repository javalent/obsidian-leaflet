const { description } = require("../../package");

module.exports = {
    /**
     * Ref：https://v1.vuepress.vuejs.org/config/#title
     */
    title: "Obsidian Leaflet",
    /**
     * Ref：https://v1.vuepress.vuejs.org/config/#description
     */
    description: description,

    /**
     * Extra tags to be injected to the page HTML `<head>`
     *
     * ref：https://v1.vuepress.vuejs.org/config/#head
     */
    head: [
        ["meta", { name: "theme-color", content: "#3eaf7c" }],
        ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
        [
            "meta",
            { name: "apple-mobile-web-app-status-bar-style", content: "black" }
        ]
    ],

    /**
     * Theme configuration, here is the default theme configuration for VuePress.
     *
     * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
     */
    themeConfig: {
        repo: "",
        editLinks: false,
        docsDir: "",
        editLinkText: "",
        lastUpdated: "Last Updated",
        nav: [
            {
                text: "Guide",
                link: "/guide/"
            },
            {
                text: "Config",
                link: "/config/"
            },
            {
                text: "Obsidian",
                link: "https://obsidian.md/"
            },
            {
                text: "Github",
                link: "https://github.com/valentine195/obsidian-leaflet-plugin"
            }
        ],
        sidebar: {
            "/guide/": [
                {
                    title: "Guide",
                    collapsable: false,
                    children: ["", "getting-started"]
                }
            ]
        },
        // if your docs are in a different repo from your main project:
        docsRepo: "vuejs/vuepress",
        // if your docs are not at the root of the repo:
        docsDir: "docs",
        // if your docs are in a specific branch (defaults to 'master'):
        docsBranch: "master",
        // defaults to false, set to true to enable
        editLinks: true,
        // custom text for edit link. Defaults to "Edit this page"
        editLinkText: "Help me improve this page!",
        search: false
    },

    /**
     * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
     */
    plugins: ["@vuepress/plugin-back-to-top", "@vuepress/plugin-medium-zoom"]
};
