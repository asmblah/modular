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
        "./acceptance/CommonJS/ExportsTest",
        "./acceptance/CommonJS/ModuleTest",
        "./acceptance/CommonJS/RequireTest",
        "./acceptance/BrowserTest",
        "./acceptance/DefineRequireTest",
        "./acceptance/SampleProgramTest",
        "./integration/NamedModuleTest",
        "./unit/ModularTest"
    ], function () {
        mocha.run();
    });
});
