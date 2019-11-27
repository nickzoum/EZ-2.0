if (undefined) var Parser = require("../ez").Parser;
// TODO [ez-let] to declare complicated variables in html scopes
// TODO allow all `\s` to work as ` `
/** @typedef {import("../ez")}  JSDoc */
ezDefine("Parser", function (exports) {

    exports.parsePage = parsePage;
    return exports;


    /**
     * 
     * @param {string} pageText
     * @returns {JSDoc.HTMLScope} 
     */
    function parsePage(pageText) {
        /** @type {JSDoc.HTMLScope | JSDoc.HTMLContent | JSDoc.EZAttribute | JSDoc.EZExpression} */
        var scope = {
            type: "HTMLContent",
            dependencies: [],
            content: []
        };
        var attributeName = [];
        var escape = false;
        var index = 0;
        while (index < pageText.length) {
            if (escape) {
                onDefault();
                escape = false;
            } else {
                var letterMap = {
                    "<": function () {
                        ({
                            "Scope": function () {
                                if (startsWith(pageText, index + 1, "!--")) {
                                    scope = {
                                        type: "Scope",
                                        name: "Comment",
                                        closedTag: false,
                                        start: index,
                                        end: null,
                                        attributes: null,
                                        ezAttributes: null,
                                        singleTag: true,
                                        text: null,
                                        parent: scope
                                    };
                                    index += 3;
                                } else if (scope.singleTag && pageText[index + 1] === "/" && scope.closedTag) {
                                    scope.singleTag = false;
                                    scope.closedTag = false;
                                    index += 1;
                                } else {
                                    throw SyntaxError("Undefined Error, Text case should had been run");
                                }
                            },
                            "HTMLContent": function () {
                                if (pageText[index + 1] === "/") {
                                    scope.end = index;
                                    scope.content = scope.content.map(function (item) { return item instanceof Array ? item.join("") : item; });
                                    scope = scope.parent;
                                    scope.singleTag = false;
                                    scope.closedTag = false;
                                    index += 1;
                                } else {
                                    var newScope = {
                                        type: "Scope",
                                        name: [],
                                        closedTag: false,
                                        singleTag: true,
                                        start: index,
                                        end: null,
                                        attributes: {},
                                        ezAttributes: {},
                                        text: {
                                            type: "HTMLContent",
                                            dependencies: [],
                                            content: []
                                        },
                                        parent: scope
                                    };
                                    scope.content.push(newScope);
                                    scope = newScope;
                                }
                            }
                        }[scope.type] || syntax)();
                    },
                    ">": function () {
                        ({
                            "Scope": function () {
                                if (scope.closedTag) throw SyntaxError("Unexpected character '>' at index " + index);
                                else if (scope.singleTag) {
                                    if (attributeName.length) {
                                        var newAttribute = attributeName.join("").replace(/^ez-/, "");
                                        if (newAttribute.length !== attributeName.length) {
                                            scope.ezAttributes[newAttribute] = null;
                                        } else scope.attributes[newAttribute] = null;
                                        attributeName = [];
                                    }
                                    if (scope.name instanceof Array) scope.name = scope.name.join("");
                                    scope.closedTag = true;
                                    scope.text = {
                                        parent: scope,
                                        type: "HTMLContent",
                                        content: [],
                                        dependencies: [],
                                        start: index + 1
                                    };
                                    scope = scope.text;
                                    if (scope.parent.name === "script" || scope.parent.name === "style") {
                                        index = getScriptEnd(pageText, index + 1, scope.parent.name) - 1;
                                        scope.content.push(pageText.substring(scope.start, index + 1));
                                    }
                                } else {
                                    scope.closedTag = true;
                                    scope.end = index + 1;
                                    scope = scope.parent;
                                }
                            }
                        }[scope.type] || syntax)();
                    },
                    " ": function () {
                        ({
                            "Scope": function () {
                                if (scope.name instanceof Array) scope.name = scope.name.join("");
                                if (attributeName.length) {
                                    var newAttribute = attributeName.join("").replace(/^ez-/, "");
                                    if (newAttribute.length !== attributeName.length) {
                                        scope.ezAttributes[newAttribute] = null;
                                    } else scope.attributes[newAttribute] = null;
                                    attributeName = [];
                                }
                            },
                            "HTMLContent": onDefault
                        }[scope.type] || syntax)();
                    },
                    "=": function () {
                        ({
                            "Scope": function () {
                                if (!attributeName.length) throw SyntaxError("Empty attribute name at index " + index + " `" + pageText.substring(index - 15, index) + "->" + pageText[index] + "<-" + pageText.substring(index + 1, 15) + "`");
                                var newAttribute = attributeName.join("").replace(/^ez-/, "");
                                if (newAttribute.length !== attributeName.length) {
                                    var start = pageText[++index];
                                    if (start !== "\"" && start !== "'") throw SyntaxError("Unexpected character '" + start + "', was expecting string \" or '");
                                    var newScopes = Parser.parseExpression(pageText, index + 1);
                                    scope.ezAttributes[newAttribute] = newScopes;
                                    index = newScopes[newScopes.length - 1].end;
                                    newScopes.forEach(function (newScope) { newScope.parent = scope; });
                                } else scope.attributes[newAttribute] = undefined; /* TODO FILL */
                                attributeName = [];
                            }
                        }[scope.type] || syntax)();
                    },
                    "/": function () {
                        ({
                            "Scope": function () {
                                var attributeNames = Object.keys(scope.attributes);
                                if (attributeNames.length && scope.attributes[attributeNames.pop()] instanceof Array) return onDefault();
                                if (scope.singleTag && pageText[index + 1] === ">") {
                                    if (attributeName.length) {
                                        var newAttribute = attributeName.join("").replace(/^ez-/, "");
                                        if (newAttribute.length !== attributeName.length) throw SyntaxError("Ez attributes cannot be empty");
                                        else scope.attributes[newAttribute] = null;
                                        attributeName = [];
                                    }
                                    scope.end = index + 2;
                                    scope = scope.parent;
                                    index += 1;
                                }
                                else throw SyntaxError("Invalid character '/' at index " + index);
                            }
                        }[scope.type] || syntax)();
                    },
                    "\n": function () {
                        this[" "]();
                    },
                    "\r": function () {
                        this[" "]();
                    },
                    "\t": function () {
                        this[" "]();
                    },
                    "$": function () {
                        ({
                            "HTMLContent": function () {
                                if (pageText[index + 1] === "{") {
                                    var newScopes = Parser.parseExpression(pageText, index + 2);
                                    ([
                                        function () {
                                            index = newScopes[0].end;
                                        },
                                        function () {
                                            index = newScopes[1].end;
                                            newScopes[0].format = newScopes[1];
                                            newScopes[1].parent = newScopes[0];
                                        }
                                    ][newScopes.length - 1] || syntax)();
                                    scope.content.push(newScopes[0]);
                                    newScopes[0].parent = scope;
                                }
                            }
                        }[scope.type] || onDefault)();
                    },
                    "\"": function () {
                        ({
                            "Scope": function () {
                                if (attributeName.length) throw SyntaxError("Attribute name cannot include quotes, at index " + index);
                                var attributeNames = Object.keys(scope.attributes);
                                if (!attributeNames.length) throw SyntaxError("Invalid character '\"' at index " + index);
                                var name = attributeNames.pop();
                                if (scope.attributes[name] === undefined) {
                                    scope.attributes[name] = [pageText[index]];
                                } else if (scope.attributes[name]) {
                                    if (scope.attributes[name][0] !== pageText[index]) throw SyntaxError("Invalid closing character, at index " + index);
                                    scope.attributes[name].shift();
                                    scope.attributes[name] = scope.attributes[name].join("");
                                }
                            },
                            "HTMLContent": onDefault
                        }[scope.type] || syntax)();
                    },
                    "'": function () {
                        ({
                            "Scope": function () {
                                if (attributeName.length) throw SyntaxError("Attribute name cannot include quotes, at index " + index);
                                var attributeNames = Object.keys(scope.attributes);
                                if (!attributeNames.length) throw SyntaxError("Invalid character ''' at index " + index);
                                var name = attributeNames.pop();
                                if (scope.attributes[name] === undefined) {
                                    scope.attributes[name] = [pageText[index]];
                                } else if (scope.attributes[name]) {
                                    if (scope.attributes[name][0] !== pageText[index]) throw SyntaxError("Invalid closing character, at index " + index);
                                    scope.attributes[name].unshift();
                                    scope.attributes[name] = scope.attributes[name].join("");
                                }
                            },
                            "HTMLContent": onDefault
                        }[scope.type] || syntax)();
                    },
                    "\\": function () {
                        escape = true;
                    }
                };
                (letterMap[pageText[index]] || onDefault).call(letterMap);
            }
            index += 1;
        }
        return scope;

        function onDefault() {
            if (scope.type === "Scope" && scope.name === "Comment") return;
            ({
                "Scope": function () {
                    if (!scope.singleTag) return;
                    var lastAttriubute = Object.keys(scope.attributes).pop();
                    if (scope.name instanceof Array) scope.name.push(pageText[index]);
                    else if (scope.attributes[lastAttriubute] instanceof Array) scope.attributes[lastAttriubute].push(pageText[index]);
                    else attributeName.push(pageText[index]);
                },
                "HTMLContent": function () {
                    scope.content[((lastIndexOf(scope.content, function (item) { return typeof item === "string"; }) + 1) || scope.content.push("")) - 1] += pageText[index];
                }
            }[scope.type] || syntax)();
        }

        function syntax() {
            throw SyntaxError("Error at index " + index + " '" + pageText.substring(index - 5, index + 5) + "'");
        }
    }

    /**
     * 
     * @param {Array<T>} list 
     * @param {(item: T, index: number, list: Array<T>) => boolean} callBack
     * @template T
     * @returns {number} 
     */
    function lastIndexOf(list, callBack) {
        for (var index = list.length - 1; index >= 0; index--) {
            if (callBack(list[index], index, list)) return index;
        }
        return -1;
    }

    /**
     * 
     * @param {string} pageText 
     * @param {number} index
     * @param {string} tagName
     * @returns {number} 
     */
    function getScriptEnd(pageText, index, tagName) {
        var searchingFor = "</" + tagName + ">";
        var list = [];
        var escape = false;
        var stringMap = {
            "\"": "\"",
            "'": "'",
            "`": "`"
        };
        while (index < pageText.length) {
            if (escape) escape = false;
            else if (pageText[index] === "\\") escape = true;
            else if (pageText[index] in stringMap) {
                if (list[list.length - 1] === pageText[index]) list.pop();
                else list.push(pageText[index]);
            } else if (list.length === 0 && startsWith(pageText, index, searchingFor)) return index;
            index += 1;
        }
        if (list.length) throw SyntaxError("Opened script was never closed");
        return index;
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