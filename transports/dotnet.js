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

/*
 * Transport for the JScript.NET environment
 */

import System;
import System.CodeDom.Compiler;
import System.IO;
import System.Reflection;
import Microsoft.JScript;

(function () {
    /*global Directory, System */

    "use strict";

    var directory = Directory.GetCurrentDirectory(),
        global = {},
        modular;

    function readFileSync(path) {
        var streamReader = new System.IO.StreamReader(path);

        return streamReader.ReadToEnd();
    }

    // JScript.NET supports the Function constructor, but it is buggy.
    // This implementation leverages the .NET JScript compiler directly.
    function JScriptFunction(args, body) {
        /*global Activator, BindingFlags, CompilerParameters, JScriptCodeProvider */

        var assembly,
            codeProvider,
            compiler,
            error,
            errors = [],
            evaluator,
            evaluatorType,
            index,
            parameters,
            result,
            results,
            success = true;

        codeProvider = new JScriptCodeProvider();
        compiler = codeProvider.CreateCompiler();
        parameters = new CompilerParameters();
        parameters.GenerateInMemory = true;

        results = compiler.CompileAssemblyFromSource(parameters, "pack" + "age Test { cla" + "ss Test { pub" + "lic func" + "tion Eval() { return (func" + "tion (" + args + ") {" + body + "}); } } }");

        if (results.Errors.Count) {
            for (index = 0; index < results.Errors.Count; index++) {
                error = results.Errors[index];

                if (!error.IsWarning) {
                    success = false;
                }

                errors.push(index + ": " + error.ToString());
            }

            if (!success) {
                for (index = 0; index < errors.length; index++) {
                    print(errors[index]);
                }

                throw new Error("Compilation failed");
            }
        }

        assembly = results.CompiledAssembly;
        evaluatorType = assembly.GetType("Test.Test");
        evaluator = Activator.CreateInstance(evaluatorType);

        result = evaluatorType.InvokeMember(
            "Eval",
            BindingFlags.InvokeMethod,
            null,
            evaluator,
            []
        );

        return result;
    }

    new JScriptFunction("", readFileSync(directory + "\\..\\js\\Modular.js")).call(global);

    modular = global.require("modular");

    (function () {
        var anonymousDefine,
            define = modular.createDefiner(),
            require = modular.createRequirer();

        function makePath(baseURI, id) {
            if (/\?/.test(id)) {
                return id;
            }

            if (!/^(https?:)?\/\//.test(id)) {
                id = (baseURI ? baseURI.replace(/\/$/, "") + "/" : "") + id;
            }

            return id.replace(/\.js$/, "") + ".js";
        }

        modular.isDotnet = true;

        modular.configure({
            "baseUrl": directory,
            "defineAnonymous": function (args) {
                anonymousDefine = args;
            },
            "exec": function (args) {
                // Hack to fix issue with frozen native Object class
                // - attempting to read Object.create() throws an error in JScript.NET
                var code = "function Object() {} " + args.code;

                /*jslint evil:true */
                new JScriptFunction("define, require", code)(define, require);
                args.callback();
            },
            "transport": function (callback, module) {
                var path = makePath(module.config.baseUrl, module.id);

                function load(error, code) {
                    if (error) {
                        throw error;
                    }

                    module.config.exec({
                        callback: function () {
                            // Clear anonymousDefine to ensure it is not reused
                            // when the next module doesn't perform anonymous define(...)
                            var args = anonymousDefine;
                            anonymousDefine = null;
                            callback(args);
                        },
                        code: code,
                        path: path
                    });
                }

                if (module.config.async) {
                    throw new Error("Not supported");
                } else {
                    (function () {
                        var code;
                        try {
                            code = readFileSync(path);
                        } catch (error) {
                            load(error);
                            return;
                        }
                        load(null, code);
                    }());
                }
            }
        });
    }());
}());
