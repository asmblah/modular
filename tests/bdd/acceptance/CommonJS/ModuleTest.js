define([
    "vendor/chai/chai",
    "root/modular"
], function (
    chai,
    modular
) {
    "use strict";

    var expect = chai.expect;

    describe("CommonJS module", function () {
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

        it("should make a 'module' object available via the 'module' named dependency", function (done) {
            loader.require([
                "module"
            ], function (
                module
            ) {
                expect(module).to.be.an("object");
                done();
            });
        });

        it("should make the module's id available as an 'id' property", function (done) {
            loader.require("where/is/the/love", [
                "module"
            ], function (
                module
            ) {
                expect(module.id).to.equal("where/is/the/love");
                done();
            });
        });

        it("should make the same object returned by named dependency 'exports' available via module.exports", function (done) {
            loader.require([
                "exports",
                "module"
            ], function (
                exports,
                module
            ) {
                expect(module.exports).to.equal(exports);
                done();
            });
        });
    });
});
