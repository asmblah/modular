define([
    "vendor/chai/chai",
    "vendor/sinon/sinon",
    "root/modular"
], function (
    chai,
    sinon,
    modular
) {
    "use strict";

    var expect = chai.expect;

    describe("Util", function () {
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

        describe("each()", function () {
            describe("for an array", function () {
                describe("with one element", function () {
                    it("should call callback once", function () {
                        var callback = sinon.spy();

                        loader.util.each([7], callback);

                        expect(callback).to.have.been.calledOnce;
                    });

                    it("should use the element value as thisObj when calling callback", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each([value], callback);

                        expect(callback).to.have.been.calledOn(value);
                    });

                    it("should pass element ([<value>], [<index>]) to callback", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each([value], callback);

                        expect(callback).to.have.been.calledWith(value, 0);
                    });
                });

                describe("with two elements", function () {
                    it("should call callback twice", function () {
                        var callback = sinon.spy();

                        loader.util.each([7, 5], callback);

                        expect(callback).to.have.been.calledTwice;
                    });

                    it("should use first element's value as thisObj when calling callback for first element", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each([value, {}], callback);

                        expect(callback).to.have.been.calledOn(value);
                    });

                    it("should use second element's value as thisObj when calling callback for second element", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each([{}, value], callback);

                        expect(callback).to.have.been.calledOn(value);
                    });

                    it("should pass first element's ([<value>], [<index>]) to callback when calling for first element", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each([value, {}], callback);

                        expect(callback).to.have.been.calledWith(value, 0);
                    });

                    it("should pass second element's ([<value>], [<index>]) to callback when calling for second element", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each([{}, value], callback);

                        expect(callback).to.have.been.calledWith(value, 1);
                    });
                });
            });

            describe("for an object", function () {
                describe("with one property", function () {
                    it("should call callback once", function () {
                        var callback = sinon.spy();

                        loader.util.each({ prop: 2 }, callback);

                        expect(callback).to.have.been.calledOnce;
                    });

                    it("should use the property value as thisObj when calling callback", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each({ prop: value }, callback);

                        expect(callback).to.have.been.calledOn(value);
                    });

                    it("should pass property ([<value>], [<key>]) to callback", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each({ prop: value }, callback);

                        expect(callback).to.have.been.calledWith(value, "prop");
                    });
                });

                describe("with two properties", function () {
                    it("should call callback twice", function () {
                        var callback = sinon.spy();

                        loader.util.each({ prop1: 8, prop2: 3 }, callback);

                        expect(callback).to.have.been.calledTwice;
                    });

                    it("should use first property's value as thisObj when calling callback for first property", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each({ prop1: value, prop2: {} }, callback);

                        expect(callback).to.have.been.calledOn(value);
                    });

                    it("should use second property's value as thisObj when calling callback for second property", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each({ prop1: {}, prop2: value }, callback);

                        expect(callback).to.have.been.calledOn(value);
                    });

                    it("should pass first property's ([<value>], [<key>]) to callback when calling for first property", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each({ prop1: value, prop2: {} }, callback);

                        expect(callback).to.have.been.calledWith(value, "prop1");
                    });

                    it("should pass second property's ([<value>], [<key>]) to callback when calling for second property", function () {
                        var callback = sinon.spy(),
                            value = {};

                        loader.util.each({ prop1: {}, prop2: value }, callback);

                        expect(callback).to.have.been.calledWith(value, "prop2");
                    });
                });
            });
        });
    });
});
