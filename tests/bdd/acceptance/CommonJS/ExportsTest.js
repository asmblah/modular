define([
    "vendor/chai/chai",
    "root/modular"
], function (
    chai,
    modular
) {
    "use strict";

    var expect = chai.expect;

    describe("CommonJS exports", function () {
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

        it("should make an 'exports' object available via the 'exports' named dependency", function (done) {
            loader.require([
                "exports"
            ], function (
                exports
            ) {
                expect(exports).to.be.an("object");
                done();
            });
        });

        it("should use the 'exports' object as the module value", function (done) {
            var otherModuleExports;

            loader.define("module/using/exports", [
                "exports"
            ], function (
                exports
            ) {
                otherModuleExports = exports;
            });

            loader.require([
                "module/using/exports"
            ], function (
                otherModule
            ) {
                expect(otherModule).to.equal(otherModuleExports);
                done();
            });
        });
    });
});
