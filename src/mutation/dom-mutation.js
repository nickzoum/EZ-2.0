ezDefine("Mutation", function (exports) {
    "use strict";

    exports.addDomListener = addDomListener;
    exports.setPlaceholder = setPlaceholder;
    exports.setScope = setScope;
    exports.setTree = setTree;
    return exports;

    /**
     * 
     * @param {(changes: Array<MutationRecord>) => void} callBack 
     * @param {HTMLElement} [dom=document.body] 
     * @param {boolean} [checkAttributes=true]
     * @param {boolean} [checkChildren=true]
     * @returns {void}
     */
    function addDomListener(callBack, dom, checkAttributes, checkChildren) {
        if (!(dom instanceof HTMLElement)) dom = document.body;
        if (arguments.length < 2) checkAttributes = true;
        if (arguments.length < 3) checkChildren = true;
        if (!checkAttributes && !checkChildren) return;
        var config = {};
        config.attributes = !!checkAttributes;
        config.childList = !!checkChildren;
        config.subtree = !!checkChildren;
        var observer = new MutationObserver(callBack);
        observer.observe(dom, config);
    }

    /**
     * 
     * @param {Node} node 
     * @param {number} treeID 
     */
    function setTree(node, treeID) {
        Object.defineProperty(node, "treeID", {
            configurable: false,
            enumerable: false,
            writable: false,
            value: treeID
        });
    }

    /**
     * 
     * @param {Node} node 
     * @param {number} scopeID 
     */
    function setScope(node, scopeID) {
        Object.defineProperty(node, "scopeID", {
            configurable: false,
            enumerable: false,
            writable: false,
            value: scopeID
        });
    }

    /**
     * 
     * @param {Node} node 
     * @param {number} placeholderID 
     */
    function setPlaceholder(node, placeholderID) {
        Object.defineProperty(node, "placeholderID", {
            configurable: false,
            enumerable: false,
            writable: false,
            value: placeholderID
        });
    }

});