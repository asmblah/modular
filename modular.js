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

    var global = new Function("return this;")(),
        defaults = {
            "baseUrl": "",
            "fetch": function (path, ready) {},
            "anonymous": function (args) {}
        },
        pendings = {},
        modules = {};

    function each(obj, callback) {
        var key;

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (callback.call(obj[key], obj[key], key) === false) {
                    break;
                }
            }
        }

        return obj;
    }

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

    function makePath(basePath, currentPath, path, pathMappings) {
        var previousPath = "",
            components = path.split("/");

        each(pathMappings || {}, function (to, from) {
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

        // Append implicit ".js" extension
        if (path.substr(path.length - 3) !== ".js") {
            path += ".js";
        }

        return path;
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

    function findModule(names) {
        var result = null;

        each(names, function (name) {
            if (modules.hasOwnProperty(name)) {
                result = name;

                return false;
            }
        });

        return result;
    }

    function getModule(names) {
        var name = findModule(names);

        return name ? modules[name] : null;
    }

    function ready(config, path, dependencies, closure) {
        var fetched = false;

        function allDependenciesLoaded() {
            var moduleValue = null;

            function processDependents() {
                var callbacks;

                modules[path] = moduleValue;

                if (pendings[path]) {
                    callbacks = pendings[path];

                    delete pendings[path];

                    each(callbacks, function (dependencyLoaded) {
                        dependencyLoaded();
                    });
                }
            }

            function evaluateModule() {
                var args = [];

                each(dependencies, function (dependencyPath) {
                    var fullPath = makePath(config.baseUrl, path, dependencyPath, config.paths);

                    // Scoped require support
                    if (dependencyPath === "require") {
                        args.push(function (arg1, arg2, arg3, arg4) {
                            var args = parse(arg1, arg2, arg3, arg4);

                            global.require(extend({}, config, args.config), args.path || path, args.dependencies, args.closure);
                        });
                    } else {
                        args.push(getModule([dependencyPath, fullPath]));
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
                var fullPath = makePath(config.baseUrl, path, dependencyPath, config.paths);

                if (dependencyPath !== "require" && !findModule([dependencyPath, fullPath])) {
                    if (!fetched) {
                        if (!pendings[fullPath]) {
                            pendings[fullPath] = [];

                            config.fetch(fullPath, ready);
                        }

                        pendings[fullPath].push(checkDependencies);
                    }

                    allResolved = false;
                }
            });

            fetched = true;

            if (allResolved) {
                allDependenciesLoaded();
            }
        }

        checkDependencies();
    }

    function require(arg1, arg2, arg3, arg4) {
        var args = parse(arg1, arg2, arg3, arg4);

        ready(extend({}, defaults, args.config), args.path || args.config.baseUrl, args.dependencies, args.closure);
    }

    function define(arg1, arg2, arg3, arg4) {
        var args = parse(arg1, arg2, arg3, arg4),
            config = extend({}, defaults, args.config);

        if (args.path) {
            ready(config, args.path, args.dependencies, args.closure);
        } else {
            config.anonymous(args);
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
        extend(defaults, (function () {
            var head = global.document.getElementsByTagName("head")[0],
                anonymouses = [];

            return {
                "baseUrl": global.location.pathname,
                // Overridable - called when a module needs to be loaded
                "fetch": function (path, ready) {
                    var script = global.document.createElement("script"),
                        config = this;

                    script.setAttribute("type", "text/javascript");
                    script.setAttribute("src", path);

                    script.onload = script.onreadystatechange = function () {
                        var args;

                        if (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") {
                            args = anonymouses.pop();

                            if (args) {
                                ready(extend({}, config, args.config), args.path || path, args.dependencies, args.closure);
                            } else {
                                ready({}, path, [], null);
                            }
                        }

                        script.onload = script.onreadystatechange = null;
                    };

                    head.insertBefore(script, head.firstChild);
                },
                "anonymous": function (args) {
                    anonymouses.push(args);
                }
            };
        }()));
    }
}());
