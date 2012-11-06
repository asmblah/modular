define([
    "vendor/chai/chai",
    "root/modular"
], function (
    chai,
    modular
) {
    "use strict";

    var expect = chai.expect;

    describe("Sample Modular programs", function () {
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

        it("should execute sample program 1", function (done) {
            var HumanClass = null;

            loader.define("program/Human", function () {
                function Human() {}

                HumanClass = Human;

                return Human;
            });

            loader.require([
                "program/Human"
            ], function (
                Human
            ) {
                expect(Human).to.equal(HumanClass);
                done();
            });
        });
    });
});
