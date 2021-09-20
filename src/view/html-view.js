if (undefined) var Parser = require("../ez").Parser;
if (undefined) var Mutation = require("../ez").Mutation;
if (undefined) var Expressions = require("../ez").Expressions;
if (undefined) var Enumerables = require("../ez").Enumerables;
if (undefined) var Http = require("../ez").Http;
if (undefined) var Util = require("../ez").Util;
if (undefined) var HTML = require("../ez").HTML;

/** @typedef {require("../ez")} JSDoc */

ezDefine("View", function (exports) {
    "use strict";
    // TODO use weak sets when available to avoid gc
    // TODO freeze elements behind ez-if (when hidden)!IMPORTANT
    // TODO allow reverse order views
    // TODO create ez-let


    /** @type {{[className: string]: (dom: HTMLElement, controller:JSDoc.ViewController, scope: Array<JSDoc.EZExpression>, dependencies:{[index: string]: Array<Attr>}, scopeID:string, replaceScope:{[index: string]: string}) => {promise: Promise, node: node}}} */
    var specialClasses = {
        "if": function (dom, controller, scope, dependencies, scopeID, replaceScope) {
            var resolveCB, rejectCB;
            var attribute = dom.getAttributeNode("ez-if");
            addDependencies(dependencies, scope[0].dependencies, attribute, replaceScope, scopeID);
            var comment = document.createComment(""), commentID = ++idCounter;
            comments[commentID] = {
                comment: comment,
                if: scope,
                show: function () { if (typeof resolveCB === "function") resolveCB(); },
                cancel: function () { if (typeof rejectCB === "function") rejectCB(); }
            };
            Mutation.setPlaceholder(attribute, commentID);
            if (!Expressions.evaluateValue(controller, scope[0], scopes[scopeID])) {
                var thenCB = [], catchCB = [], promise = {
                    then: function (cb) { if (thenCB) thenCB.push(cb); else cb(); return promise; },
                    catch: function (cb) { if (catchCB) catchCB.push(cb); else cb(); return promise; },
                    finally: function (cb) {
                        if (catchCB) {
                            thenCB.push(function () { cb(); });
                            catchCB.push(function () { cb(); });
                        } else cb();
                        return promise;
                    }
                };

                resolveCB = function () {
                    onResult();
                    thenCB.forEach(function (cb) { cb(); });
                    thenCB = null;
                };

                rejectCB = function () {
                    onResult();
                    catchCB.forEach(function (cb) { cb(); });
                    catchCB = null;
                };

                return {
                    promise: promise,
                    node: comment
                };
            } else onResult();

            function onResult() {
                comments[commentID].show = function () { };
                comments[commentID].cancel = function () { };
            }
        },
        "loop": function (dom, controller, scope, dependencies, scopeID, replaceScope, self) {
            if (self === scope[0].parent) return;
            var placeHolder = document.createTextNode("");
            var treeID = ++idCounter;
            trees[treeID] = {
                loop: scope,
                placeHolder: placeHolder,
                parentScope: scopes[scopeID],
                replaceScope: replaceScope,
                children: {},
                scope: scope[0].parent
            };
            Mutation.setTree(placeHolder, treeID);
            if (scope[0].content[0].left.type !== "Property") throw Error("Invalid loop");
            addDependencies(dependencies, scope[0].dependencies.slice(1), placeHolder, replaceScope, scopeID);
            setTimeout(function () { manageLoop(controller, dependencies, treeID); }, 0);
            return placeHolder;
        },
        "let": function () {

        },
        "pass": function (dom, controller, scope, dependencies, scopeID, replaceScope) {
            var attribute = dom.getAttributeNode("ez-pass");

            trees[++idCounter] = {
                pass: scope,
                controller: controller
            };
            Mutation.setTree(attribute, idCounter);

            var scopes = scope.reduce(function (result, param) {
                param.dependencies.forEach(function (dependency) {
                    result[dependency] = 0;
                });
                return result;
            }, {});
            addDependencies(dependencies, Object.keys(scopes), attribute, replaceScope, scopeID);
        }
    };

    var tempDom = document.createElement("div");
    var gcTimer = { interval: 3000, timeout: 25 };

    var idCounter = 0;

    /** @type {{[tagName: string]: Array<{dom: HTMLElement, dependencies: {}}>}} */
    var existingViews = {};
    /** @type {Array<{dependencies: {}, nodes: Array<Node>}>} */
    var deleteList = [];
    var views = {};
    var trees = {};
    var scopes = {};
    var comments = {};
    var dependenciesMap = {};
    if (document.readyState === "complete") addMutationListener();
    else addEventListener("load", addMutationListener);
    setInterval(deletePartition, gcTimer.interval);
    exports.registerView = registerView;
    exports.registerURL = registerURL;
    return exports;

    /**
     * 
     * @param {HTMLElement | string} dom 
     * @returns {boolean}
     */
    function hasValidTag(dom) {
        if (typeof dom === "string") dom = document.createElement(dom);
        if (!(dom instanceof HTMLElement)) return false;
        return dom instanceof HTMLUnknownElement || dom.tagName.indexOf("-") !== -1;
    }

    function addMutationListener(root) {
        if (!(root instanceof HTMLElement)) root = document.body;
        Mutation.addDomListener(function (changes) {
            changes.forEach(function (change) {
                change.addedNodes.forEach(function (dom) {
                    if (hasValidTag(dom) && dom.tagName in views) {
                        createView(dom, views[dom.tagName].tree, views[dom.tagName].controller);
                    }
                });
            });
        }, root, false, true);
    }

    /**
     * 
     * @param {string} tagName
     * @param {string | HTMLElement | Array<Node> | HTMLCollection | NodeList | NodeListOf<Node>} dom 
     * @param {JSDoc.ViewController} controller
     * @returns {void}
     */
    function registerURL(tagName, url, controller) {
        tagName = String(tagName).toUpperCase();
        if (tagName in views) throw Error("Tag has already been registered");
        if (!hasValidTag(tagName)) throw Error("Supplied tagname cannot be an existing html tag");
        Http.get(url, {
            headers: {
                "Accept": "text/html",
                "Cache-Control": "public, max-age: " + (60 * 60 * 24 * 3)
            }
        }).then(function (data) {
            registerTag(tagName, data, controller, url);
        }).catch(function (err) {
            console.error("Could not get resource for '" + tagName + "' view (url: '" + url + "')");
            console.error(err);
        });
    }

    /**
     * @param {string} tagName
     * @param {string | HTMLElement | Array<Node> | HTMLCollection | NodeList | NodeListOf<Node>} dom 
     * @param {JSDoc.ViewController} controller
     * @returns {void}
     */
    function registerView(tagName, dom, controller) {
        tagName = String(tagName).toUpperCase();
        if (tagName in views) throw Error("Tag has already been registered");
        if (!hasValidTag(tagName)) throw Error("Supplied tagname cannot be a valid html tag");
        registerTag(tagName, dom, controller, tagName + " view text");
    }

    /**
      * @param {string} tagName
      * @param {string | HTMLElement | Array<Node> | HTMLCollection | NodeList | NodeListOf<Node>} dom 
      * @param {string} fileName
      * @param {JSDoc.ViewController} controller
      */
    function registerTag(tagName, dom, controller, fileName) {
        if (typeof dom === "string") var html = dom;
        else if (typeof dom === "object") {
            if (dom instanceof Array) {
                html = [].reduce.call(dom, function (result, innerDom) {
                    if (typeof innerDom === "string") return result + innerDom;
                    else if (innerDom instanceof HTMLElement) return result + innerDom.outerHTML;
                    else if (innerDom instanceof Node) {
                        tempDom.innerHTML = "";
                        tempDom.appendChild(innerDom);
                        return result + tempDom.innerHTML;
                    } else throw Error("An item of the argument list is not a node");
                }, "");
            } else if (dom instanceof HTMLElement) html = dom.outerHTML;
        } else throw Error("Parameter is not a string or an element");
        var tree = Parser.parsePage(html, fileName);
        views[tagName] = { tree: tree, controller: controller };
        document.querySelectorAll(tagName).forEach(function (dom) {
            createView(dom, views[tagName].tree, views[tagName].controller);
        });
    }

    /**
     * 
     * @param {HTMLElement} container 
     * @param {JSDoc.HTMLContent} tree 
     * @param {JSDoc.ViewController} controller 
     */
    function createView(container, tree, controller) {
        if (getViewIndex(container) !== -1) return;
        var dependencies = {};
        existingViews[container.tagName].push({
            dependencies: dependencies,
            dom: container
        });
        var newController = Mutation.deepClone(controller);
        Mutation.setValue(newController, "emit", function (eventName, event) {
            if (typeof window.CustomEvent === "function") var customEvent = new CustomEvent(eventName, { detail: event });
            else {
                customEvent = document.createEvent("CustomEvent");
                customEvent.initCustomEvent(eventName, false, false, event);
            }
            container.dispatchEvent(customEvent);
        });
        if (typeof newController.construct === "function") {
            var attributeNode = container.getAttributeNode("ez-pass");
            if (attributeNode instanceof Attr) {
                var scope = {};
                var parentController = {};
                if ("treeID" in attributeNode) {
                    var parent = attributeNode;
                    while (parent && (parent === container || !hasValidTag(parent))) {
                        if ("scopeID" in parent) {
                            var domScope = scopes[parent.scopeID];
                            for (var property in domScope) {
                                if (!(property in scope)) scope[property] = domScope[property];
                            }
                        }
                        parent = parent instanceof Attr ? parent.ownerElement : parent.parentNode;
                    }
                    var tagTree = trees[attributeNode.treeID], paramList = tagTree.pass;
                    parentController = tagTree.controller;
                } else {
                    paramList = Parser.parseExpression(container.getAttribute("ez-pass"), 0, 1, 1, "Expression: '" + container.getAttribute("ez-pass") + "'");
                }
                paramList = paramList instanceof Array ? paramList : [paramList];
                paramList = paramList.map(function (param) { return Expressions.evaluateValue(parentController, param, scope); });
                try { var promise = newController.construct.apply(newController, paramList); }
                catch (err) {
                    console.error("Error in construct function");
                    console.error(err);
                }
            } else {
                try { promise = newController.construct(); }
                catch (err) {
                    console.error("Error in construct function");
                    console.error(err);
                }
            }
            if (promise instanceof Promise) return promise.finally(initDom);
            else initDom();
        } else initDom();

        function initDom() {
            var domList = createDom(newController, tree, dependencies);
            Mutation.addListener(newController, function (target, property, type, value, path) {
                if (type === "get") return;
                var fullPath = (path || "") + (property && path ? "." : "") + (property || "");
                if (path in dependencies) dependencies[path].forEach(evaluateLoopNode);
                if (fullPath in dependencies) dependencies[fullPath].forEach(evaluateNode);
                if ("null" in dependencies) dependencies["null"].forEach(evaluateNode);
            });
            (domList instanceof Array ? domList : [domList]).forEach(function (dom) {
                container.appendChild(dom);
            });
            container.querySelectorAll(Object.keys(views).join(",")).forEach(function (dom) {
                createView(dom, views[dom.tagName].tree, views[dom.tagName].controller);
            });
            if (typeof newController.onLoad === "function") {
                try { newController.onLoad(container); }
                catch (err) {
                    console.error("Error in onLoad function");
                    console.error(err);
                }
            }
        }

        function evaluateLoopNode(node) {
            if (!node) return;
            var tree = trees[node.treeID];
            if (node instanceof Text && tree && !("type" in tree)) {
                manageLoop(newController, dependencies, node.treeID);
            }
        }

        function evaluateNode(node) {
            if (!node) return;
            var tree = trees[node.treeID];
            var placeHolder = "placeholderID" in node ? comments[node.placeholderID] : null;
            var scope = "scopeID" in node ? scopes[node.scopeID] : null;
            if (node instanceof Attr) {
                if (node.name === "ez-pass") {
                    if (!node.ownerElement) return;
                    var dom = node.ownerElement, oldParent = dom.parentElement, ref = dom.nextElementSibling;
                    var commentAttribute = dom.getAttributeNode("ez-if");
                    if (commentAttribute && "placeholderID" in commentAttribute) comments[commentAttribute.placeholderID].cancel();
                    removeView(dom);
                    dom.innerHTML = "";
                    createView(dom, views[dom.tagName].tree, views[dom.tagName].controller);
                    if (oldParent) {
                        if (ref) oldParent.insertBefore(dom, ref);
                        else oldParent.appendChild(dom);
                    }
                } else if (placeHolder) {
                    var comment = placeHolder.comment; dom = node.ownerElement;
                    if (!dom) return;
                    if (Expressions.evaluateValue(newController, placeHolder.if[0], scope)) {
                        placeHolder.show();
                        if (comment.parentNode) {
                            comment.parentNode.insertBefore(dom, comment);
                            comment.parentNode.removeChild(comment);
                        }
                    } else {
                        if (dom.parentNode) {
                            dom.parentNode.insertBefore(comment, dom);
                            dom.parentNode.removeChild(dom);
                        }
                    }
                } else {
                    var attributeValue = Expressions.evaluateValue(newController, tree, scope);
                    if (tree.parent && tree.parent.attributes && node.name in tree.parent.attributes) var initialValue = tree.parent.attributes[node.name];
                    HTML.setValue(node, initialValue ? (initialValue + attributeValue) : attributeValue);
                }
            } else if (node instanceof Text) {
                if ("type" in tree) {
                    if (node.parentNode instanceof HTMLElement) {
                        node.textContent = Expressions.evaluateValue(newController, tree, scope);
                    }
                } else {
                    manageLoop(newController, dependencies, node.treeID);
                }
            }
        }
    }

    /**
     * 
     * @param {JSDoc.ViewController} controller
     * @param {JSDoc.HTMLContent | JSDoc.HTMLScope} tree 
     * @param {[index: string]: Array<Node | Attr>} dependencies
     * @param {string} scopeID
     * @param {[index: string]: string} replaceScope
     * @returns {HTMLElement | Array<HTMLElement>}
     */
    function createDom(controller, tree, dependencies, scopeID, replaceScope) {
        var self = this;
        if (tree instanceof Array) return tree.map(function (subTree) { return createDom(controller, subTree, dependencies, scopeID, replaceScope); });
        return ({
            "HTMLContent": function () {
                /** @type {JSDoc.HTMLContent} */
                var content = tree;
                return content.content.map(function (item) {
                    return typeof item === "string" ? document.createTextNode(item) : createDom(controller, item, dependencies, scopeID, replaceScope);
                }).filter(Boolean);
            },
            "Scope": function () {
                /** @type {JSDoc.HTMLScope} */
                var scope = tree;
                var dom = document.createElement(scope.name);
                var functions = Object.keys(specialClasses).map(function (key) {
                    if (key in scope.ezAttributes) return function () {
                        var attrScope = scope.ezAttributes[key];
                        if (typeof attrScope === "string") dom.setAttribute("ez-" + key, attrScope);
                        else dom.setAttribute("ez-" + key, attrScope.map(function (item) { return item.text; }).join(","));
                        var result = specialClasses[key](dom, controller, scope.ezAttributes[key], dependencies, scopeID, replaceScope, self);
                        if (result) {
                            if (result instanceof Node) return result;
                            result.promise.then(function () {
                                if (functions.length) return functions.shift()();
                                else return innerCreateDom();
                            }).catch(function () {
                                removeCascade(dependencies, dom);
                            });
                            return result.node;
                        } else {
                            if (functions.length) return functions.shift()();
                            else return innerCreateDom();
                        }
                    };
                }).filter(Boolean);
                if (functions.length) return functions.shift()();
                else return innerCreateDom();

                function innerCreateDom() {
                    addMutationListener(dom);

                    for (var key in scope.attributes) dom.setAttribute(key, scope.attributes[key]);
                    for (key in scope.ezAttributes) {
                        if (Util.startsWith(key, 0, "on-")) {
                            (function (expressionList) {
                                dom.addEventListener(key.substring(3), function (event) {
                                    expressionList.forEach(function (callExpression) {
                                        callExpression = callExpression.content[0];
                                        ({
                                            "Property": function () {
                                                var callBack = Expressions.evaluateValue(controller, callExpression, scopes[scopeID]);
                                                return callBack.call(controller, event);
                                            },
                                            "Parameter": function () {
                                                this.Property();
                                            },
                                            "Call": function () {
                                                var newScope = Object.create(scopeID in scopes ? scopes[scopeID] : null);
                                                newScope.$ = event;
                                                newScope.this = dom;
                                                return Expressions.evaluateValue(controller, callExpression, newScope);
                                            },
                                            "Expression": function () {
                                                // TODO calculated function
                                            }
                                        }[callExpression.type])();
                                    });
                                });
                                dom.setAttribute("ez-" + key, expressionList.map(function (e) { return e.text; }).join());
                            })(scope.ezAttributes[key]);
                        } else if (!(key in specialClasses) && scope.ezAttributes[key][0].text) {
                            dom.setAttribute("ez-" + key, scope.ezAttributes[key][0].text);
                            var attribute = document.createAttribute(key);
                            trees[++idCounter] = scope.ezAttributes[key][0];
                            Mutation.setTree(attribute, idCounter);
                            try { dom.setAttributeNode(attribute); }
                            catch (err) { console.error(err); }
                            var attributeValue = Expressions.evaluateValue(controller, scope.ezAttributes[key][0], scopes[scopeID]);
                            if (scope.attributes && key in scope.attributes) var initialValue = scope.attributes[key];
                            if (HTML.setValue(attribute, initialValue ? (initialValue + attributeValue) : attributeValue)) {
                                var content = scope.ezAttributes[key][0].content;
                                if (content.length === 1) {
                                    (function (attr, content) {
                                        dom.addEventListener("input", function () {
                                            var parent = Expressions.getParent(controller, content, scopes[scopeID]);
                                            if (parent && parent.parent) parent.parent[parent.key] = HTML.getValue(attr);
                                        });
                                        dom.addEventListener("change", function () {
                                            var parent = Expressions.getParent(controller, content, scopes[scopeID]);
                                            if (parent && parent.parent) parent.parent[parent.key] = HTML.getValue(attr);
                                        });
                                    })(attribute, content[0]);
                                }
                            }
                            addDependencies(dependencies, scope.ezAttributes[key][0].dependencies, attribute, replaceScope, scopeID);
                        }
                    }
                    if (scope.text) {
                        var newDoms = createDom(controller, scope.text, dependencies, scopeID, replaceScope);
                        (newDoms instanceof Array ? newDoms : [newDoms]).forEach(function (newDom) {
                            dom.appendChild(newDom);
                        });
                    }
                    return dom;
                }
            },
            "Expression": function () {
                var text = document.createTextNode("");
                trees[++idCounter] = tree;
                Mutation.setTree(text, idCounter);
                text.textContent = Expressions.evaluateValue(controller, tree, scopes[scopeID]);
                addDependencies(dependencies, tree.dependencies, text, replaceScope, scopeID);
                Mutation.setValue(text, "scopeID", scopeID);
                return text;
            }
        }[tree.type])();
    }

    /**
     * @param {{[path: string]: Array<Node>}} dependencies
     * @param {Array<string>} pathList
     * @param {Node} newNode
     * @param {{[index: string]: string}} scope
     * @param {string} scopeID
     * @returns {void}
     */
    function addDependencies(dependencies, pathList, newNode, scope, scopeID) {
        var addScopeID;
        var newDependencies = {};
        if ("dependencyID" in newNode) {
            var dependencyID = newNode.dependencyID;
            newDependencies = dependenciesMap[dependencyID].reduce(function (result, name) {
                return result[name] = 0, result;
            }, {});
        } else {
            dependencyID = ++idCounter;
            Mutation.setValue(newNode, "dependencyID", dependencyID);
        }
        pathList.forEach(function (path) {
            if (path !== "null" && scope && Object.keys(scope).length) {
                path = path.replace(/^([^.]+)(\.|$)/g, function (fullText, key, dot) {
                    return addScopeID = true, key in scope ? scope[key] + dot : fullText;
                }).replace(/\[([^\]]+)\]/g, function (fullText, key) {
                    return addScopeID = true, key in scope ? "." + scope[key] : fullText;
                });
            }
            if (/^\d+.*/.test(path)) return;
            newDependencies[path] = 0;
            var list = dependencies[path];
            if (!list) dependencies[path] = list = [];
            list.push(newNode);
        });
        dependenciesMap[dependencyID] = Object.keys(newDependencies);

        if (addScopeID && scopeID) Mutation.setScope(newNode, scopeID);
    }

    /**
     * 
     * @param {JSDoc.ViewController} controller
     * @param {[index: string]: Array<Node | Attr>} dependencies
     * @param {number} treeID 
     * @returns {void}
     */
    function manageLoop(controller, dependencies, treeID) {
        var tree = trees[treeID];
        if (!tree) return;
        /** @type {JSDoc.EZExpression} */
        var loop = tree.loop;
        /** @type {Comment} */
        var placeHolder = tree.placeHolder;
        if (!placeHolder || !placeHolder.parentNode) return;
        /** @type {JSDoc.HTMLScope} */
        var scope = tree.scope;
        /** @type {Array<{item: *, domList: HTMLElement | Array<HTMLElement>}>} */
        var children = tree.children;
        /** @type {{[index: string]: *}} */
        var parentScope = tree.parentScope;
        /** @type {{[index: string]: string}} */
        var parentReplaceScope = tree.replaceScope;

        var itemName = loop[0].content[0].left.content;

        var listName = loop[0].text.replace(/^\s*[^\s]+\s+(of|in)\s+/, "");
        var operator = loop[0].content[0].operator.content;
        var previous = placeHolder;

        var list = Expressions.evaluateValue(controller, loop[0].content[0].right, parentScope);

        var oldProperties = Object.keys(children).reduce(function (result, key) {
            if (children[key]) result[key] = false;
            return result;
        }, {});
        Enumerables.iterate(list, operator, function (item, index) {
            var key = operator === "in" ? item : index;
            if (children[key] === undefined || list[key] !== children[key].item) {
                if (children[key] !== undefined) {
                    oldProperties[key] = true;
                    removeCascade(dependencies, children[key].domList);
                }
                var innerScope = Object.create(parentScope || null);
                var scopeID = ++idCounter;
                scopes[scopeID] = innerScope;
                innerScope[itemName] = item;
                var replaceScope = Object.create(parentReplaceScope || null);
                replaceScope[itemName] = operator === "of" ? listName + "." + key : key;
                replaceScope[itemName] = replaceScope[itemName].replace(/^([^.]+)(\.|$)/g, function (fullText, key, dot) {
                    return key in replaceScope ? replaceScope[key] + dot : fullText;
                });
                replaceScope[itemName] = replaceScope[itemName].replace(/\[([^\]])\]/g, function (fullText, key) {
                    return key in replaceScope ? "." + replaceScope[key] : fullText;
                });
                var newDom = createDom.call(scope, controller, scope, dependencies, scopeID, replaceScope);
                children[key] = { item: list[key], domList: newDom };
                (newDom instanceof Array ? newDom : [newDom]).forEach(function (newDom) {
                    var ref = previous.nextSibling;
                    if (ref) previous.parentNode.insertBefore(newDom, ref);
                    else previous.parentNode.appendChild(newDom);
                    previous = newDom;
                });
            } else {
                oldProperties[key] = true;
                if (children[key].domList) {
                    previous = children[key].domList;
                    if (previous instanceof Array) previous = previous[previous.length - 1];
                }
            }
        });
        tree.children = children;

        for (var key in oldProperties) {
            if (!oldProperties[key]) {
                removeCascade(dependencies, children[key].domList);
                children[key] = undefined;
            }
        }
    }

    /**
     * 
     * @param {{[index:string]: Array<Node>}} dependencies
     * @param {Node | Array<Node>} node
     * @returns {void} 
     */
    function removeCascade(dependencies, node) {
        var list = [];
        (node instanceof Array ? node : [node]).forEach(function (child) {
            deleteCascade(dependencies, child, list);
            if (child.parentNode) child.parentNode.removeChild(child);
        });
        deleteList.push({ dependencies: dependencies, nodes: list });
    }

    /**
     * 
     * @param {{[index: string]: Array<Node>}} dependencies
     * @param {Node} node
     * @param {Array<Node>} list
     * @returns {void} 
     */
    function deleteCascade(dependencies, node, list) {
        if (this instanceof Array) list = this;
        if (node instanceof HTMLElement) {
            [].slice.call(node.attributes).forEach(deleteCascade.bind(list, dependencies));
            if (!hasValidTag(node)) [].slice.call(node.childNodes).forEach(deleteCascade.bind(list, dependencies));
            else removeView(node);
        } else if (node instanceof Comment) {
            var comment = comments[node.placeholderID];
            if (comment) deleteCascade(dependencies, comment.dom, list);
        }
        list.push(node);
        return list;
    }

    function deletePartition() {
        var start = Date.now();
        if (!deleteList.length) return;
        var item = deleteList.shift(), dependencies = item.dependencies;
        while (Date.now() - start <= gcTimer.timeout) {
            if (!item.nodes.length) {
                if (!deleteList.length) return;
                item = deleteList.shift();
                dependencies = item.dependencies;
            } else {
                var node = item.nodes.shift();
                var dependencyList = dependenciesMap[node.dependencyID];
                if (dependencyList instanceof Array) {
                    dependencyList.forEach(function (depPath) {
                        var index = (dependencies[depPath] || []).indexOf(node);
                        if (index !== -1) dependencies[depPath].splice(index, 1);
                    });
                }
                if (node instanceof Attr) { if (node.ownerElement) node.ownerElement.removeAttribute(node.name); }
                else if (node.parentElement) node.parentNode.removeChild(node);
                if ("placeholderID" in node) comments[node.placeholderID] = undefined;
                if ("treeID" in node) trees[node.treeID] = undefined;
                if ("dependencyID" in node) dependenciesMap[node.dependencyID] = undefined;
                if ("scopeID" in node) scopes[node.scopeID] = undefined;
            }
        }
        if (item.nodes.length) deleteList.push(item);
    }

    /**
     * Gets the index of a view in the respective existing views array
     * @param {HTMLElement} dom
     * @returns {number}
     */
    function getViewIndex(dom) {
        if (!(dom.tagName in existingViews)) return existingViews[dom.tagName] = [], -1;
        return existingViews[dom.tagName].findIndex(function (view) {
            return view.dom === dom;
        });
    }

    /**
     * Deletes a view
     * @param {HTMLElement} dom
     * @returns {void}
     */
    function removeView(dom) {
        var index = getViewIndex(dom);
        if (index !== -1) {
            var dependencies = existingViews[dom.tagName][index].dependencies, list = [];
            [].slice.call(dom.childNodes).forEach(deleteCascade.bind(list, dependencies));
            if (dom.parentElement) dom.parentElement.removeChild(dom);
            existingViews[dom.tagName].splice(index, 1);
            deleteList.push({ dependencies: dependencies, nodes: list });
        }
    }
});