define([
    "vendor/chai/chai",
    "root/modular"
], function (
    chai,
    modular
) {
    "use strict";

    var expect = chai.expect;

    describe("Modular", function () {
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

        describe("addTransport()", function () {
            it("should support a simple script-tag-based dynamic loader", function (done) {
                var Magic = {};

                loader.addTransport(function (callback, module) {
                    var script = { nodeName: "script" },
                        head = {
                            appendChild: function (node) {
                                loader.define(Magic); // Simulate script execution after download
                                setTimeout(function () {
                                    script.onload(); // Simulate script.onload() event firing some time later
                                });
                            }
                        };

                    script.onload = function () {
                        callback(loader.popAnonymousDefine());
                    };
                    script.type = "text/javascript";
                    script.src = module.getID().replace(/\.js/, "") + ".js";
                    head.appendChild(script);
                });

                loader.require([
                    "Magic"
                ], function (
                    ImportedMagic
                ) {
                    expect(ImportedMagic).to.equal(Magic);
                    done();
                });
            });
        });

        describe("parseArgs()", function () {
            it("should extend from the loader's current default config", function () {
                loader.configure({ friend: "or foe" });

                expect(loader.parseArgs({}).config).to.have.property("friend");
            });

            it("should use the object as factory if just passed an object", function () {
                var factory = { bass: "in your face" };

                expect(loader.parseArgs(factory).factory).to.equal(factory);
            });

            it("should use the array as factory if just passed an array", function () {
                var factory = ["some data", "that is definitely", /not a dependency list/];

                expect(loader.parseArgs(factory).factory).to.deep.equal(factory);
            });

            it("should use the string as id if just passed a string", function () {
                var id = "awesome!";

                expect(loader.parseArgs(id).id).to.equal(id);
            });

            it("should use the function as factory if just passed a function", function () {
                var factory = function () {};

                expect(loader.parseArgs(factory).factory).to.equal(factory);
            });

            it("should support [config={}], [factory=function]", function () {
                var config = { music: "ha" },
                    factory = function () {};

                expect(loader.parseArgs(config, factory).config).to.have.property("music");
                expect(loader.parseArgs(config, factory).factory).to.equal(factory);
            });

            it("should support [config={}], [factory={}]", function () {
                var config = { bars: "behind" },
                    factory = { "what am i not?": "a function" };

                expect(loader.parseArgs(config, factory).config).to.have.property("bars");
                expect(loader.parseArgs(config, factory).factory).to.equal(factory);
            });

            it("should support [id], [factory={}]", function () {
                var id = "identifier",
                    factory = { "what am i not?": "a function" };

                expect(loader.parseArgs(id, factory).id).to.equal(id);
                expect(loader.parseArgs(id, factory).factory).to.equal(factory);
            });
        });

        describe("resolveDependencyID()", function () {
            it("should resolve relative dependency IDs with parent term at start", function () {
                var dependencyID = "../out/there",
                    dependentID = "module/in/here",
                    expectedResultID = "module/out/there";

                expect(loader.resolveDependencyID(dependencyID, dependentID)).to.equal(expectedResultID);
            });

            it("should resolve relative dependency IDs with parent term in middle", function () {
                var dependencyID = "module/in/there/../here/somewhere",
                    dependentID = "",
                    expectedResultID = "module/in/here/somewhere";

                expect(loader.resolveDependencyID(dependencyID, dependentID)).to.equal(expectedResultID);
            });

            it("should leave parent terms in place if alongside dependent ID", function () {
                var dependencyID = "../../sibling-of-only",
                    dependentID = "only/two/deep",
                    expectedResultID = "sibling-of-only";

                expect(loader.resolveDependencyID(dependencyID, dependentID)).to.equal(expectedResultID);
            });

            it("should leave parent terms in place if outside dependent ID", function () {
                var dependencyID = "../../../parent-of-only",
                    dependentID = "only/two/deep",
                    expectedResultID = "../parent-of-only";

                expect(loader.resolveDependencyID(dependencyID, dependentID)).to.equal(expectedResultID);
            });

            it("should resolve relative dependency IDs with same-directory term at start", function () {
                var dependencyID = "./there/somewhere",
                    dependentID = "module/in/here",
                    expectedResultID = "module/in/there/somewhere";

                expect(loader.resolveDependencyID(dependencyID, dependentID)).to.equal(expectedResultID);
            });

            it("should resolve relative dependency IDs with same-directory term in middle", function () {
                var dependencyID = "module/in/./here/somewhere",
                    dependentID = "",
                    expectedResultID = "module/in/here/somewhere";

                expect(loader.resolveDependencyID(dependencyID, dependentID)).to.equal(expectedResultID);
            });

            it("should resolve relative dependency IDs with multiple consecutive same-directory terms in middle", function () {
                var dependencyID = "module/in/././././here/somewhere",
                    dependentID = "",
                    expectedResultID = "module/in/here/somewhere";

                expect(loader.resolveDependencyID(dependencyID, dependentID)).to.equal(expectedResultID);
            });

            it("should resolve relative dependency IDs with same-directory '//' term in middle", function () {
                var dependencyID = "module/in//here/somewhere",
                    dependentID = "",
                    expectedResultID = "module/in/here/somewhere";

                expect(loader.resolveDependencyID(dependencyID, dependentID)).to.equal(expectedResultID);
            });

            it("should resolve relative dependency IDs with multiple consecutive same-directory '//' terms in middle", function () {
                var dependencyID = "module/in////here/somewhere",
                    dependentID = "",
                    expectedResultID = "module/in/here/somewhere";

                expect(loader.resolveDependencyID(dependencyID, dependentID)).to.equal(expectedResultID);
            });

            describe("ID mapping", function () {
                it("should support mapping of base term", function () {
                    var dependencyID = "world/at/large",
                        dependentID = "",
                        mappings = {
                            "world": "earth"
                        },
                        expectedResultID = "earth/at/large";

                    expect(loader.resolveDependencyID(dependencyID, dependentID, mappings)).to.equal(expectedResultID);
                });

                it("should support mapping of two terms", function () {
                    var dependencyID = "world/at/large",
                        dependentID = "",
                        mappings = {
                            "world/at": "earth/when"
                        },
                        expectedResultID = "earth/when/large";

                    expect(loader.resolveDependencyID(dependencyID, dependentID, mappings)).to.equal(expectedResultID);
                });

                it("should use most specific mapping available", function () {
                    var dependencyID = "world/at/large",
                        dependentID = "",
                        mappings = {
                            "world": "earth",
                            "world/at": "planet/when"
                        },
                        expectedResultID = "planet/when/large";

                    expect(loader.resolveDependencyID(dependencyID, dependentID, mappings)).to.equal(expectedResultID);
                });

                it("should use mapping even if it includes a trailing slash", function () {
                    var dependencyID = "world/at/large",
                        dependentID = "",
                        mappings = {
                            "world/": "earth"
                        },
                        expectedResultID = "earth/at/large";

                    expect(loader.resolveDependencyID(dependencyID, dependentID, mappings)).to.equal(expectedResultID);
                });
            });

            describe("ID exclusions", function () {
                it("should not exclude any IDs from processing by default", function () {
                    expect(loader.resolveDependencyID("./test")).to.equal("test");
                });

                it("should exclude a specified ID", function () {
                    expect(loader.resolveDependencyID("root/../../", null, null, /\.\.\/$/)).to.equal("root/../../");
                });
            });
        });

        describe("addTransport()", function () {
            it("should support dependencies being loaded asynchronously", function (done) {
                var mystical = {};

                loader.addTransport(function (callback) {
                    // Just do a simple test by breaking the call stack
                    setTimeout(function () {
                        callback(loader.popAnonymousDefine());
                    });
                });

                loader.define(mystical);

                loader.require([
                    "mystical"
                ], function (
                    importedMystical
                ) {
                    expect(importedMystical).to.equal(mystical);
                    done();
                });
            });
        });
    });
});
