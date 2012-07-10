define(function () {
    suite("Modular", function () {
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

        test("publishes support for the AMD pattern", function () {
            chai.assert.ok(define.amd);
        });

        test("publishes special jQuery AMD support", function () {
            chai.assert.deepEqual(define.amd, {
                jQuery: true
            });
        });

        test("paths beginning with './' are resolved relative to current directory", function (done) {
            require("classes/World", [
                "./Animal"
            ], function (
                Animal
            ) {
                chai.assert.isNull(new Animal().getSpecies());

                done();
            });
        });

        test("paths beginning with '../' are resolved relative to parent directory", function (done) {
            require("classes/World", [
                "../classes/Animal"
            ], function (
                Animal
            ) {
                chai.assert.isNull(new Animal().getSpecies());

                done();
            });
        });

        test("paths beginning with '/' are resolved relative to root", function (done) {
            define("/util", function () {
                return {};
            });

            require("classes/Parser/English", [
                "/util"
            ], function (
                util
            ) {
                chai.assert.deepEqual(util, {});

                done();
            });
        });

        test("paths not beginning with '.' or '/' are resolved relative to root", function (done) {
            require("classes/Parser/English", [
                "classes/Human"
            ], function (
                Human
            ) {
                chai.assert.equal(new Human().getSpecies(), "Human");

                done();
            });
        });

        suite("require(...)", function () {
            test("allows no dependencies to be specified", function (done) {
                require(function () {
                    done();
                });
            });

            test("allows itself to be named (only useful for requires outside define(...)s or data-main)", function (done) {
                require("i-am-the-one-and-only", function () {
                    done();
                });
            });
        });

        suite("define(...)", function () {
            test("supports marvellously named modules", function (done) {
                define("annie's-marvellous-module", function () {
                    return {
                        welcome: "to the jungle"
                    };
                });

                require(["annie's-marvellous-module"], function (greeting) {
                    chai.assert.deepEqual(greeting, {
                        welcome: "to the jungle"
                    });

                    done();
                });
            });
        });

        suite("nested require(...)", function () {
            test("paths are resolved relative to enclosing module", function () {
                require("test.js", [
                    "classes/Human"
                ], function (
                    Human
                ) {
                    chai.assert.equal(new Human().getSpecies(), "Human");
                });
            });
        });

        suite("pathFilter", function () {
            // TODO: Improve pathFilter so it can remember absolute mappings (so relative mappings work as expected)
        });
    });
});
