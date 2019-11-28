/** @typedef {require("../ez")} JSDoc */
// TODO Fix format
ezDefine("Expressions", function (exports) {

    var operations = {
        "*": function (a, b) { return a * b; },
        "/": function (a, b) { return a / b; },
        "%": function (a, b) { return a % b; },
        "+": function (a, b) { return a + b; },
        "-": function (a, b) { return a - b; },
        "<<": function (a, b) { return a << b; },
        ">>": function (a, b) { return a >> b; },
        ">>>": function (a, b) { return a >>> b; },
        "<": function (a, b) { return a < b; },
        "<=": function (a, b) { return a <= b; },
        ">": function (a, b) { return a > b; },
        ">=": function (a, b) { return a >= b; },
        "in": function (a, b) { return a in b; },
        "instanceof": function (a, b) { return a instanceof b; },
        "==": function (a, b) { return a == b; },
        "!=": function (a, b) { return a !== b; },
        "===": function (a, b) { return a === b; },
        "!==": function (a, b) { return a !== b; },
        "&": function (a, b) { return a & b; },
        "^": function (a, b) { return a ^ b; },
        "|": function (a, b) { return a | b; },
        "&&": function (a, b) { return a && b; },
        "||": function (a, b) { return a || b; },
        "**": function (a, b) { return Math.pow(a, b); }
    };

    // to avoid checking the left part of an expression if it's not neccessary
    var singleOperations = {
        "&&": function (a) { return !a; },
        "||": function (a) { return !!a; }
    };

    var converions = {
        "+": function (a) { return +a; },
        "-": function (a) { return -a; },
        "!": function (a) { return !a; },
        "typeof": function (a) { return typeof a; }
    };

    exports.evaluateValue = evaluateValue;
    return exports;

    /**
     * 
     * @param {JSDoc.ViewController} controller 
     * @param {JSDoc.EZExpression} expression 
     * @param {{[index:string]: *}} [scope]
     */
    function evaluateValue(controller, expression, scope) {
        if (typeof expression !== "object" || expression === null) return expression;
        if (typeof scope !== "object" || scope === null) scope = {};
        if (expression instanceof Array) return expression.map(function (expr) {
            return evaluateValue(controller, expr, scope);
        });
        return ({
            "Parameter": function () {
                var result = controller;
                for (var index = 0; index < expression.content.length; index++) {
                    var item = expression.content[index];
                    if (item.type === "Property") {
                        var property = (item.accessor !== "[") ? item.content : evaluateValue(controller, item, scope);
                        result = item.accessor === "?." && !result ? null : result[property];
                    } else {
                        property = evaluateValue(controller, item, scope);
                        result = index === 0 ? property : result[property];
                    }
                }
                return result;
            },
            "Property": function () {
                if (typeof expression.content !== "string") return evaluateValue(controller, expression.content, scope);
                else if (expression.content === "this") return controller;
                else if (expression.content in scope) return scope[expression.content];
                else return controller[expression.content];
            },
            "Expression": function () {
                return ([
                    function () { return null; },
                    function () { return evaluateValue(controller, expression.content[0], scope); }
                ][expression.content.length] || function () {
                    throw Error("Unhandled expression");
                })();
            },
            "Conversion": function () {
                var operator = expression.operator.content;
                if (!(operator in operations)) throw SyntaxError("Unknown conversoin operator " + operator);
                return converions[operator](evaluateValue(controller, expression.content, scope));
            },
            "NumberLiteral": function () {
                return +expression.content;
            },
            "TextLiteral": function () {
                return expression.content;
            },
            "Operation": function () {
                var operator = expression.operator.content;
                if (!(operator in operations)) throw SyntaxError("Unknown operator " + operator);
                var left = evaluateValue(controller, expression.left, scope);
                var right = (operator in singleOperations && singleOperations[operator](left)) ?
                    undefined : evaluateValue(controller, expression.right, scope);
                return operations[operator](left, right);
            },
            "Ternary": function () {
                return evaluateValue(controller, evaluateValue(controller, expression.condition, scope) ? expression.left : expression.right, scope);
            }
        }[expression.type] || function () {
            throw Error("Invalid expression type");
        })();
    }

});