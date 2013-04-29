/*
 * Modular - JavaScript AMD Framework
 * Copyright 2013 Dan Phillimore (asmblah)
 * http://asmblah.github.com/modular/
 *
 * Implements the AMD specification - see https://github.com/amdjs/amdjs-api/wiki/AMD
 *
 * Released under the MIT license
 * https://github.com/asmblah/modular/raw/master/MIT-LICENSE.txt
 */

/*global define */
define([
    "vendor/chai/chai",
    "require",
    "js/util",
    "vendor/sinon/sinon",
    "Modular/Promise"
], function (
    chai,
    require,
    rootUtil,
    sinon,
    Promise
) {
    "use strict";

    var expect = chai.expect;

    describe("Util", function () {
        var global,
            modular,
            util;

        beforeEach(function () {
            global = {};
            modular = require("modular");
            util = new rootUtil.constructor(global);
        });

        it("should inherit from modular.util", function () {
            expect(Object.getPrototypeOf(util.constructor.prototype)).to.equal(modular.util);
        });

        describe("global", function () {
            it("should return the global object", function () {
                expect(util.global).to.equal(global);
            });
        });

        describe("get()", function () {
            it("should return a Promise", function () {
                expect(util.get()).to.be.an.instanceOf(Promise);
            });
        });
    });
});
