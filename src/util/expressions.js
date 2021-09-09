/** @typedef {require("../ez")} JSDoc */

ezDefine("Expressions", function (exports) {
    "use strict";

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
        "like": function (a, b) { return String(a).indexOf(String(b)) !== -1; },
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

    exports.evaluateValue = function (controller, expression, scope) {
        if (typeof scope !== "object" || scope === null) scope = Object.create(null);
        try {
            var result = evaluateValue(controller, expression, scope);
            if ("format" in expression) result = Formatting.format.apply(null, [result].concat(expression.format.map(function (format) {
                return evaluateValue(controller, format, scope);
            })));
            return result;
        } catch (err) {
            var actionMap = {
                "Parameter": function () {
                    while (expression.parent && expression.parent.type !== "Scope" && expression.parent.type !== "HTMLContent") expression = expression.parent;
                    return "the list of " + actionMap.Expression();
                },
                "Expression": function () {
                    return "the expression '" + expression.text + "'";
                },
                "Call": function () {
                    return "the function call '" + expression.parent.text + "'";
                }
            };
            console.error("Error while parsing " + (expression.type in actionMap ? actionMap[expression.type]() : "unknown") + "");
            console.error(err);
            return null;
        }
    };
    exports.getParent = function (controller, expression, scope) {
        if (typeof scope !== "object" || scope === null) scope = Object.create(null);
        return getParent(controller, expression, scope);
    };
    return exports;

    /**
     * 
     * @param {JSDoc.ViewController} controller 
     * @param {JSDoc.EZExpression} expression 
     * @param {{[index:string]: *}} [scope]
     */
    function evaluateValue(controller, expression, scope) {
        if (typeof expression !== "object" || expression === null) return expression;
        if (expression instanceof Array) throw Error("Array in expression");
        return ({
            "Call": function () {
                var callBack = evaluateValue(controller, expression.content, scope);
                var argumentList = expression.arguments;
                argumentList = (argumentList instanceof Array ? argumentList : [argumentList]).map(function (arg) {
                    return evaluateValue(controller, arg, scope);
                });
                return callBack.apply(controller, argumentList);
            },
            "Parameter": function () {
                var result = controller;
                for (var index = 0; index < expression.content.length; index++) {
                    var item = expression.content[index];
                    if (item.type === "Property") {
                        if (item.accessor === undefined) result = evaluateValue(controller, item, scope);
                        else {
                            var property = (item.accessor !== "[") ? item.content : evaluateValue(controller, item, scope);
                            result = item.accessor === "?." && !result ? null : result[property];
                        }
                    } else {
                        property = evaluateValue(controller, item, scope);
                        result = index === 0 ? property : result[property];
                    }
                }
                return result;
            },
            "Property": function () {
                if (typeof expression.content !== "string") return evaluateValue(controller, expression.content, scope);
                else if (expression.content === "null") return null;
                else if (expression.content === "true") return true;
                else if (expression.content === "false") return false;
                else if (expression.content in scope) return scope[expression.content];
                else if (expression.content in controller) return controller[expression.content];
                else if (expression.content === "this") return controller;
                else if (expression.content in window) return window[expression.content];
                else return undefined;
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
                if (!(operator in converions)) throw SyntaxError("Unknown conversion operator " + operator);
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
                if (operator in singleOperations && singleOperations[operator](left)) var right;
                else right = evaluateValue(controller, expression.right, scope);
                return operations[operator](left, right);
            },
            "Ternary": function () {
                return evaluateValue(controller, evaluateValue(controller, expression.condition, scope) ? expression.left : expression.right, scope);
            }
        }[expression.type] || function () {
            throw Error("Invalid expression type");
        })();
    }

    function getParent(controller, expression, scope) {
        var actionMap = {
            "Property": function (parent) {
                var content = expression.content;
                if (typeof content !== "string") content = evaluateValue(controller, content, scope);
                if (content === "null") return;
                else if (content === "true") return;
                else if (content === "false") return;
                else if (parent) { if (content in parent) return { parent: parent, key: content }; }
                else if (content in scope) return { parent: scope, key: content };
                else if (content in controller) return { parent: controller, key: content };
            },
            "Parameter": function () {
                if (expression.content.length === 1) return expression = expression.content[0], this.Property();
                var propertyCopy = {
                    type: "Parameter",
                    content: expression.content.slice(0, expression.content.length - 1)
                };
                var parent = evaluateValue(controller, propertyCopy, scope);
                return expression = expression.content[expression.content.length - 1], this.Property(parent);
            }
        };
        return (actionMap[expression.type] || function () { }).call(actionMap);
    }

});