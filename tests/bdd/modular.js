define([
    "vendor/chai/chai"
], function (
    chai
) {
    var expect = chai.expect;

    describe("Modular", function () {
        define("classes/Animal", function () {
            function Animal(species) {
                this.species = species || null;
            }

            Animal.prototype.getSpecies = function () {
                return this.species;
            };

            return Animal;
        });
        define("classes/Human", [
            "classes/Animal"
        ], function (
            Animal
        ) {
            function Human() {
                Animal.call(this, "Human");
            }

            Human.prototype = Object.create(Animal.prototype);

            return Human;
        });

        it("should publish support for the AMD pattern", function () {
            expect(define.amd).to.be.ok;
        });

        it("should publish special jQuery AMD support", function () {
            expect(define.amd).to.eql({
                jQuery: true
            });
        });

        it("should resolve paths beginning with './' relative to current directory", function (done) {
            require("classes/World", [
                "./Animal"
            ], function (
                Animal
            ) {
                expect(new Animal().getSpecies()).to.be.Null;

                done();
            });
        });

        it("should resolve paths beginning with '../' relative to parent directory", function (done) {
            require("classes/World", [
                "../classes/Animal"
            ], function (
                Animal
            ) {
                expect(new Animal().getSpecies()).to.be.Null;

                done();
            });
        });

        it("should resolve paths beginning with '/' relative to root", function (done) {
            define("/util", function () {
                return {};
            });

            require("classes/Parser/English", [
                "/util"
            ], function (
                util
            ) {
                expect(util).to.eql({});

                done();
            });
        });

        it("should resolve paths not beginning with '.' or '/' relative to root", function (done) {
            require("classes/Parser/English", [
                "classes/Human"
            ], function (
                Human
            ) {
                expect(new Human().getSpecies()).to.equal("Human");

                done();
            });
        });

        describe("require(...)", function () {
            it("should allow no dependencies to be specified", function (done) {
                require(function () {
                    done();
                });
            });

            it("should allow itself to be named (only useful for requires outside define(...)s or data-main)", function (done) {
                require("i-am-the-one-and-only", function () {
                    done();
                });
            });

            describe("config", function () {
                it("should affect the global config", function () {
                    require.config({
                        awesomeOption: "yes"
                    });

                    expect(require.config()).to.have.property("awesomeOption");
                });
            });
        });

        describe("define(...)", function () {
            it("should support marvellously named modules", function (done) {
                define("annie's-marvellous-module", function () {
                    return {
                        welcome: "to the jungle"
                    };
                });

                require(["annie's-marvellous-module"], function (greeting) {
                    expect(greeting).to.eql({
                        welcome: "to the jungle"
                    });

                    done();
                });
            });
        });

        describe("nested require(...)", function () {
            it("should resolve paths relative to enclosing module", function (done) {
                define("into/the/Matrix", function () {
                    function Matrix() {}

                    return Matrix;
                });

                require("into/the/somewhere", [
                    "require"
                ], function (
                    require
                ) {
                    require([
                        "./Matrix"
                    ], function (
                        Matrix
                    ) {
                        done();
                    });
                });
            });
        });

        describe("pathFilter", function () {
            // TODO: Improve pathFilter so it can remember absolute mappings (so relative mappings work as expected)
        });
    });
});
