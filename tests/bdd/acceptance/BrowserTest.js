define([
    "vendor/chai/chai",
    "root/modular"
], function (
    chai,
    modular
) {
    "use strict";

    var expect = chai.expect;

    describe("Browser", function () {
        var loader;

        beforeEach(function (done) {
            modular.require([
                "Modular"
            ], function (
                Modular
            ) {
                loader = new Modular();
                done();
            });
        });

        describe("require()", function () {
            it("should use the data-main script's path as baseUrl if data-main specified");
        });
    });
});
