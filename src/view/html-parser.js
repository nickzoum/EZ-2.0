if (undefined) var Parser = require("../ez").Parser;
if (undefined) var Util = require("../ez").Util;

// TODO allow numeric attributes (keep active attribute instead of Object.keys().pop)
// TODO fix line number and column number on new lines inside scripts and comments
/** @typedef {import("../ez")}  JSDoc */
ezDefine("Parser", function (exports) {
    "use strict";

    exports.parsePage = parsePage;
    return exports;


    /**
     * Converts html to an AST
     * @param {string} text source of html
     * @param {string} [fileName='anonymous'] name of file
     * @returns {HTMLContent} AST form of html
     */
    function parsePage(pageText, fileName) {
        var attributeName = [], escape = false, index = 0, lineNumber = 1, columnNumber = 1, _ = { index: 0 };
        Object.defineProperty(_, "index", {
            get: function () { return index; },
            set: function (newValue) { columnNumber += newValue - index; index = newValue; }
        });
        fileName = fileName ? String(fileName) : "anonymous";
        /** @type {JSDoc.HTMLScope | JSDoc.HTMLContent | JSDoc.EZAttribute | JSDoc.EZExpression} */
        var scope = {
            type: "HTMLContent",
            dependencies: [],
            content: []
        };
        while (index < pageText.length) {
            if (escape) {
                onDefault();
                escape = false;
            } else {
                var letterMap = {
                    "<": function () {
                        ({
                            "Scope": function () {
                                if (scope.singleTag && pageText[index + 1] === "/" && scope.closedTag) {
                                    scope.singleTag = false;
                                    scope.closedTag = false;
                                    _.index += 1;
                                } else {
                                    throw createError("Undefined Error, Text case should had been run");
                                }
                            },
                            "HTMLContent": function () {
                                if (Util.startsWith(pageText, index + 1, "!--")) {
                                    try { _.index = getCommentEnd(pageText, index + 4); } catch (err) { throw createError(err.message); }
                                } else if (pageText[index + 1] === "/") {
                                    scope.end = index;
                                    scope.content = scope.content.map(function (item) { return item instanceof Array ? item.join("") : item; });
                                    scope = scope.parent;
                                    if (!scope) throw createError("Unmatched closing tag found");
                                    scope.singleTag = false;
                                    scope.closedTag = false;
                                    _.index += 1;
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
                                if (scope.closedTag) throw createError("Unexpected character '>'");
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
                                        try { _.index = getScriptEnd(pageText, index + 1, scope.parent.name) - 1; } catch (err) { throw createError(err.message); }
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
                                } else {
                                    var lastAttriubute = Object.keys(scope.attributes).pop();
                                    if (scope.attributes[lastAttriubute] instanceof Array) scope.attributes[lastAttriubute].push(" ");
                                }
                            },
                            "HTMLContent": onDefault
                        }[scope.type] || syntax)();
                    },
                    "\n": function () {
                        lineNumber += 1;
                        columnNumber = 0;
                        this[" "]();
                    },
                    "\r": function () {
                        this[" "]();
                    },
                    "\t": function () {
                        this[" "]();
                    },
                    "=": function () {
                        ({
                            "Scope": function () {
                                var keys = Object.keys(scope.attributes), currentAttribute = keys.length && scope.attributes[keys.pop()];
                                if (currentAttribute instanceof Array) return currentAttribute.push("=");
                                if (!attributeName.length) throw createError("Empty attribute name");
                                var newAttribute = attributeName.join("").replace(/^ez-/, "");
                                if (newAttribute.length !== attributeName.length) {
                                    var start = pageText[++index];
                                    if (start !== "\"" && start !== "'") throw createError("Unexpected character '" + start + "', was expecting string \" or '");
                                    var newScopes = Parser.parseExpression(pageText, index + 1, lineNumber, columnNumber, fileName);
                                    scope.ezAttributes[newAttribute] = newScopes;
                                    _.index = newScopes[newScopes.length - 1].end;
                                    newScopes.forEach(function (newScope) { newScope.parent = scope; });
                                } else scope.attributes[newAttribute] = undefined; /* TODO FILL */
                                attributeName = [];
                            },
                            "HTMLContent": onDefault
                        }[scope.type] || syntax)();
                    },
                    "/": function () {
                        ({
                            "Scope": function () {
                                var attributeNames = Object.keys(scope.attributes);
                                if (attributeNames.length && scope.attributes[attributeNames.pop()] instanceof Array) return onDefault();
                                if (scope.singleTag && pageText[index + 1] === ">") {
                                    if (scope.name instanceof Array) scope.name = scope.name.join("");
                                    if (attributeName.length) {
                                        var newAttribute = attributeName.join("").replace(/^ez-/, "");
                                        if (newAttribute.length !== attributeName.length) throw createError("Ez attributes cannot be empty");
                                        else scope.attributes[newAttribute] = null;
                                        attributeName = [];
                                    }
                                    scope.end = index + 2;
                                    scope = scope.parent;
                                    _.index += 1;
                                }
                                else throw createError("Invalid character '/'");
                            }
                        }[scope.type] || syntax)();
                    },
                    "$": function () {
                        ({
                            "HTMLContent": function () {
                                if (pageText[index + 1] === "{") {
                                    index += 2;
                                    var newScopes = Parser.parseExpression(pageText, index, lineNumber, columnNumber, fileName);
                                    ([
                                        function () {
                                            _.index = newScopes[0].end;
                                        },
                                        function () {
                                            _.index = newScopes[1].end;
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
                                if (attributeName.length) throw createError("Attribute name cannot include quotes ");
                                var attributeNames = Object.keys(scope.attributes);
                                if (!attributeNames.length) throw createError("Invalid character '\"'  ");
                                var name = attributeNames.pop();
                                if (scope.attributes[name] === undefined) {
                                    scope.attributes[name] = [pageText[index]];
                                } else if (scope.attributes[name]) {
                                    if (scope.attributes[name][0] !== pageText[index]) throw createError("Invalid closing character ");
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
                                if (attributeName.length) throw createError("Attribute name cannot include quotes ");
                                var attributeNames = Object.keys(scope.attributes);
                                if (!attributeNames.length) throw createError("Invalid character '''  ");
                                var name = attributeNames.pop();
                                if (scope.attributes[name] === undefined) {
                                    scope.attributes[name] = [pageText[index]];
                                } else if (scope.attributes[name]) {
                                    if (scope.attributes[name][0] !== pageText[index]) throw createError("Invalid closing character ");
                                    scope.attributes[name].shift();
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
            _.index += 1;
        }
        if (scope.parent) throw createError("HTML hasn't been properly closed");
        return scope;

        function onDefault() {
            ({
                "Scope": function () {
                    if (!scope.singleTag) return;
                    var lastAttriubute = Object.keys(scope.attributes).pop();
                    if (scope.name instanceof Array) scope.name.push(pageText[index]);
                    else if (scope.attributes[lastAttriubute] instanceof Array) scope.attributes[lastAttriubute].push(pageText[index]);
                    else attributeName.push(pageText[index]);
                },
                "HTMLContent": function () {
                    if (typeof scope.content[scope.content.length - 1] === "string") scope.content[scope.content.length - 1] += pageText[index];
                    else scope.content.push(pageText[index]);
                }
            }[scope.type] || syntax)();
        }

        function syntax() {
            throw createError("Unknown syntax ('" + pageText.substring(index - 5, index + 5) + "')");
        }


        /**
         * Creates and returns a syntax error
         * @param {string} message error message
         * @returns {SyntaxError}
         */
        function createError(message) {
            return Util.createError(SyntaxError, message, fileName, lineNumber, columnNumber);
        }
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
            } else if (list.length === 0 && Util.startsWith(pageText, index, searchingFor)) return index;
            index += 1;
        }
        throw SyntaxError("Unclosed " + tagName + " tag");
    }

    /**
     * 
     * @param {string} pageText 
     * @param {number} index
     * @returns {number} 
     */
    function getCommentEnd(pageText, index) {
        var searchingFor = "-->";
        while (index < pageText.length) {
            if (Util.startsWith(pageText, index, searchingFor)) return index + searchingFor.length;
            index += 1;
        }
        throw SyntaxError("Unclosed Comment Tag");
    }

});