/** @typedef {require("../ez")} JSDoc */

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
     */
    function evaluateValue(controller, expression) {
        if (typeof expression !== "object") return expression;
        if (expression instanceof Array) return expression.map(function (expr) {
            return evaluateValue(controller, expr);
        });
        return ({
            "Parameter": function () {
                var result = controller;
                for (var index = 0; index < expression.content.length; index++) {
                    var item = expression.content[index];
                    if (item.type === "Property") {
                        var property = (item.accessor !== "[") ? item.content : evaluateValue(controller, item);
                        result = item.accessor === "?." && !result ? null : result[property];
                    } else {
                        property = evaluateValue(controller, item);
                        result = index === 0 ? property : result[property];
                    }
                }
                return result;
            },
            "Property": function () {
                return expression.content === "this" ? controller : controller[expression.content];
            },
            "Expression": function () {
                return ([
                    function () { return null; },
                    function () { return evaluateValue(controller, expression.content[0]); }
                ][expression.content.length] || function () {
                    throw Error("Unhandled expression");
                })();
            },
            "Conversion": function () {
                var operator = expression.operator.content;
                if (!(operator in operations)) throw SyntaxError("Unknown conversoin operator " + operator);
                return converions[operator](evaluateValue(controller, expression.content));
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
                var left = evaluateValue(controller, expression.left);
                var right = (operator in singleOperations && singleOperations[operator](left)) ?
                    undefined : evaluateValue(controller, expression.right);
                return operations[operator](left, right);
            },
            "Ternary": function () {
                return evaluateValue(controller, evaluateValue(controller, expression.condition) ? expression.left : expression.right);
            }
        }[expression.type] || function () {
            throw Error("Invalid expression type");
        })();
    }

});