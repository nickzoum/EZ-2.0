ezDefine("Mutation", function (exports) {

    exports.addDomListener = addDomListener;
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
     * @param {JSDoc.EZExpression} tree 
     */
    function setTree(node, tree) {
        Object.defineProperty(node, "tree", {
            configurable: false,
            enumerable: false,
            writable: false,
            value: tree
        });
    }

});