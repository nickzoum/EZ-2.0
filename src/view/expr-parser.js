if (undefined) var Util = require("../ez").Util;

/** @typedef {import("../ez")} JSDoc */

// TODO implement array and object literals

ezDefine("Parser", function (exports) {
    "use strict";

    var propertyKeywords = ["null", "true", "false"];

    var operators = {
        leftToRight: {
            "*": 14,
            "/": 14,
            "%": 14,
            "+": 13,
            "-": 13,
            "<<": 12,
            ">>": 12,
            ">>>": 12,
            "<": 11,
            "<=": 11,
            ">": 11,
            ">=": 11,
            "of": 11,
            "in": 11,
            "like": 11,
            "instanceof": 11,
            "==": 10,
            "!=": 10,
            "===": 10,
            "!==": 10,
            "&": 9,
            "^": 8,
            "|": 7,
            "&&": 6,
            "||": 5
        },
        rightToLeft: {
            "**": 15
        }
    };

    /** @type {Array<{[operator: string] : number; order: string;}>} */
    var operatorOrder = Object.keys(operators).reduce(function (result, listName) {
        return Object.keys(operators[listName]).reduce(function (result, operator) {
            var precedence = operators[listName][operator];
            if (!(precedence in result)) result[precedence] = { order: listName };
            return result[precedence][operator] = precedence, result;
        }, result);
    }, []).reduceRight(function (result, item) { return result.push(item), result; }, []);

    exports.parseExpression = parseExpression;
    return exports;

    /**
     * 
     * @param {JSDoc.HTMLContent | JSDoc.HTMLScope} scope
     * @param {string} pageText 
     * @param {number} index
     * @returns {number} 
     */
    function parseExpression(pageText, index) {
        if (arguments.length === 1) index = 0;
        var startCharacter = pageText[index - 1];
        if (startCharacter === "{") startCharacter = "}";
        var scope = {
            type: "Expression",
            start: index,
            content: [],
            text: ""
        };
        var scopeList = [scope]; // TODO support scopelist in html-parser and other scripts
        var dependencies = {};
        var char = pageText[index];
        while (index < pageText.length && (char !== startCharacter || scope.type === "TextLiteral")) {
            var actionMap = {
                "\\": function () {
                    index += 1;
                    if (scope.type === "TextLiteral") onDefault();
                    else if (["\"", "'", "`"].includes(char)) this[char]();
                    else throw SyntaxError("Unexpected character '\\' at index " + --index);
                },
                "\"": function () {
                    onQuote("\"");
                },
                "'": function () {
                    onQuote("'");
                },
                "`": function () {
                    onQuote("`");
                },
                "(": function () {
                    var actionMap = {
                        "Parameter": function () {
                            scope = {
                                type: "Call",
                                parent: scope.parent,
                                start: scope.start,
                                content: scope,
                                arguments: []
                            };
                            var parent = scope.content.parent;
                            if (parent.content instanceof Array) parent.content.splice(parent.content.indexOf(scope.content), 1, scope);
                            else parent.content = scope;
                            scope = {
                                type: "Expression",
                                parent: scope,
                                start: index,
                                content: []
                            };
                            scope.parent.arguments.push(scope);
                        },
                        "Property": function () {
                            if (scope.accessor !== "[") {
                                if (scope.parent.type === "Parameter") goUp(19);
                            }
                            this.Parameter();
                        },
                        "Expression": function () {
                            scope = {
                                type: "Expression",
                                parent: scope,
                                start: index,
                                content: []
                            };
                            scope.parent.content.push(scope);
                        },
                        "Conversion": function () {
                            scope = {
                                type: "Expression",
                                parent: scope,
                                start: index,
                                content: []
                            };
                            scope.parent.content = scope;
                        },
                        "TextLiteral": onDefault
                    };
                    (actionMap[scope.type] || syntax).call(actionMap);
                },
                ")": function () {
                    var innerMap = {
                        "Expression": function () {
                            if (!scope.parent || scope.parent.type === "Property") throw Error("Unexpected closing parenthesis ')'");
                            sortExpression();
                            goUp();
                            if (scope.type === "Call") {
                                if (scope.arguments[scope.arguments.length - 1].content.length === 0) scope.arguments.pop();
                                goUp();
                            }
                        },
                        "NumberLiteral": function () {
                            goUp(19);
                            this.Expression();
                        },
                        "TextLiteral": onDefault,
                        "Property": function () {
                            goUp();
                            actionMap[")"]();
                        }
                    };
                    (innerMap[scope.type] || syntax).call(innerMap);
                },
                "+": function () {
                    if (!onConversion("+", true, false)) onArithmetic("+");
                },
                "-": function () {
                    if (!onConversion("-", true, false)) onArithmetic("-");
                },
                "*": function () {
                    if (Util.startsWith(pageText, index, "**")) onArithmetic("**");
                    else onArithmetic("*");
                },
                "/": function () {
                    onArithmetic("/");
                },
                "%": function () {
                    onArithmetic("%");
                },
                "&": function () {
                    if (Util.startsWith(pageText, index, "&&")) onArithmetic("&&");
                    else onArithmetic("&");
                },
                "|": function () {
                    if (Util.startsWith(pageText, index, "||")) onArithmetic("||");
                    else onArithmetic("|");
                },
                "^": function () {
                    onArithmetic("^");
                },
                "=": function () {
                    if (Util.startsWith(pageText, index, "===")) onArithmetic("===");
                    else if (Util.startsWith(pageText, index, "==")) onArithmetic("==");
                    else if (scope.type !== "TextLiteral") throw SyntaxError("Single '=' character was found at index " + index);
                },
                ">": function () {
                    if (Util.startsWith(pageText, index, ">=")) onArithmetic(">=");
                    else onArithmetic(">");
                },
                "<": function () {
                    if (Util.startsWith(pageText, index, "<=")) onArithmetic("<=");
                    else onArithmetic("<");
                },
                "?": function () {
                    if (Util.startsWith(pageText, index, "?.")) return this["."]("?.");
                    var self = this;
                    var actionMap = {
                        "NumberLiteral": function () {
                            goUp(19);
                            self["?"]();
                        },
                        "Property": function () {
                            goUp(19);
                            // TODO check ]
                        },
                        "Parameter": function () {
                            if (Util.startsWith(pageText, index, "?.")) {
                                scope.content += "?.";
                                index += 1;
                            } else {
                                goUp();
                                self["?"]();
                            }
                        },
                        "Expression": function () {
                            scope.content.push({
                                type: "Operator",
                                parent: scope,
                                content: "?",
                                start: index,
                                end: index + 1
                            });
                        },
                        "TextLiteral": onDefault
                    };
                    (actionMap[scope.type] || syntax).call(actionMap);
                },
                ".": function (fullText) {
                    fullText = fullText || ".";
                    var actionMap = {
                        "Expression": function () {
                            //if (scope.parent === undefined) scope = scope.content[scope.content.length - 1];
                            var self = this;
                            var previous = scope.content[scope.content.length - 1];
                            if (!previous) {
                                ({
                                    "[": function () {

                                    }
                                }[fullText] || syntax)();
                            }
                            var previousMap = {
                                "Parameter": function () {
                                    scope = previous;
                                    self.Parameter();
                                },
                                "Expression": function () {
                                    scope = previous;
                                    self.Property();
                                },
                                "TextLiteral": function () {
                                    this.Expression();
                                },
                                "NumberLiteral": function () {
                                    this.Expression();
                                },
                                "Operator": function () {
                                    scope = {
                                        type: "NumberLiteral",
                                        parent: scope,
                                        start: index,
                                        content: "."
                                    };
                                    scope.parent.content.push(scope);
                                }
                            };
                            (previousMap[previous && previous.type || "Operator"] || syntax).call(previousMap);
                        },
                        "Parameter": function () {
                            scope = {
                                type: "Property",
                                parent: scope,
                                start: index,
                                content: "",
                                accessor: fullText
                            };
                            scope.parent.content.push(scope);
                        },
                        "Conversion": function () {
                            scope.end = index;
                            scope = {
                                type: "Property",
                                parent: scope,
                                start: index,
                                content: scope
                            };
                            if (scope.parent.content) throw Error("Invalid conversion");
                            scope.parent.content = scope;
                            this.Parameter();
                        },
                        "NumberLiteral": function () {
                            if (scope.content.includes(".")) {
                                this.Property();
                            } else onDefault();
                        },
                        "Property": function () {
                            scope.end = index;
                            if (scope.parent.type === "Parameter") {
                                scope = scope.parent;
                            } else {
                                var oldScope = scope;
                                scope = {
                                    type: "Parameter",
                                    parent: oldScope.parent,
                                    start: oldScope.start,
                                    content: [oldScope]
                                };
                                var parent = oldScope.parent;
                                if (parent.content instanceof Array) parent.content.splice(parent.content.indexOf(oldScope), 1, scope);
                                else parent.content = scope;
                                oldScope.parent = scope;
                            }
                            this.Parameter();
                        },
                        "TextLiteral": onDefault
                    };
                    (actionMap[scope.type] || syntax).call(actionMap);
                    index += fullText.length - 1;
                },
                "[": function () {
                    if (scope.type === "TextLiteral") return onDefault();
                    this["."]("[");
                    scope = {
                        type: "Expression",
                        parent: scope,
                        start: index,
                        content: []
                    };
                    scope.parent.content = scope;
                },
                "]": function () {
                    if (scope.type === "TextLiteral") return onDefault();
                    while (scope && scope.type !== "Expression") goUp();
                    if (!scope || scope.type !== "Expression") throw Error("Unexpected closing parenthesis ')'");
                    sortExpression();
                    goUp();
                    goUp();
                },
                ",": function () {
                    if (scope.type === "TextLiteral") return onDefault();
                    while (scope.parent && scope.type !== "Call") {
                        if (scope.type === "Expression") {
                            if (scope.parent.type === "Call") goUp();
                            else throw Error("Unclosed brackets");
                        } else goUp();
                    }
                    ({
                        "Expression": function () {
                            sortExpression();
                            scope.dependencies = Object.keys(dependencies);
                            if ("null" in dependencies && scope.dependencies.length > 1) scope.dependencies = ["null"];
                            scope.end = index;
                            scope = {
                                type: "Expression",
                                start: index + 1,
                                content: [],
                                text: ""
                            };
                            scopeList.push(scope);
                            dependencies = {};
                            char = "";
                        },
                        "Call": function () {
                            scope = {
                                type: "Expression",
                                parent: scope,
                                start: index,
                                content: []
                            };
                            scope.parent.arguments.push(scope);
                        }
                    }[scope.type] || syntax)();
                },
                ":": function () {
                    onArithmetic(":");
                },
                "!": function () {
                    if (Util.startsWith(pageText, index, "!==")) onArithmetic("!==");
                    else if (Util.startsWith(pageText, index, "!=")) onArithmetic("!=");
                    else if (!onConversion("!", true, true)) onDefault();
                },
                "i": function () {
                    if (!onText("instanceof") && !onText("in")) onDefault();
                },
                "t": function () {
                    if (!onConversion("typeof", false, true)) onDefault();
                },
                "o": function () {
                    if (!onText("of")) onDefault();
                },
                "l": function () {
                    if (!onText("like")) onDefault();
                },
                " ": function () {
                    var actionMap = {
                        "NumberLiteral": function () {
                            goUp();
                        },
                        "Parameter": function () {
                            goUp(19);
                        },
                        "Property": function () {
                            goUp(19);
                            // TODO check ]
                        },
                        "Expression": function () {

                        },
                        "Conversion": function () {

                        },
                        "TextLiteral": onDefault
                    };
                    (actionMap[scope.type] || syntax).call(actionMap);
                },
                "\t": function () {
                    this[" "]();
                },
                "\r": function () {
                    index = pageText.length;
                },
                "\n": function () {
                    index = pageText.length;
                }
            };
            (actionMap[char] || onDefault).call(actionMap);
            scopeList[scopeList.length - 1].text += char;
            index += 1;
            char = pageText[index];
        }
        if (scope.parent) {
            if (scope.type === "Expression") throw Error("Unclosed brackets");
            else goUp();
        }
        sortExpression();
        if (char !== startCharacter) throw SyntaxError("Unclosed ez-attribute at index " + index);
        scope.dependencies = Object.keys(dependencies);
        if ("null" in dependencies && scope.dependencies.length > 1) scope.dependencies = ["null"];
        scope.end = index;
        return scopeList;

        function onQuote(quote) {
            var actionMap = {
                "Conversion": function () {
                    scope = {
                        type: "TextLiteral",
                        parent: scope,
                        start: index,
                        content: "",
                        quote: quote
                    };
                    if (scope.parent.content) throw Error("Invalid conversion");
                    scope.parent.content = scope;
                },
                "TextLiteral": function () {
                    if (scope.quote === quote) {
                        goUp();
                    } else onDefault();
                },
                "Expression": function () {
                    scope = {
                        type: "TextLiteral",
                        parent: scope,
                        start: index,
                        content: "",
                        quote: quote
                    };
                    scope.parent.content.push(scope);
                }
            };
            (actionMap[scope.type] || syntax).call(actionMap);
        }

        function onArithmetic(sign) {
            var actionMap = {
                "Parameter": function () {
                    goUp();
                    onArithmetic(sign);
                },
                "Property": function () {
                    goUp();
                    onArithmetic(sign);
                },
                "NumberLiteral": function () {
                    goUp();
                    onArithmetic(sign);
                },
                "Expression": function () {
                    scope.content.push({
                        type: "Operator",
                        content: sign,
                        start: index,
                        end: index + sign.length
                    });
                    index += sign.length - 1;
                    scopeList[scopeList.length - 1].text += sign;
                    char = "";
                },
                "Conversion": function () {
                    goUp();
                    onArithmetic(sign);
                },
                "TextLiteral": onDefault
            };
            (actionMap[scope.type] || syntax).call(actionMap);
        }

        function onText(text) {
            if (scope.type === "TextLiteral") return false;
            if (!Util.startsWith(pageText, index, text) || /\w/.test(pageText[index - 1]) || /\w/.test(pageText[index + text.length])) return false;
            var actionMap = {
                "Expression": function () {
                    scope.content.push({
                        type: "Operator",
                        parent: scope,
                        content: text,
                        start: index,
                        end: index + text.length
                    });
                    index += text.length - 1;
                    char = "";
                    scopeList[scopeList.length - 1].text += text;
                    return true;
                }
            };
            return (actionMap[scope.type] || syntax).call(actionMap);
        }

        function onConversion(sign, standAlone, throwError) {
            if (scope.type === "TextLiteral") return false;
            if (!Util.startsWith(pageText, index, sign) || (!standAlone && /\w/.test(pageText[index + sign.length] || ""))) return false;
            var actionMap = {
                "Conversion": function () {
                    scope = {
                        type: "Conversion",
                        operator: {
                            type: "Operator",
                            content: sign,
                            start: index,
                            end: index + sign.length
                        },
                        parent: scope,
                        start: index,
                        content: null
                    };
                    scope.operator.parent = scope;
                    if (scope.parent.content) throw Error("Invalid conversion");
                    scope.parent.content = scope;
                    index += sign.length - 1;
                    scopeList[scopeList.length - 1].text += sign;
                    char = "";
                    return true;
                },
                "Expression": function () {
                    var last = scope.content[scope.content.length - 1];
                    if (last === undefined || last.type === "Operator") {
                        scope = {
                            type: "Conversion",
                            operator: {
                                type: "Operator",
                                content: sign,
                                start: index,
                                end: index + sign.length
                            },
                            parent: scope,
                            start: index,
                            content: null
                        };
                        scope.operator.parent = scope;
                        scope.parent.content.push(scope);
                        index += sign.length - 1;
                        scopeList[scopeList.length - 1].text += sign;
                        char = "";
                        return true;
                    } else {
                        if (throwError) throw SyntaxError("Unexpected unary operator '" + sign + "' at index " + index);
                        else return false;
                    }
                }
            };
            if (scope.type in actionMap) return actionMap[scope.type]();
            return false;
        }

        function onDefault() {
            var actionMap = {
                "TextLiteral": function () {
                    scope.content += pageText[index];
                },
                "NumberLiteral": function () {
                    scope.content += pageText[index];
                },
                "Conversion": function () {
                    if (/\d/.test(pageText[index])) {
                        scope = {
                            type: "NumberLiteral",
                            parent: scope,
                            content: pageText[index]
                        };
                    } else {
                        scope = {
                            type: "Property",
                            parent: scope,
                            content: pageText[index]
                        };
                    }
                    scope.start = index;
                    if (scope.parent.content) throw Error("Invalid conversion");
                    scope.parent.content = scope;
                },
                "Property": function () {
                    if (pageText[index] === ".") throw SyntaxError("Property cannot contain the '.' character");
                    scope.content += pageText[index];
                },
                "Parameter": function () {
                    scope.content[scope.content.length - 1] += pageText[index];
                },
                "Expression": function () {
                    if (/\d/.test(pageText[index])) {
                        scope = {
                            type: "NumberLiteral",
                            parent: scope,
                            content: pageText[index]
                        };
                    } else {
                        scope = {
                            type: "Property",
                            parent: scope,
                            content: pageText[index]
                        };
                    }
                    scope.start = index;
                    scope.parent.content.push(scope);
                }
            };
            (actionMap[scope.type] || syntax).call(actionMap);
        }

        function syntax() {
            console.log(scope.type);
            console.log(pageText[index]);
            console.log(pageText[index] + pageText[index + 1] + pageText[index + 2]);
            throw SyntaxError("Error at index " + index + " '" + pageText.substring(index - 5, index + 5) + "'");
        }

        function addDependencies() {
            var actionMap = {
                "Property": function () {
                    if (scope.parent.type !== "Parameter" && !propertyKeywords.includes(scope.content)) dependencies[scope.content] = 0;
                },
                "Parameter": function () {
                    if (scope.content[0].type !== "Property") return;
                    var list = [];
                    var scopeIndex = 0;
                    var item = scope.content[0];
                    while (item && item.type === "Property") {
                        if (item.accessor === "[") {
                            item = item.content.content[0];
                            if (item.type === "TextLiteral") list.push(item.content);
                            else if (item.type === "Property") list[list.length - 1] += "[" + item.content + "]";
                            else return dependencies["null"] = 0;
                            dependencies[list.join(".")] = 0;
                        } else if (item.content !== "this") {
                            list.push(item.content);
                            dependencies[list.join(".")] = 0;
                        }
                        item = scope.content[++scopeIndex];
                    }
                }
            };
            if (scope.type in actionMap) actionMap[scope.type]();
        }

        function goUp(precedence) {
            if (!scope.parent) throw SyntaxError("Unexpected expression closing character " + pageText[index]);
            addDependencies();
            scope.end = index;
            scope = scope.parent;
            if ((scope.type === "Conversion" || scope.type === "Parameter") && (precedence || 0) < 16) goUp(precedence);
        }

        function sortExpression() {
            var hasOperation;
            scope.content.forEach(function (childScope, index) {
                var isOperator = childScope.type === "Operator";
                if (hasOperation === isOperator) {
                    var previousText = scope.content[index - 1].content || scope.content[index - 1].text;
                    var currentText = childScope.content || childScope.text;
                    var text = scope.text;
                    var message = hasOperation ? "there was no variable between the operators" : "there was no operator between the variables";
                    throw SyntaxError("Invalid Sequence, " + message + " '" + previousText + "' and '" + currentText + "' in the expression '" + text + "'");
                }
                hasOperation = isOperator;
            });
            operatorOrder.reduce(function (result, precedence) {
                var condition = precedence.order === "leftToRight";
                for (var index = condition ? 1 : result.length - 2; condition ? index <= result.length - 2 : index >= 1;) {
                    if (result[index].type === "Operator" && result[index].content in precedence && result[index].content !== "order") {
                        result.splice(index - 1, 3, {
                            type: "Operation",
                            left: result[index - 1],
                            right: result[index + 1],
                            operator: result[index],
                            parent: scope.parent,
                            start: result[index - 1].start,
                            end: result[index + 1].end
                        });
                        index -= 1;
                    }
                    index += condition ? 1 : -1;
                }
                return result;
            }, scope.content);
            var skippedTernary = true;
            while (skippedTernary) {
                skippedTernary = false;
                for (var index = scope.content.length - 2; index > 0; index--) {
                    if (scope.content[index].content === ":") {
                        if (scope.content[index - 2].content === "?") {
                            scope.content.splice(index - 3, 5, {
                                type: "Ternary",
                                condition: scope.content[index - 3],
                                left: scope.content[index - 1],
                                right: scope.content[index + 1],
                                start: scope.content[index - 3].start,
                                end: scope.content[index + 1].end
                            });
                            index -= 3;
                        } else {
                            skippedTernary = true;
                        }
                    }
                }
            }
        }
    }

});