require({
    paths: {
        "root": "../..",
        "vendor": "../../vendor"
    }
}, [
    "require"
], function (
    require
) {
    "use strict";

    mocha.setup({
        "ui": "bdd",
        "reporter": mocha.reporters.HTML,
        "globals": ["_gaq", "jQuery*", "setTimeout", "setInterval", "clearTimeout", "clearInterval"]
    });

    require({
        cache: false
    }, [
        "./acceptance/CommonJS/ExportsTest.js",
        "./acceptance/CommonJS/ModuleTest.js",
        "./acceptance/CommonJS/RequireTest.js",
        "./acceptance/BrowserTest.js",
        "./acceptance/DefineRequireTest.js",
        "./acceptance/SampleProgramTest.js",
        "./integration/NamedModuleTest.js",
        "./unit/ModularTest.js"
    ], function () {
        mocha.run();
    });
});
