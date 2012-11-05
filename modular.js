/*
 *  Modular - JavaScript AMD Framework
 *  Copyright (c) 2012 http://ovms.co. All Rights Reserved.
 *  Implements the AMD specification - see https://github.com/amdjs/amdjs-api/wiki/AMD
 *
 *  ====
 *
 *  This file is part of Modular.
 *
 *  Modular is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Modular is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Modular.  If not, see <http://www.gnu.org/licenses/>.
 */

(function () {
    "use strict";
    /*global require, module */

    var global = new [Function][0]("return this;")(), // Keep JSLint happy
        has = {}.hasOwnProperty,
        slice = [].slice,
        get = function (obj, prop) {
            return obj[prop];
        },
        util = {
            each: function (obj, callback, options) {
                var key,
                    length;

                if (!obj) {
                    return;
                }

                options = options || {};

                if (has.call(obj, "length") && !options.keys) {
                    for (key = 0, length = obj.length; key < length; key += 1) { // Keep JSLint happy with "+= 1"
                        if (callback.call(obj[key], obj[key], key) === false) {
                            break;
                        }
                    }
                } else {
                    for (key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            if (callback.call(obj[key], obj[key], key) === false) {
                                break;
                            }
                        }
                    }
                }
            },

            extend: function (target) {
                util.each(slice.call(arguments, 1), function () {
                    util.each(this, function (val, key) {
                        target[key] = val;
                    }, { keys: true });
                });

                return target;
            },

            getType: function (obj) {
                return {}.toString.call(obj).match(/\[object ([\s\S]*)\]/)[1];
            },

            global: global,

            isArray: function (str) {
                return util.getType(str) === "Array";
            },

            isFunction: function (str) {
                return util.getType(str) === "Function";
            },

            isPlainObject: function (obj) {
                return util.getType(obj) === "Object";
            },

            isString: function (str) {
                return typeof str === "string" || util.getType(str) === "String";
            }
        },
        Funnel = (function () {
            function Funnel() {
                this.doneCallbacks = [];
                this.pending = 0;
            }
            util.extend(Funnel.prototype, {
                add: function (callback) {
                    var funnel = this;

                    funnel.pending += 1;

                    return function () {
                        var result = callback.apply(this, arguments);

                        funnel.pending -= 1;
                        if (funnel.pending === 0) {
                            util.each(funnel.doneCallbacks, function (callback) {
                                callback();
                            });
                        }

                        return result;
                    };
                },

                done: function (callback) {
                    if (this.pending === 0) {
                        callback();
                    } else {
                        this.doneCallbacks.push(callback);
                    }
                }
            });

            return Funnel;
        }()),
        Module = (function () {
            var UNDEFINED = 1,
                TRANSPORTING = 2,
                FILTERING = 3,
                DEFINED = 4,
                DEFERRED = 5,
                LOADED = 6;

            function Module(loader, id, value) {
                this.config = {};
                this.dependencies = [];
                this.factory = null;
                this.id = id || null;
                this.loader = loader;
                this.mode = value ? LOADED : UNDEFINED;
                this.requesterQueue = null;
                this.value = value || null;
                this.whenLoaded = null;
            }
            util.extend(Module.prototype, {
                define: function (config, dependencyIDs, factory, callback) {
                    var loader = this.loader,
                        module = this,
                        exports = {},
                        dependencyConfigs = {},
                        idFilter,
                        funnel = new Funnel();

                    util.extend(module.config, config);
                    idFilter = get(module.config, "idFilter") || function (id, callback) {
                        callback(id);
                    };

                    util.each(dependencyIDs, function (dependencyID, dependencyIndex) {
                        var dependency;

                        dependencyID = loader.resolveDependencyID(dependencyID, module.id, get(module.config, "paths"), get(module.config, "exclude"));

                        if (dependencyID === "require") {
                            module.dependencies[dependencyIndex] = new Module(loader, null, function (arg1, arg2, arg3, arg4) {
                                var args = loader.parseArgs(arg1, arg2, arg3, arg4),
                                    config = util.extend({}, module.config, args.config);
                                loader.require(config, args.id || module.id, args.dependencyIDs, args.factory);
                            });
                        } else if (dependencyID === "exports") {
                            module.value = exports;
                            module.dependencies[dependencyIndex] = new Module(loader, null, exports);
                        } else if (dependencyID === "module") {
                            module.dependencies[dependencyIndex] = new Module(loader, null, {
                                id: module.id,
                                uri: module.id,
                                config: module.config,
                                exports: exports,
                                defer: function () {
                                    module.mode = DEFERRED;
                                    return function (value) {
                                        module.whenLoaded(value);
                                    };
                                }
                            });
                        } else {
                            idFilter(dependencyID, funnel.add(function (dependencyID) {
                                dependency = loader.getModule(dependencyID) || loader.createModule(dependencyID);
                                module.dependencies[dependencyIndex] = dependency;
                                util.extend(dependency.config, module.config);
                            }));
                        }
                    });

                    module.factory = factory;

                    module.mode = FILTERING;

                    funnel.done(function () {
                        module.mode = DEFINED;
                        if (callback) {
                            callback();
                        }
                    });
                },

                getID: function () {
                    return this.id;
                },

                getValue: function () {
                    return this.value;
                },

                isDeferred: function () {
                    return this.mode === DEFERRED;
                },

                isDefined: function () {
                    return this.mode >= FILTERING;
                },

                isLoaded: function () {
                    return this.mode === LOADED;
                },

                load: function (callback) {
                    var loader = this.loader,
                        module = this;

                    function load(dependencyValues, value, callback) {
                        module.mode = LOADED;
                        module.value = value || module.value;

                        if (callback) {
                            callback(module.value);
                        }
                    }

                    function getModuleValue(dependencyValues, factory, callback) {
                        var value = util.isFunction(factory) ?
                                    factory.apply(global, dependencyValues) :
                                    factory;

                        if (module.isDeferred()) {
                            module.whenLoaded = function (value) {
                                module.whenLoaded = null;
                                load(dependencyValues, value, callback);
                            };
                        } else {
                            load(dependencyValues, value, callback);
                        }
                    }

                    function filter(dependencyValues, callback) {
                        var factoryFilter = get(module.config, "factoryFilter") || function (args) {
                            args.callback(args.factory);
                        };

                        factoryFilter({
                            callback: function (factory) {
                                getModuleValue(dependencyValues, factory, callback);
                            },
                            dependencyValues: dependencyValues,
                            factory: module.factory,
                            id: module.getID(),
                            loader: loader
                        });
                    }

                    function loadDependencies(callback) {
                        var funnel = new Funnel(),
                            dependencyValues = [];

                        util.each(module.dependencies, function (dependency, index) {
                            dependency.load(funnel.add(function (value) {
                                // These may load in any order, so don't just .push() them
                                dependencyValues[index] = value;
                            }));
                        });

                        funnel.done(function () {
                            filter(dependencyValues, callback);
                        });
                    }

                    function completeDefine(define) {
                        if (!define) {
                            define = {
                                config: {},
                                dependencyIDs: [],
                                factory: null
                            };
                        }

                        module.define(define.config, define.dependencyIDs, define.factory, function () {
                            loadDependencies(function (value) {
                                util.each(module.requesterQueue, function (callback) {
                                    callback(value);
                                });
                                module.requesterQueue = null;
                            });
                        });
                    }

                    if (module.mode === UNDEFINED) {
                        module.requesterQueue = callback ? [callback] : [];
                        module.mode = TRANSPORTING;

                        util.each(loader.transports, function (handler) {
                            if (handler(completeDefine, module) !== false) {
                                return false;
                            }
                        });

                        //if (module.mode === UNDEFINED) {
                        //    throw new Error("No transport available for '" + module.id + "'");
                        //}
                    } else if (module.mode === TRANSPORTING) {
                        if (callback) {
                            module.requesterQueue.push(callback);
                        }
                    } else if (module.mode === DEFINED) {
                        loadDependencies(callback);
                    } else if (module.mode === LOADED) {
                        if (callback) {
                            callback(module.value);
                        }
                    }
                }
            });

            return Module;
        }()),
        Modular = (function () {
            function Modular() {
                this.anonymousDefines = [];
                this.config = {};
                this.modules = {};
                this.transports = [];

                // Expose Modular class itself to dependents
                this.define("Modular", function () {
                    return Modular;
                });

                // Expose this instance of Modular to its dependents
                this.define("modular", this);
            }
            util.extend(Modular.prototype, {
                addTransport: function (handler) {
                    this.transports.push(handler);
                },

                configure: function (config) {
                    if (config) {
                        util.extend(this.config, config);
                    } else {
                        return this.config;
                    }
                },

                createDefiner: function () {
                    var loader = this;

                    function define(arg1, arg2, arg3, arg4) {
                        return loader.define(arg1, arg2, arg3, arg4);
                    }

                    // Publish support for the AMD pattern
                    util.extend(define, {
                        "amd": {
                            //"jQuery": true
                        }
                    });

                    return define;
                },

                createModule: function (id) {
                    var module = new Module(this, id);

                    this.modules[id] = module;

                    return module;
                },

                createRequirer: function () {
                    var loader = this;

                    function require(arg1, arg2, arg3, arg4) {
                        return loader.require(arg1, arg2, arg3, arg4);
                    }

                    util.extend(require, {
                        config: function (config) {
                            return loader.configure(config);
                        }
                    });

                    return require;
                },

                define: function (arg1, arg2, arg3, arg4) {
                    var args = this.parseArgs(arg1, arg2, arg3, arg4),
                        id = args.id,
                        module;

                    if (id === null) {
                        this.anonymousDefines.push(args);
                    } else {
                        module = this.getModule(id);
                        if (module) {
                            if (module.isDefined()) {
                                throw new Error("Module '" + id + "' has already been defined");
                            }
                        } else {
                            module = this.createModule(id);
                        }

                        module.define(args.config, args.dependencyIDs, args.factory);
                    }
                },

                getModule: function (id) {
                    return this.modules[id];
                },

                parseArgs: function (arg1, arg2, arg3, arg4) {
                    var config = null,
                        id = null,
                        dependencyIDs = null,
                        factory = null;

                    if (util.isPlainObject(arg1)) {
                        config = arg1;
                    } else if (util.isString(arg1)) {
                        id = arg1;
                    } else if (util.isArray(arg1)) {
                        dependencyIDs = arg1;
                    } else if (util.isFunction(arg1)) {
                        factory = arg1;
                    }

                    if (util.isString(arg2)) {
                        id = arg2;
                    } else if (util.isArray(arg2)) {
                        dependencyIDs = arg2;
                    } else if (util.isFunction(arg2) || util.isPlainObject(arg2)) {
                        factory = arg2;
                    }

                    if (util.isArray(arg3)) {
                        dependencyIDs = arg3;
                    } else if (util.isFunction(arg3) || util.isPlainObject(arg3)) {
                        factory = arg3;
                    }

                    if (util.isFunction(arg4)) {
                        factory = arg4;
                    }

                    // Special case: only an object passed - use as factory
                    if (config && !id && !dependencyIDs && !factory) {
                        factory = config;
                        config = null;
                    }

                    // Special case: only an array passed - use as factory
                    if (!config && dependencyIDs && !id && !factory) {
                        factory = dependencyIDs;
                        dependencyIDs = null;
                    }

                    return {
                        config: util.extend({}, this.config, config),
                        id: id,
                        dependencyIDs: dependencyIDs || [],
                        factory: factory
                    };
                },

                popAnonymousDefine: function () {
                    return this.anonymousDefines.pop();
                },

                resolveDependencyID: function (id, dependentID, mappings, exclude) {
                    var previousID;

                    if (!util.isString(id)) {
                        throw new Error("Invalid dependency id");
                    }

                    if (exclude && exclude.test(id)) {
                        return id;
                    }

                    if (/^\.\.?\//.test(id) && dependentID) {
                        id = dependentID.replace(/[^\/]+$/, "") + id;
                    }

                    // Resolve parent-directory terms
                    while (previousID !== id) {
                        previousID = id;
                        id = id.replace(/(^|\/)(?!\.\.)([^\/]*)\/\.\.\//, "$1");
                    }

                    if (mappings && !/^\.\.?\//.test(id)) {
                        id = (function () {
                            var terms = id.split("/"),
                                portion,
                                index;

                            if (mappings[id]) {
                                return mappings[id];
                            }

                            for (index = terms.length - 1; index >= 0; index -= 1) {
                                portion = terms.slice(0, index).join("/");
                                if (mappings[portion] || mappings[portion + "/"]) {
                                    return (mappings[portion] || mappings[portion + "/"]).replace(/\/$/, "") + "/" + terms.slice(index).join("/");
                                }
                            }
                            return id;
                        }());
                    }

                    id = id.replace(/(^|\/)(\.?\/)+/g, "$1").replace(/^\//, ""); // Resolve same-directory terms

                    return id;
                },

                require: function (arg1, arg2, arg3, arg4) {
                    var args = this.parseArgs(arg1, arg2, arg3, arg4),
                        id = args.id,
                        module = new Module(this, id);

                    module.define(args.config, args.dependencyIDs, args.factory, function () {
                        module.load();
                    });
                },

                util: util
            });

            return Modular;
        }()),
        modular = new Modular();

    (function () {
        var isNode = (typeof require !== "undefined" && typeof module !== "undefined");

        function makePath(baseURI, id) {
            if (/^(https?:)?\/\//.test(id)) {
                return id;
            }

            return (baseURI ? baseURI.replace(/\/$/, "") + "/" : "") + id.replace(/\.js$/, "") + ".js";
        }

        // Don't override an existing AMD loader: instead, register the Modular instance
        if (global.define) {
            global.define(modular);
        } else {
            global.define = modular.createDefiner();

            if (isNode) {
                module.exports = modular;

                (function (nodeRequire) {
                    var fs = nodeRequire("fs"),
                        // Expose Modular require() to loaded script
                        require = modular.createRequirer();

                    modular.addTransport(function (callback, module) {
                        var path = makePath(get(module.config, "baseUrl"), module.getID());
                        fs.readFile(path, "utf8", function (error, data) {
                            /*jslint evil: true */
                            eval(data);
                            callback(modular.popAnonymousDefine());
                        });
                    });
                }(require));
            } else {
                global.require = modular.createRequirer();

                // Browser transport
                if (global === global.window) {
                    modular.configure({
                        "baseUrl": global.location.pathname.replace(/\/?[^\/]+$/, ""),
                        "exclude": /^(https?:)?\/\//
                    });

                    modular.addTransport(function (callback, module) {
                        var script = global.document.createElement("script"),
                            head = global.document.getElementsByTagName("head")[0],
                            uri = makePath(get(module.config, "baseUrl"), module.getID());

                        if (get(module.config, "cache") === false) {
                            uri += "?__r=" + Math.random();
                        }

                        script.onload = function () {
                            callback(modular.popAnonymousDefine());
                        };
                        script.type = "text/javascript";
                        script.src = uri;
                        head.insertBefore(script, head.firstChild);
                    });

                    util.each(global.document.getElementsByTagName("script"), function (script) {
                        var main = script.getAttribute("data-main");

                        if (main) {
                            modular.require(".", [main]);
                            return false;
                        }
                    });
                }
            }
        }
    }());
}());
