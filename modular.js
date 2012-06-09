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
        defaults = {},
        pendings = {},
        modules = {};

    function each(obj, callback) {
        var key;

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                callback.call(obj[key], obj[key], key);
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

    function makePath(path1, path2) {
        // TODO: Resolve parent dir selectors etc.
        var path = getBasePath(path1) + path2,
            previousPath = "";

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

    function loadModule(config, path, dependencies, closure) {
        var basePath = path || config.baseUrl || require.getBasePath();

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
                    var fullPath = makePath(basePath, dependencyPath);

                    args.push(modules[dependencyPath] || modules[fullPath]);
                });

                return closure.apply(global, args);
            }

            moduleValue = evaluateModule();

            if (path) {
                // Modules may have no path (eg. an anonymous require(...))
                processDependents();
            }
        }

        function dependencyLoaded() {
            var allResolved = true;

            each(dependencies, function (dependencyPath) {
                var fullPath = makePath(basePath, dependencyPath);

                if (!modules[dependencyPath] && !modules[fullPath]) {
                    allResolved = false;
                }
            });

            if (allResolved) {
                allDependenciesLoaded();
            }
        }

        function checkDependencies() {
            var allResolved = true;

            each(dependencies, function (dependencyPath) {
                var fullPath = makePath(basePath, dependencyPath);

                if (!modules[dependencyPath] && !modules[fullPath]) {
                    if (!pendings[fullPath]) {
                        pendings[fullPath] = [];

                        require.get(fullPath, loadModule);
                    }

                    pendings[fullPath].push(dependencyLoaded);

                    allResolved = false;
                }
            });

            if (allResolved) {
                allDependenciesLoaded();
            }
        }

        config = extend({}, defaults, config);

        checkDependencies();
    }

    function overload(arg1, arg2, arg3, arg4) {
        var config = {},
            path = null,
            dependencies = [],
            closure = function () {};

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

        return {
            config: config,
            path: path,
            dependencies: dependencies,
            closure: closure
        };
    }

    function require(arg1, arg2, arg3, arg4) {
        var data = overload(arg1, arg2, arg3, arg4);

        loadModule(data.config, null, data.dependencies, data.closure);
    }

    function define(arg1, arg2, arg3, arg4) {
        var data = overload(arg1, arg2, arg3, arg4);

        if (data.path) {
            loadModule(data.config, data.path, data.dependencies, data.closure);
        } else {
            require.define(data);
        }
    }

    define.amd = {
        jQuery: true
    };

    extend(require, (function () {
        var head = global.document.getElementsByTagName("head")[0],
            defines = [];

        return {
            getBasePath: function () {
                return global.location.pathname;
            },
            // Overridable - called when a module needs to be loaded
            get: function (path, loadModule) {
                var script = global.document.createElement("script");

                script.setAttribute("type", "text/javascript");
                script.setAttribute("src", path);

                script.onload = script.onreadystatechange = function () {
                    var data;

                    if (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") {
                        data = defines.pop();

                        loadModule(data.config, data.path || path, data.dependencies, data.closure);
                    }
                };

                head.insertBefore(script, head.firstChild);
            },
            define: function (data) {
                defines.push(data);
            }
        };
    }()));

    // Exports
    global.require = require;
    global.define = define;
}());
