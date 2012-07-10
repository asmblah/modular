/*
 *  Modular - JavaScript AMD Framework
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

    var ROOT_REGEX = /^\//,
        global = new [Function][0]("return this;")(), // Keep JSLint happy
        defaults = {
            "baseUrl": "",
            "paths": {},
            "pathFilter": function (path) {
                return path;
            },
            "versions": {},
            "versionFilter": function (stack, path, version) {
                return {
                    val: stack[0]
                };
            },
            "fetch": function (config, path, ready) {},
            "anonymous": function (args) {}
        },
        pendings = {},
        modules = {},
        has = {}.hasOwnProperty,
        slice = [].slice;

    function each(obj, callback) {
        var key,
            length;

        if (!obj) {
            return;
        }

        if (has.call(obj, "length")) {
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
    }

    // For Closure compiler name-munging while keeping JSLint happy
    function lookup(obj, name) {
        return obj[name];
    }
    function put(obj, name, val) {
        obj[name] = val;
    }

    function extend(target) {
        each(slice.call(arguments, 1), function () {
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
            components;

        if (!ROOT_REGEX.test(path)) {
            components = lookup(config, "pathFilter")(path).split("/");

            each(lookup(config, "paths"), function (to, from) {
                if (components[0] === from) {
                    components[0] = to;
                }
            });

            path = components.join("/");
        }

        path = getBasePath(/^\.\.?\//.test(path) ? currentPath : basePath) + path.replace(ROOT_REGEX, "");

        path = path.replace(/\/\.\//g, "/"); // Resolve same-directory symbols

        // Resolve parent-directory symbols
        while (previousPath !== path) {
            previousPath = path;
            path = path.replace(/[^\/]*\/\.\.\//, "");
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

        function processDependents(moduleValue) {
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

        function checkDependencies() {
            var allResolved = true,
                moduleValue = null,
                args = [];

            each(dependencies, function (dependencyPath) {
                var fullPath = makePath(lookup(config, "baseUrl"), path, dependencyPath, config),
                    result;

                // Scoped require support
                if (dependencyPath === "require") {
                    args.push(function (arg1, arg2, arg3, arg4) {
                        var args = parse(arg1, arg2, arg3, arg4);

                        ready(extend({}, config, args.config), args.path || path, args.dependencies, args.closure, {
                            cache: false
                        });
                    });
                // Exports support
                } else if (dependencyPath === "exports") {
                    moduleValue = {};
                    args.push(moduleValue);
                } else {
                    result = getModule(dependencyPath, config) || getModule(fullPath, config);

                    if (result) {
                        args.push(result.val);
                    } else {
                        if (!fetched) {
                            depend(fullPath, function (path) {
                                lookup(config, "fetch")(config, path, ready);
                            }, checkDependencies);
                        }

                        allResolved = false;
                    }
                }
            });

            fetched = true;

            if (allResolved) {
                moduleValue = (isFunction(closure) ? closure.apply(global, args) : closure) || moduleValue;

                processDependents(moduleValue);
            }
        }

        options = options || {};

        checkDependencies();
    }

    function makeRequire(parentConfig) {
        return function (arg1, arg2, arg3, arg4) {
            var args = parse(arg1, arg2, arg3, arg4),
                config = extend({}, parentConfig, args.config);

            return require(config, args.path, args.dependencies, args.closure);
        };
    }

    function require(arg1, arg2, arg3, arg4) {
        var args = parse(arg1, arg2, arg3, arg4),
            config = extend({}, defaults, args.config);

        ready(config, args.path || lookup(config, "baseUrl"), args.dependencies, args.closure);

        return makeRequire(config);
    }

    function define(arg1, arg2, arg3, arg4) {
        var args = parse(arg1, arg2, arg3, arg4),
            config = extend({}, defaults, args.config);

        if (args.path) {
            ready(config, args.path, args.dependencies, args.closure);
        } else {
            lookup(config, "anonymous")(args);
        }

        return makeRequire(args.config);
    }

    extend(require, {
        "config": function (config) {
            return makeRequire(config);
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
    if (!lookup(global, "require")) {
        extend(global, {
            "require": require,
            "define": define
        });
    }
    if (!lookup(global, "requirejs")) {
        put(global, "requirejs", require);
    }

    // Browser environment support
    if (global.document) {
        (function (document) {
            var scripts = document.getElementsByTagName("script"),
                head = scripts[0].parentNode,
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
                type = useOnLoad ? "load" : "readystatechange",
                useDOMContentLoaded = has.call(global, "DOMContentLoaded"),
                jQuery = lookup(global, "jQuery"),
                anonymouses = [],
                fetchScripts = {},
                activeScript = null,
                contextProperty = "__modularContext";

            function gotModule(context, args) {
                if (args) {
                    context.ready(extend({}, context.config, args.config), args.path || context.path, args.dependencies, args.closure);
                } else {
                    context.ready({}, context.path, [], null);
                }

                head.removeChild(context.script);
            }

            extend(defaults, {
                "baseUrl": global.location.pathname,
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
                // Overridable - called when a module needs to be loaded
                "fetch": function (config, path, ready) {
                    var script = document.createElement("script"),
                        context = {
                            config: config,
                            path: path,
                            ready: ready,
                            script: script
                        },
                        time = 0;

                    if (!useOnLoad) {
                        put(script, contextProperty, context);
                    }

                    on(script, type, function checkLoaded() {
                        var args;

                        if (useOnLoad) {
                            off(script, type, checkLoaded);

                            args = anonymouses.pop();

                            gotModule(context, args);
                        } else if (/complete|loaded/.test(script.readyState) && lookup(script, contextProperty)) {
                            if (time < 1000) {
                                time += 50;

                                global.setTimeout(checkLoaded, 50);
                            } else {
                                off(script, type, checkLoaded);

                                gotModule(context, null);
                                put(script, contextProperty, null);
                                activeScript = null;
                            }
                        }
                    });

                    script.setAttribute("type", "text/javascript");
                    script.setAttribute("src", implicitExtension(path));

                    fetchScripts[path] = script;

                    // IE in some cache states will execute script upon insertion
                    activeScript = script;
                    head.insertBefore(script, head.firstChild);
                    activeScript = null;
                },
                "anonymous": function (args) {
                    var context;

                    if (useOnLoad) {
                        anonymouses.push(args);
                    } else {
                        if (!activeScript) {
                            // Not in a special IE cache state: need to do more work
                            each(fetchScripts, function () {
                                // Currently executing script will be "interactive"
                                if (this.readyState === "interactive") {
                                    activeScript = this;
                                }
                            });
                        }

                        // Pull out context & remove from element to avoid memory leak
                        context = lookup(activeScript, contextProperty);
                        put(activeScript, contextProperty, null);

                        activeScript = null;
                        delete fetchScripts[context.path];

                        gotModule(context, args);
                    }
                }
            });

            each(scripts, function () {
                var main = this.getAttribute("data-main");

                if (main) {
                    depend(main, function (path) {
                        lookup(defaults, "fetch")({}, path, ready);
                    });
                }
            });

            if (!getModule("jquery", defaults) && jQuery) {
                addModule("jquery", jQuery);
            }
        }(global.document));
    }
}());
