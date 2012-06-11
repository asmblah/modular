/*
 *  Modular - JavaScript AMD framework
 *  Copyright (c) 2012 http://ovms.co. All Rights Reserved.
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

/*global define, require */

(function () {
    "use strict";

    function each(obj, callback) {
        var key,
            length;

        if (!obj) {
            return;
        }

        if (obj.hasOwnProperty("length")) {
            for (key = 0, length = obj.length; key < length; key += 1) { // Keep JSLint happy with "+= 1"
                if (obj.hasOwnProperty(key)) {
                    if (callback.call(obj[key], obj[key], key) === false) {
                        break;
                    }
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
    }

    // For Closure compiler name-munging while keeping JSLint happy
    function lookup(obj, name) {
        return obj[name];
    }

    var global = new [Function][0]("return this;")(), // Keep JSLint happy
        defaults = {
            "baseUrl": "",
            "paths": {},
            "pathFilter": function (path) {
                return path;
            },
            "versions": {},
            "versionFilter": function (stack, path, version) {
                var val = stack[0];

                if (path === "jquery" && version) {
                    val = null;

                    each(stack, function () {
                        if (lookup(this(), "jquery") === version) {
                            val = this;

                            return false;
                        }
                    });
                }

                return {
                    val: val
                };
            },
            "fetch": function (config, path, ready) {},
            "anonymous": function (args) {}
        },
        pendings = {},
        modules = {},
        empty = {};

    function extend(target) {
        each([].slice.call(arguments, 1), function () {
            each(this, function (val, key) {
                target[key] = val;
            });
        });

        return target;
    }

    function getType(obj) {
        return {}.toString.call(obj).match(/\[object ([\s\S]*)\]/)[1];
    }

    function isString(str) {
        return typeof str === "string" || getType(str) === "String";
    }

    function isPlainObject(obj) {
        return getType(obj) === "Object";
    }

    function isArray(str) {
        return getType(str) === "Array";
    }

    function isFunction(str) {
        return getType(str) === "Function";
    }

    function getBasePath(path) {
        path = path.replace(/[^\/]+$/, "");

        if (path.charAt(path.length - 1) !== "/") {
            path += "/";
        }

        return path;
    }

    function implicitExtension(path) {
        if (path.substr(path.length - 3) !== ".js") {
            path += ".js";
        }

        return path;
    }

    function makePath(basePath, currentPath, path, config) {
        var previousPath = "",
            components = lookup(config, "pathFilter")(path).split("/");

        each(lookup(config, "paths"), function (to, from) {
            if (components[0] === from) {
                components[0] = to;
            }
        });

        path = components.join("/");

        path = getBasePath(/^\.\.?\//.test(path) ? currentPath : basePath) + path;

        path = path.replace(/\/\.\//g, "/"); // Resolve same-directory symbols

        // Resolve parent-directory symbols
        while (previousPath !== path) {
            previousPath = path;
            path = path.replace(/[^\/]*\/\.\.\//, "");
        }

        return implicitExtension(path);
    }

    function parse(arg1, arg2, arg3, arg4) {
        var config,
            path,
            dependencies,
            closure;

        if (isPlainObject(arg1)) {
            config = arg1;
        } else if (isString(arg1)) {
            path = arg1;
        } else if (isArray(arg1)) {
            dependencies = arg1;
        } else if (isFunction(arg1)) {
            closure = arg1;
        }

        if (isString(arg2)) {
            path = arg2;
        } else if (isArray(arg2)) {
            dependencies = arg2;
        } else if (isFunction(arg2)) {
            closure = arg2;
        }

        if (isArray(arg3)) {
            dependencies = arg3;
        } else if (isFunction(arg3)) {
            closure = arg3;
        }

        if (isFunction(arg4)) {
            closure = arg4;
        }

        if (config && !path && !dependencies && !closure) {
            closure = config;
            config = null;
        }

        return {
            config: config || {},
            path: path || null,
            dependencies: dependencies || [],
            closure: closure || function () {}
        };
    }

    function getModule(path, config) {
        var result = null;

        if (!modules.hasOwnProperty(path)) {
            return null;
        }

        return lookup(config, "versionFilter")(modules[path], path, lookup(config, "versions")[path]);
    }

    function addModule(path, val) {
        if (!modules[path]) {
            modules[path] = [];
        }

        modules[path].push(val);
    }

    function depend(path, fetch, recheck) {
        if (!pendings[path]) {
            pendings[path] = [];

            fetch(path);
        }

        if (recheck) {
            pendings[path].push(recheck);
        }
    }

    function ready(config, path, dependencies, closure, options) {
        var fetched = false;

        function allDependenciesLoaded() {
            var moduleValue = null;

            function processDependents() {
                var callbacks;

                // Caching may be explicitly disabled, eg. for scoped requires (which would otherwise
                //  overwrite their container module)
                if (options.cache !== false) {
                    addModule(path, moduleValue);

                    if (pendings[path]) {
                        callbacks = pendings[path];

                        delete pendings[path];

                        each(callbacks, function (dependencyLoaded) {
                            dependencyLoaded();
                        });
                    }
                }
            }

            function evaluateModule() {
                var args = [];

                each(dependencies, function (dependencyPath) {
                    var fullPath = makePath(lookup(config, "baseUrl"), path, dependencyPath, config);

                    // Scoped require support
                    if (dependencyPath === "require") {
                        args.push(function (arg1, arg2, arg3, arg4) {
                            var args = parse(arg1, arg2, arg3, arg4);

                            ready(extend({}, config, args.config), args.path || path, args.dependencies, args.closure, {
                                cache: false
                            });
                        });
                    } else {
                        args.push((getModule(dependencyPath, config) || getModule(fullPath, config)).val);
                    }
                });

                return isFunction(closure) ? closure.apply(global, args) : closure;
            }

            moduleValue = evaluateModule();

            // Modules may have no path (eg. an anonymous require(...))
            processDependents();
        }

        function checkDependencies() {
            var allResolved = true;

            each(dependencies, function (dependencyPath) {
                var fullPath = makePath(lookup(config, "baseUrl"), path, dependencyPath, config);

                if (dependencyPath !== "require" && !getModule(dependencyPath, config) && !getModule(fullPath, config)) {
                    if (!fetched) {
                        depend(fullPath, function (path) {
                            lookup(config, "fetch")(config, path, ready);
                        }, checkDependencies);
                    }

                    allResolved = false;
                }
            });

            fetched = true;

            if (allResolved) {
                allDependenciesLoaded();
            }
        }

        options = options || {};

        checkDependencies();
    }

    function require(arg1, arg2, arg3, arg4) {
        var args = parse(arg1, arg2, arg3, arg4);

        ready(extend({}, defaults, args.config), args.path || lookup(args.config, "baseUrl"), args.dependencies, args.closure);
    }

    function define(arg1, arg2, arg3, arg4) {
        var args = parse(arg1, arg2, arg3, arg4),
            config = extend({}, defaults, args.config);

        if (args.path) {
            ready(config, args.path, args.dependencies, args.closure);
        } else {
            lookup(config, "anonymous")(args);
        }
    }

    extend(require, {
        "config": function (config) {
            extend(defaults, config);
        },
        "onError": function (msg) {
            throw new Error(msg);
        }
    });

    extend(define, {
        // Publish support for the AMD pattern
        "amd": {
            "jQuery": true
        }
    });

    // Exports
    extend(global, {
        "require": require,
        "requirejs": require,
        "define": define
    });

    // Browser environment support
    if (global.document) {
        (function () {
            var head = global.document.getElementsByTagName("head")[0],
                on = head.addEventListener ? function (node, type, callback) {
                    node.addEventListener(type, callback, false);
                } : function (node, type, callback) {
                    node.attachEvent("on" + type, callback);
                },
                off = head.removeEventListener ? function (node, type, callback) {
                    node.removeEventListener(type, callback, false);
                } : function (node, type, callback) {
                    node.detachEvent("on" + type, callback);
                },
                useOnLoad = head.addEventListener && (!head.attachEvent || global.opera),
                useDOMContentLoaded = {}.hasOwnProperty.call(global, "DOMContentLoaded"),
                jQuery = lookup(global, "jQuery"),
                anonymouses = [];

            extend(defaults, {
                "baseUrl": global.location.pathname,
                // Overridable - called when a module needs to be loaded
                "fetch": function (config, path, ready) {
                    var script = global.document.createElement("script");

                    on(script, useOnLoad ? "load" : "readystatechange", function onLoad(evt) {
                        var args;

                        if (evt.type === "load" || this.readyState === "loaded" || this.readyState === "complete") {
                            args = anonymouses.pop();

                            if (args) {
                                ready(extend({}, config, args.config), args.path || path, args.dependencies, args.closure);
                            } else {
                                ready({}, path, [], null);
                            }

                            off(script, useOnLoad ? "load" : "readystatechange", onLoad);
                        }
                    });

                    script.setAttribute("type", "text/javascript");
                    script.setAttribute("src", path);

                    head.insertBefore(script, head.firstChild);
                },
                "anonymous": function (args) {
                    anonymouses.push(args);
                }
            });

            each(global.document.getElementsByTagName("script"), function () {
                var main = this.getAttribute("data-main");

                function pull() {
                    depend(implicitExtension(main), function (path) {
                        lookup(defaults, "fetch")({}, path, ready);
                    });
                }

                if (main) {
                    if (this.getAttribute("data-defer") === "yes") {
                        on(global, useDOMContentLoaded ? "DOMContentLoaded" : "load", pull);
                    } else {
                        pull();
                    }
                }
            });

            if (!getModule("jquery", defaults) && jQuery) {
                addModule("jquery", jQuery);
            }
        }());
    }
}());
