require({
    paths: {
        "js": "/../../../js",
        "bdd": ".",
        "lib": "/../../../lib",
        "orangeJS": "/../../../lib/orangeJS/js",
        "vendor": "../../vendor"
    }
}, [
    "bdd/modular.js"
], function () {
    "use strict";

    mocha.run();
});
