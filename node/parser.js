exports.parseScript = parseScript;
/** @typedef {import("./node")} NodeInfo */


const invalidNames = ["var", "let", "const", "void", "function", "try", "catch", "throw", "if", "for", "do", "while", "return"];

const Program = "Program";
const FunctionDeclaration = "FunctionDeclaration";
const Identifier = "Identifier";
const VariableDeclaration = "VariableDeclaration";
const VariableDeclarator = "VariableDeclarator";
const ExpressionStatement = "ExpressionStatement";
const ArrowFunctionExpression = "ArrowFunctionExpression";
const BlockStatement = "BlockStatement";
const Literal = "Literal";
const EmptyStatement = "EmptyStatement";

/**
 * 
 * @param {string} scriptText 
 * @returns {NodeInfo.IScope}
 */
function parseScript(scriptText) {
    /** @type {NodeInfo.IScope} */
    var scope = {
        type: Program,
        start: 0,
        end: scriptText.length,
        body: [],
        parent: null
    };
    var rootScope = scope;
    var brackets = [];
    var index = 0;
    while (index < scriptText.length) {
        var [key, callBack, ...rest] = (Object.entries({
            "^((function(\\*?)\\s*)(\\w*)\\s*\\()((?:\\w|\\s|[,])*)\\)": (fullMatch, paramsSpace, nameSpace, isGenerator, name, params) => {
                scope = {
                    type: FunctionDeclaration,
                    start: index,
                    end: null,
                    parent: scope,
                    id: name ? {
                        type: Identifier,
                        start: index + nameSpace.length,
                        end: index + nameSpace.length + name.length,
                        name: name
                    } : null,
                    params: []
                };
                if (params) {
                    if (/^,|,,/.test(params.replace(/\s/g, ""))) throw SyntaxError(`Invalid parameter initialization at index ${index}`);
                    var paramIndex = index + paramsSpace.length;
                    scope.params = params.trim() ? params.split(",").map(function (name) {
                        var startSpace = name.match(/^\s*/)[0].length;
                        name = name.trim();
                        if (/\s/.test(name)) throw SyntaxError(`Function declaration parameters cannot contain empty spaces (index: ${paramIndex + startSpace})`);
                        var result = {
                            type: Identifier,
                            start: paramIndex + startSpace,
                            end: paramIndex + startSpace + name.length,
                            name: name
                        };
                        paramIndex = paramIndex + name.length + 1;
                        return result;
                    }) : [];
                }
                if (scope.parent.body instanceof Array) scope.parent.body.push(scope);
                else throw SyntaxError("Body was expected to be an array");
                index += fullMatch.length - 1;
            },
            "^(if\\s*)\\(": () => {

            },
            "^(((var|let|const)\\s*)(\\w*)\\s*)(=?)": (fullMatch, initSpace, nameSpace, varType, name, init) => {
                scope = {
                    type: VariableDeclaration,
                    start: index,
                    end: null,
                    parent: scope,
                    declarations: [
                        {
                            type: VariableDeclarator,
                            start: index + nameSpace.length,
                            end: index + nameSpace.length + name.length,
                            id: {
                                type: Identifier,
                                start: index + nameSpace.length,
                                end: index + nameSpace.length + name.length,
                                name: name
                            }
                        }
                    ],
                    kind: varType
                };
                if (scope.parent.body instanceof Array) scope.parent.body.push(scope);
                else throw SyntaxError("Body was expected to be an array");
                scope.declarations[0].parent = scope;
                index += fullMatch.length - 1;
                if (init) {
                    scope = scope.declarations[0];
                    scope.init = null;
                }
            },
            "^((,\\s*)(\\w*)\\s*)(=?)": (fullMatch, initSpace, varSpace, varName, init) => {
                scope = ({
                    [VariableDeclaration]: () => {
                        scope.declarations.push({
                            type: VariableDeclarator,
                            start: index + varSpace.length,
                            end: index + varSpace.length + varName.length,
                            id: {
                                type: Identifier,
                                start: index + varSpace.length,
                                end: index + varSpace.length + varName.length,
                                name: varName
                            }
                        });
                        scope.declarations[scope.declarations.length - 1].parent = scope;
                        if (init) {
                            scope = scope.declarations[scope.declarations.length - 1];
                            scope.init = null;
                        }
                    },
                    [VariableDeclarator]: () => {
                        if (scope.init === null) throw SyntaxError(`Unexpected "," at index ${index}`);
                        else throw Error("Unhandled Case");
                    }
                }[scope.type])();
            },
            "^(\\d+)\\s*[^?]": (fullMatch, rawValue) => {
                scope = ({
                    [VariableDeclarator]: () => {
                        if (scope.init === null) {
                            var endIndex = index + rawValue.length;
                            scope.init = {
                                type: Literal,
                                start: index,
                                end: endIndex,
                                parent: scope,
                                value: +rawValue,
                                raw: rawValue
                            };
                            scope.end = endIndex;
                            scope = scope.parent;
                            scope.end = endIndex;
                            return scope;
                        }
                    }
                }[scope.type])();
            },
            "^(\\w|_|\\$)(\\w|_|\\$|\\d)*": (fullMatch) => {
                if (invalidNames.includes(fullMatch)) throw SyntaxError(`Invalid name "${fullMatch}" at index ${index}`);
                ({
                    [VariableDeclarator]: () => {
                        if (scope.init === null) {
                            scope.init = {
                                type: Identifier,
                                start: index,
                                end: index + fullMatch.length,
                                name: fullMatch
                            };
                        }
                    }
                }[scope.type])();
            },
            "^(?:(?:\\(((?:\\w|\\s|[,])*)\\))|(\\w*))\\s*=>": (fullMatch, param, noParam) => {
                scope = ({
                    [BlockStatement]: () => {
                        if (!(scope.body instanceof Array)) throw SyntaxError("Body was expected to be an array");
                        /** @type {NodeInfo.IScope} */
                        var newScope = {
                            type: ExpressionStatement,
                            start: index,
                            end: null,
                            parent: scope,
                            expression: {
                                type: ArrowFunctionExpression,
                                start: index,
                                end: null
                            }
                        };
                        newScope.expression.parent = newScope;
                        scope.body.push(newScope);
                        return newScope.expression;
                    },
                    [VariableDeclarator]: () => {
                        if (scope.init !== null) throw SyntaxError("Unexpected arrow expression");
                        return scope.init = {
                            type: ArrowFunctionExpression,
                            parent: scope,
                            start: index,
                            end: null
                        };
                    }
                }[scope.type])();
                if (param !== undefined) {
                    if (/^,|,,/.test(param.replace(/\s/g, ""))) throw SyntaxError(`Invalid parameter initialization at index ${index}`);
                    var paramIndex = index;
                    scope.params = param.trim() ? param.split(",").map(function (name) {
                        var startSpace = name.match(/^\s*/)[0].length;
                        name = name.trim();
                        if (/\s/.test(name)) throw SyntaxError(`Arrow function parameters cannot contain empty spaces (index: ${paramIndex + startSpace})`);
                        var result = {
                            type: Identifier,
                            start: paramIndex + startSpace,
                            end: paramIndex + startSpace + name.length,
                            name: name
                        };
                        paramIndex = paramIndex + name.length + 1;
                        return result;
                    }) : [];
                } else if (noParam) {
                    scope.params = [{
                        type: Identifier,
                        start: index,
                        end: index + noParam.length,
                        name: noParam
                    }];
                } else {
                    throw SyntaxError(`Arrow function without parameter declaration at index ${index}`);
                }
                index += fullMatch.length - 1;
            }
        }).find(function (group) {
            if (group[0][0] === "^") return group.push(...(new RegExp(group[0]).exec(scriptText.substring(index)) || [])) - 2;
            else return scriptText.substring(index).startsWith(group[0]);
        }) || [0, (..._) => _, 0]);
        if (key && rest[0]) callBack(...rest);
        else ({
            "(": () => {
                ({
                    [VariableDeclarator]: () => {
                        brackets.push("")
                    }
                }[scope.type])();
            },
            ")": () => {
                if (brackets[brackets.length - 1] !== "(") throw SyntaxError("Invalid ')' character");
            },
            "{": () => {
                scope = ({
                    [ArrowFunctionExpression]: () => {
                        /** @type {NodeInfo.IScope} */
                        var body = {
                            type: BlockStatement,
                            parent: scope,
                            start: index,
                            end: null,
                            body: []
                        };
                        scope.body = body;
                        return body;
                    },
                    [FunctionDeclaration]: () => {
                        /** @type {NodeInfo.IScope} */
                        var body = {
                            type: BlockStatement,
                            parent: scope,
                            start: index,
                            end: null,
                            body: []
                        };
                        scope.body = body;
                        return body;
                    }
                }[scope.type])();
            },
            ";": () => {
                scope = ({
                    [BlockStatement]: () => {
                        if (scope.body instanceof Array) scope.body.push({
                            type: EmptyStatement,
                            start: index,
                            end: index + 1
                        });
                        else throw Error("Unhandled Case");
                        return scope;
                    },
                    [VariableDeclaration]: () => {
                        scope.end = index + 1;
                        return scope.parent;
                    },
                    [VariableDeclarator]: () => {
                        scope.end = index + 1;
                        scope = scope.parent;
                        scope.end = index + 1;
                        return scope.parent;
                    }
                }[scope.type])();
            },
            "\n": () => {
                var endIndex = index + 1;
                scope = ({
                    [VariableDeclaration]: () => {
                        scope.end = endIndex;
                        return scope.parent;
                    },
                    [VariableDeclarator]: () => {
                        scope.end = endIndex;
                        scope.parent.end = endIndex;
                        return scope.parent.parent;
                    }
                }[scope.type] || (() => scope))();
            },
            "}": () => {
                scope = ({
                    [BlockStatement]: () => {
                        var endIndex = index + 1;
                        scope.end = endIndex;
                        scope = scope.parent;
                        scope.end = endIndex;
                        return ({
                            [ArrowFunctionExpression]: () => {
                                return ({
                                    [ExpressionStatement]: () => {
                                        scope.parent.end = endIndex;
                                        return scope.parent;
                                    },
                                    [VariableDeclarator]: () => {
                                        scope.parent.end = endIndex;
                                        return scope.parent;
                                    }
                                }[scope.parent.type])();
                            },
                            [FunctionDeclaration]: () => {
                                return scope.parent;
                            }
                        }[scope.type])();
                    }
                }[scope.type])();
            }
        }[scriptText[index]] || (() => { }))();
        index += 1;
    }
    if (brackets.length) throw SyntaxError("Unclosed brackets");
    if (scope.type !== Program || rootScope !== scope) ({
        [BlockStatement]: () => {
            throw SyntaxError("Missing '}' at the end of file");
        }
    }[scope.type] || (() => {
        throw SyntaxError("Invalid end of file");
    }))();
    return scope;
}