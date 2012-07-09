define(function () {
    suite("Modular", function () {
        test("publishes support for the AMD pattern", function () {
            chai.assert.ok(define.amd);
        });

        test("publishes special jQuery AMD support", function () {
            chai.assert.deepEqual(define.amd, {
                jQuery: true
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
    });
});
