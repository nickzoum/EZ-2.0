if (undefined) var Parser = require("../ez").Parser;
if (undefined) var Mutation = require("../ez").Mutation;
if (undefined) var Expressions = require("../ez").Expressions;

/** @typedef {require("../ez")} JSDoc */

ezDefine("View", function (exports) {

    // TODO cache control header, public, 60*60*24*10

    var specialClasses = ["loop", "let", "pass", "if"];
    var tempDom = document.createElement("div");

    var treeCounterID = 0;

    var views = {};
    var trees = {};

    exports.registerView = registerView;
    addMutationListener();

    function addMutationListener() {
        Mutation.addDomListener(function (changes) {
            changes.forEach(function (change) {
                if (change.addedNodes instanceof Array) change.addedNodes.forEach(function (dom) {
                    if (dom instanceof HTMLElement && dom.tagName in views) createView(dom, views[dom.tagName].tree, views[dom.tagName].controller);
                });
                if (change.removedNodes instanceof Array) change.removedNodes.forEach(function () {
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
        /** @type {} */
        var dependencies = {};
        var newController = Mutation.deepClone(controller);
        if (typeof newController.construct === "function") {
            if (container.hasAttribute("ez-pass") && "tree" in container) {
                var paramList = container.tree.ezAttributes.pass;
                paramList = paramList instanceof Array ? paramList : [paramList];
                paramList = paramList.map(function (param) { return Expressions.evaluateValue(newController, param); });
                var promise = newController.construct.apply(newController, paramList);
            } else promise = newController.construct();
            if (promise instanceof Promise) return promise.finally(initDom);
            else initDom();
        } else initDom();

        function initDom() {
            var domList = createDom(newController, tree, dependencies);
            Mutation.addListener(newController, function (target, property, type, value, path) {
                if (type === "get") return;
                // TODO smooth array
                var fullPath = (path ? path + "." : "") + property;
                if (fullPath in dependencies || "this" in dependencies) {
                    dependencies[fullPath].concat(dependencies["this"]).forEach(function (node) {
                        if (node instanceof Node) {
                            node.textContent = Expressions.evaluateValue(newController, trees[node.treeID]);
                        } else if (node instanceof Attr) {
                            node.value = Expressions.evaluateValue(newController, trees[node.treeID]);
                        }
                    });
                }
            });
            (domList instanceof Array ? domList : [domList]).forEach(function (dom) {
                container.appendChild(dom);
            });
            if (typeof newController.onLoad === "function") newController.onLoad();
        }
    }

    /**
     * 
     * @param {JSDoc.HTMLContent | JSDoc.HTMLScope} tree 
     * @returns {HTMLElement | Array<HTMLElement>}
     */
    function createDom(controller, tree, dependencies) {
        if (tree instanceof Array) return tree.map(function (subTree) { return createDom(controller, subTree, dependencies); });
        return ({
            "HTMLContent": function () {
                /** @type {JSDoc.HTMLContent} */
                var content = tree;
                return content.content.map(function (item) {
                    return typeof item === "string" ? new Text(item) : createDom(controller, item, dependencies);
                });
            },
            "Scope": function () {
                /** @type {JSDoc.HTMLScope} */
                var scope = tree;
                var dom = document.createElement(scope.name);
                for (var key in scope.attributes) dom.setAttribute(key, scope.attributes[key]);
                for (key in scope.ezAttributes) {
                    if (key.startsWith("on-")) {
                        // TODO implement functions and event listeners
                    } else {
                        if (specialClasses.includes(key)) {
                            dom.setAttribute("ez-" + key, scope.ezAttributes[key].map(function (item) { return item.text; }).join(","));
                            // TODO
                        } else if (scope.ezAttributes[key][0].text) {
                            dom.setAttribute("ez-" + key, scope.ezAttributes[key][0].text);
                            var attribute = document.createAttribute(key);
                            trees[++treeCounterID] = scope.ezAttributes[key][0];
                            Mutation.setTree(attribute, treeCounterID);
                            dom.setAttributeNode(attribute);
                            scope.ezAttributes[key][0].dependencies.forEach(function (dependency) {
                                dependencies[dependency] = dependencies[dependency] || [];
                                dependencies[dependency].push(attribute);
                            });
                        }
                    }
                }
                if (scope.text) dom.append.apply(dom, createDom(controller, scope.text, dependencies));
                return dom;
            },
            "Expression": function () {
                var text = new Text();
                trees[++treeCounterID] = tree;
                Mutation.setTree(text, treeCounterID);
                tree.dependencies.forEach(function (dependency) {
                    dependencies[dependency] = dependencies[dependency] || [];
                    dependencies[dependency].push(text);
                });
                return text;
            }
        }[tree.type])();
    }

});