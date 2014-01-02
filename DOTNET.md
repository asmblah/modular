.NET support
============

JScript.NET issues:
1. Variables must be declared before use (because of Fast mode.)
2. "arguments" cannot be used. Must use named functions and <FunctionName>.arguments (which is invalid in strict mode)
3. Cannot pass an array as the last argument to a function expression (see "Weird function array arg bug" below.)
   Seems to be trying to interpret as a variable arg list.
   Will cause "Unable to cast object of type Microsoft.JScript.JSObject to type System.Object[]" errors
4. Parser struggles with code embedded in strings
   e.g. need to split "(function () {" up as "(func" + "tion () {"
5. Single quotes are supported, despite some unrelated "unterminated string constant" errors
6. Methods are case sensitive (and .NET methods are TitleCase, of course)

Weird function array arg bug
----------------------------

WORKS

    var test = function (obj, array) {

    };

    test({}, [], true); // Note the trailing non-array argument value

    ...

    function test(obj, array) {

    }

    test({}, []);

ERRORS

    var test = function (obj, array) {

    };

    test({}, []); // Note the trailing array argument value
