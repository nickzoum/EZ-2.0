/** @typedef {import("../ez")} JSDoc */

// TODO [ez-let] to declare complicated variables in html scopes
// TODO property accessors "[",  "]"
ezDefine("Parser", function (exports) {

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
            "in": 11,
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
        var dependencies = {}; // TODO implement dependencies
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
                        "Expression": function () {
                            scope = {
                                type: "Expression",
                                parent: scope,
                                start: index,
                                content: []
                            };
                            scope.parent.content.push(scope);
                        },
                        "TextLiteral": onDefault
                    };
                    (actionMap[scope.type] || syntax).call(actionMap);
                },
                ")": function () {
                    var actionMap = {
                        "Expression": function () {
                            sortExpression();
                            goUp();
                        },
                        "NumberLiteral": function () {
                            goUp(19);
                            this.Expression();
                        },
                        "TextLiteral": onDefault
                    };
                    (actionMap[scope.type] || syntax).call(actionMap);
                },
                "+": function () {
                    if (!onConversion("+")) onArithmetic("+");
                },
                "-": function () {
                    if (!onConversion("-")) onArithmetic("-");
                },
                "*": function () {
                    if (startsWith(pageText, index, "**")) onArithmetic("**");
                    else onArithmetic("*");
                },
                "/": function () {
                    onArithmetic("/");
                },
                "%": function () {
                    onArithmetic("%");
                },
                "&": function () {
                    if (startsWith(pageText, index, "&&")) onArithmetic("&&");
                    else onArithmetic("&");
                },
                "|": function () {
                    if (startsWith(pageText, index, "||")) onArithmetic("||");
                    else onArithmetic("|");
                },
                "^": function () {
                    onArithmetic("^");
                },
                "=": function () {
                    if (startsWith(pageText, index, "===")) onArithmetic("===");
                    else if (startsWith(pageText, index, "==")) onArithmetic("==");
                    else if (scope.type !== "TextLiteral") throw SyntaxError("Single '=' character was found at index " + index);
                },
                ">": function () {
                    if (startsWith(pageText, index, ">=")) onArithmetic(">=");
                    else onArithmetic(">");
                },
                "<": function () {
                    if (startsWith(pageText, index, "<=")) onArithmetic("<=");
                    else onArithmetic("<");
                },
                "?": function () {
                    if (startsWith(pageText, index, "?.")) return this["."]("?.");
                    var self = this;
                    var actionMap = {
                        "Property": function () {
                            // TODO
                        },
                        "Parameter": function () {
                            if (startsWith(pageText, index, "?.")) {
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
                            if (scope.parent === "Parameter") {
                                scope = scope.parent;
                            } else {
                                scope = {
                                    type: "Parameter",
                                    parent: scope.parent,
                                    start: scope.start,
                                    content: [scope]
                                };
                                var parent = scope.content[0].parent;
                                if (parent.content instanceof Array) parent.content.splice(parent.content.indexOf(scope.content[0]), 1, scope);
                                else parent.content = scope;
                            }
                            this.Parameter();
                        },
                        "TextLiteral": onDefault
                    };
                    (actionMap[scope.type] || syntax).call(actionMap);
                    index += fullText.length - 1;
                },
                "[": function () {

                },
                "]": function () {
                    // TODO Check goup
                    ({
                        "Property": function () {
                            // TODO
                        },
                        "TextLiteral": onDefault
                    }[scope.type] || syntax)();
                },
                ",": function () {
                    if (scope.type === "TextLiteral") return onDefault();
                    if (scope.parent) {
                        if (scope.type === "Expression") throw Error("Unclosed brackets");
                        else goUp();
                    }
                    sortExpression();
                    scope.dependencies = Object.keys(dependencies);
                    scope.end = index;
                    var scope = {
                        type: "Expression",
                        start: index + 1,
                        content: [],
                        text: ""
                    };
                    scopeList.push(scope);
                    var dependencies = {};
                },
                ":": function () {
                    onArithmetic(":");
                },
                "!": function () {
                    if (startsWith(pageText, index, "!==")) onArithmetic("!==");
                    else if (startsWith(pageText, index, "!=")) onArithmetic("!=");
                    else if (!onConversion("!", true)) onDefault();
                },
                "i": function () {
                    if (!onText("instanceof") && !onText("in")) onDefault();
                },
                "t": function () {
                    if (!onConversion("typeof", true)) onDefault();
                },
                "o": function () {
                    if (!onText("of")) onDefault();
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
                            // todo check ]
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
                    scope.parent.content.push(scope);
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
                },
                "TextLiteral": onDefault
            };
            (actionMap[scope.type] || syntax).call(actionMap);
        }

        function onText(text) {
            if (scope.type === "TextLiteral") return false;
            if (!startsWith(pageText, index, text) || /\w/.test(pageText[index - 1]) || /\w/.test(pageText[index + text.length])) return false;
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
                    return true;
                }
            };
            return (actionMap[scope.type] || syntax).call(actionMap);
        }

        function onConversion(sign, throwError) {
            if (scope.type === "TextLiteral") return false;
            if (!startsWith(pageText, index, sign) || /\w/.test(pageText[index + sign.length] || "")) return false;
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
                        content: []
                    };
                    scope.operator.parent = scope;
                    scope.parent.content.push(scope);
                    index += sign.length - 1;
                    return true;
                },
                "Expression": function () {
                    var last = scope.content[scope.content.length - 1];
                    if (last === undefined || last.type === "Operator") {
                        return this.Conversion();
                    } else {
                        if (throwError) throw SyntaxError("Unexpected unary operator '" + sign + "' at index " + index);
                        else return false;
                    }
                }
            };
            return (actionMap[scope.type] || syntax).call(actionMap);
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
                    this.Expression();
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
            throw SyntaxError("Error at index " + index + " '" + pageText.substring(index - 5, index + 5) + "'");
        }

        function goUp(precedence) {
            if (!scope.parent) throw SyntaxError("Unexpected expression closing character " + pageText[index]);
            if (scope.type === "Property" && scope.parent.type !== "Parameter") dependencies[scope.content] = 0;
            else if (scope.type === "Parameter") {
                if (scope.content[0].type !== "Property") dependencies["this"] = 0;
                else {
                    var index = 0;
                    var list = [];
                    do {
                        var item = scope.content[index];
                        list.push(item.content);
                        dependencies[list.join(".")] = 0;
                        index += 1;
                    } while (index < scope.content.length && item.type === "Property");
                }
            }
            scope.end = index;
            scope = scope.parent;
            if ((scope.type === "Conversion" || scope.type === "Parameter") && (precedence || 0) < 16) goUp(precedence);
        }

        function sortExpression() {
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

    /**
     * More efficient version of `substring(startingIndex).startsWith(searchingFor)` for large strings
     * @param {string} fullText Large text to look through
     * @param {number} startingIndex index to start looking at
     * @param {string} searchingFor text to find
     * @returns {boolean}
     */
    function startsWith(fullText, startingIndex, searchingFor) {
        for (var index = 0; index < searchingFor.length; index++) {
            if (fullText[startingIndex + index] !== searchingFor[index]) return false;
        }
        return true;
    }

});