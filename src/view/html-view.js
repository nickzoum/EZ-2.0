if (undefined) var Parser = require("../ez").Parser;
if (undefined) var Mutation = require("../ez").Mutation;
if (undefined) var Expressions = require("../ez").Expressions;

/** @typedef {require("../ez")} JSDoc */

ezDefine("View", function (exports) {

    // TODO cache control header, public, 60*60*24*10

    var specialClasses = ["loop", "let", "pass", "if"];
    var tempDom = document.createElement("div");

    var treeCounterID = 0;
    var scopeCounterID = 0;

    var views = {};
    var trees = {};
    var scopes = {};

    exports.registerView = registerView;
    addMutationListener();

    function addMutationListener() {
        Mutation.addDomListener(function (changes) {
            changes.forEach(function (change) {
                change.addedNodes.forEach(function (dom) {
                    if (dom instanceof HTMLElement && dom.tagName in views) createView(dom, views[dom.tagName].tree, views[dom.tagName].controller);
                });
                change.removedNodes.forEach(function () {
                    // TODO
                });
            });
        }, document.body, false, true);
    }

    return exports;

    /**
     * @param {string} tagName
     * @param {string | HTMLElement | Array<Node> | HTMLCollection | NodeList | NodeListOf<Node>} dom 
     * @param {JSDoc.ViewController} controller
     */
    function registerView(tagName, dom, controller) {
        if (tagName in views) throw Error("Tag has already been registered");
        if (!(document.createElement(tagName) instanceof HTMLUnknownElement)) throw Error("Supplied tagname cannot be a valid html tag");
        if (typeof dom === "string") var html = dom;
        else if (typeof dom === "object") {
            if (dom instanceof Array) {
                html = [].reduce.call(dom, function (result, innerDom) {
                    if (innerDom instanceof HTMLElement) return result += innerDom.outerHTML, result;
                    else if (innerDom instanceof Node) {
                        tempDom.innerHTML = "";
                        tempDom.append(innerDom);
                        result += tempDom.innerHTML;
                        return result;
                    } else throw Error("An item of the argument list is not a node");
                }, "");
            } else if (dom instanceof HTMLElement) html = dom.outerHTML;
        } else throw Error("Parameter is not a string or an element");
        var tree = Parser.parsePage(html);
        views[tagName.toUpperCase()] = { tree: tree, controller: controller };
        document.querySelectorAll(tagName).forEach(function (dom) {
            if (dom instanceof HTMLElement && dom.tagName in views) createView(dom, views[dom.tagName].tree, views[dom.tagName].controller);
        });
    }

    /**
     * 
     * @param {HTMLElement} container 
     * @param {JSDoc.HTMLContent} tree 
     * @param {JSDoc.ViewController} controller 
     */
    function createView(container, tree, controller) {
        // TODO dependencies garbage collection
        var dependencies = {};
        var newController = Mutation.deepClone(controller);
        if (typeof newController.construct === "function") {
            if (container.hasAttribute("ez-pass") && "treeID" in container) {
                var scope = {};
                var parent = container;
                while (parent && (parent === container || !(parent instanceof HTMLUnknownElement))) {
                    if ("scopeID" in parent) {
                        var domScope = scopes[parent.scopeID];
                        for (var property in domScope) {
                            if (!(property in scope)) scope[property] = domScope[property];
                        }
                    }
                    parent = parent.parentElement;
                }
                var tagTree = trees[container.treeID], paramList = tagTree.pass;
                paramList = paramList instanceof Array ? paramList : [paramList];
                paramList = paramList.map(function (param) { return Expressions.evaluateValue(tagTree.controller, param, scope); });
                var promise = newController.construct.apply(newController, paramList);
            } else promise = newController.construct();
            if (promise instanceof Promise) return promise.finally(initDom);
            else initDom();
        } else initDom();

        function initDom() {
            var domList = createDom(newController, tree, dependencies);
            Mutation.addListener(newController, function (target, property, type, value, path) {
                if (type === "get") return;
                var fullPath = (path ? path + "." : "") + property;
                if (fullPath in dependencies) dependencies[fullPath].forEach(evaluateNode);
            });
            (domList instanceof Array ? domList : [domList]).forEach(function (dom) {
                container.appendChild(dom);
            });
            if (typeof newController.onLoad === "function") newController.onLoad();
        }

        function evaluateNode(node) {
            var tree = trees[node.treeID];
            var scope = "scopeID" in node ? scopes[node.scopeID] : null;
            if (node instanceof Node) {
                if ("type" in tree) {
                    if (node.parentElement instanceof HTMLElement) {
                        node.textContent = Expressions.evaluateValue(newController, tree, scope);
                    }
                } else {
                    manageLoop(newController, dependencies, node.treeID);
                }
            } else if (node instanceof Attr) {
                if (node.ownerElement instanceof HTMLElement) {
                    node.value = Expressions.evaluateValue(newController, tree, scope);
                }
            }
        }
    }

    /**
     * 
     * @param {JSDoc.ViewController} controller
     * @param {JSDoc.HTMLContent | JSDoc.HTMLScope} tree 
     * @param {[index: string]: Array<Node | Attr>} dependencies
     * @param {[index: string]: *} innerScope
     * @returns {HTMLElement | Array<HTMLElement>}
     */
    function createDom(controller, tree, dependencies, innerScope) {
        if (tree instanceof Array) return tree.map(function (subTree) { return createDom(controller, subTree, dependencies, innerScope); });
        return ({
            "HTMLContent": function () {
                /** @type {JSDoc.HTMLContent} */
                var content = tree;
                return content.content.map(function (item) {
                    return typeof item === "string" ? new Text(item) : createDom(controller, item, dependencies, innerScope);
                }).filter(Boolean);
            },
            "Scope": function () {
                /** @type {JSDoc.HTMLScope} */
                var scope = tree;
                if (typeof scope.ezAttributes.loop !== "string" && scope.ezAttributes.loop) {
                    var placeHolder = new Text();
                    trees[++treeCounterID] = {
                        loop: scope.ezAttributes.loop,
                        placeHolder: placeHolder,
                        children: [],
                        scope: scope
                    };
                    Mutation.setTree(placeHolder, treeCounterID);
                    var listName = scope.ezAttributes.loop[0].text.replace(/^\s*[^\s]+\s+of\s+/, "");
                    dependencies[listName] = dependencies[listName] || [];
                    dependencies[listName].push(placeHolder);
                    scope.ezAttributes.loop = scope.ezAttributes.loop[0].text;
                    setTimeout(manageLoop.bind(null, controller, dependencies, treeCounterID), 0);
                    return placeHolder;
                }
                var dom = document.createElement(scope.name);
                for (var key in scope.attributes) dom.setAttribute(key, scope.attributes[key]);
                for (key in scope.ezAttributes) {
                    if (key.startsWith("on-")) {
                        // TODO implement functions and event listeners
                    } else {
                        if (specialClasses.includes(key)) {
                            if (typeof scope.ezAttributes[key] === "string") {
                                dom.setAttribute("ez-" + key, scope.ezAttributes[key]);
                            } else {
                                dom.setAttribute("ez-" + key, scope.ezAttributes[key].map(function (item) { return item.text; }).join(","));
                                ({
                                    "pass": function () {
                                        trees[++treeCounterID] = {
                                            pass: scope.ezAttributes[key],
                                            controller: controller
                                        };
                                        Mutation.setTree(dom, treeCounterID);

                                        var scopes = scope.ezAttributes[key].reduce(function (result, param) {
                                            param.dependencies.forEach(function (dependency) {
                                                result[dependency] = 0;
                                            });
                                            return result;
                                        }, {});
                                        for (var dep in scopes) {
                                            dependencies[dep] = dependencies[dep] || [];
                                            dependencies[dep].push(dom);
                                        }
                                    }
                                }[key])();
                                // TODO
                            }
                        } else if (scope.ezAttributes[key][0].text) {
                            dom.setAttribute("ez-" + key, scope.ezAttributes[key][0].text);
                            var attribute = document.createAttribute(key);
                            trees[++treeCounterID] = scope.ezAttributes[key][0];
                            Mutation.setTree(attribute, treeCounterID);
                            dom.setAttributeNode(attribute);
                            attribute.value = Expressions.evaluateValue(controller, scope.ezAttributes[key][0], innerScope);
                            scope.ezAttributes[key][0].dependencies.forEach(function (dependency) {
                                dependencies[dependency] = dependencies[dependency] || [];
                                dependencies[dependency].push(attribute);
                            });
                        }
                    }
                }
                if (scope.text) dom.append.apply(dom, createDom(controller, scope.text, dependencies, innerScope));
                return dom;
            },
            "Expression": function () {
                var text = new Text();
                trees[++treeCounterID] = tree;
                Mutation.setTree(text, treeCounterID);
                text.textContent = Expressions.evaluateValue(controller, tree, innerScope);
                tree.dependencies.forEach(function (dependency) {
                    dependencies[dependency] = dependencies[dependency] || [];
                    dependencies[dependency].push(text);
                });
                return text;
            }
        }[tree.type])();
    }

    /**
     * 
     * @param {JSDoc.ViewController} controller
     * @param {[index: string]: Array<Node | Attr>} dependencies
     * @param {number} treeID 
     * @returns {void}
     */
    function manageLoop(controller, dependencies, treeID) {
        // TODO check order and sort (efficiency)
        // TODO in loops
        // TODO support maps
        var tree = trees[treeID];
        /** @type {JSDoc.EZExpression} */
        var loop = tree.loop;
        /** @type {Comment} */
        var placeHolder = tree.placeHolder;
        /** @type {JSDoc.HTMLScope} */
        var scope = tree.scope;
        /** @type {Array<{item: *, domList: HTMLElement | Array<HTMLElement>}>} */
        var children = tree.scope;

        var itemName = loop[0].content[0].left.content;
        var listName = loop[0].text.replace(/^\s*[^\s]+\s+of\s+/, "");
        var previous = placeHolder;
        var list = Expressions.evaluateValue(controller, loop[0].content[0].right);
        for (var index = 0; index < list.length; index++) {
            if (!children[index] || list[index] !== children[index].item) {
                if (children[index] && children[index].domList) {
                    (children[index].domList instanceof Array ? children[index].domList : [children[index].domList]).forEach(function (node) {
                        node.remove();
                    });
                }
                var innerScope = {};
                scopes[++scopeCounterID] = innerScope;
                innerScope[itemName] = list[index];
                var innerDependencies = {};
                var newDom = createDom(controller, scope, innerDependencies, innerScope);
                children[index] = { item: list[index], domList: newDom };
                (newDom instanceof Array ? newDom : [newDom]).forEach(function (newDom) {
                    var ref = previous.nextSibling;
                    if (ref) previous.parentElement.insertBefore(newDom, ref);
                    else previous.parentElement.append(newDom);
                    previous = newDom;
                });
                for (var dependency in innerDependencies) {
                    if (dependency.substring(0, itemName.length) === itemName) {
                        dependencies[listName + "." + index + dependency.substring(itemName.length)] = innerDependencies[dependency].map(function (node) {
                            Mutation.setScope(node, scopeCounterID);
                        });
                    } else {
                        dependencies[dependency] = innerDependencies[dependency];
                    }
                }
            } else {
                if (children[index].domList) {
                    (children[index].domList instanceof Array ? children[index].domList : [children[index].domList]).forEach(function (node) {
                        previous = node;
                    });
                }
            }
        }

        tree.children = children;
    }

});