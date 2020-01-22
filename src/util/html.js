if (undefined) var Mutation = require("../ez").Mutation;

ezDefine("HTML", function (exports) {
    "use strict";
    // TODO improve support (select, option...)

    var map = {
        "value": [
            window.HTMLTextAreaElement,
            window.HTMLSelectElement,
            window.HTMLProgressElement,
            window.HTMLParamElement,
            window.HTMLOutputElement,
            window.HTMLOptionElement,
            window.HTMLMeterElement,
            window.HTMLInputElement,
            window.HTMLDataElement].filter(Boolean),
        "checked": [HTMLInputElement]
    };

    exports.setValue = setValue;
    exports.getValue = getValue;
    exports.on = on;
    return exports;

    /**
     * 
     * @param {HTMLInputElement} dom 
     * @param {string} valueType 
     * @param {*} value 
     * @returns {boolean}
     */
    function setValue(dom, valueType, value) {
        if (!(valueType in map) || !(map[valueType].includes(dom.constructor))) {
            dom.setAttribute(valueType, value);
            return false;
        }
        if (valueType === "value") {
            dom.setAttribute("value", value);
            dom.value = value;
        } else if (valueType === "checked") {
            if (dom.type !== "checkbox") return;
            dom.setAttribute("checked", value ? "checked" : "unchecked");
            dom.checked = !!value;
        }
        return true;
    }

    /**
     * 
     * @param {HTMLInputElement} dom 
     * @param {string} valueType
     * @returns {string | boolean}
     */
    function getValue(dom, valueType) {
        if (valueType in map && map[valueType].includes(dom.constructor)) return dom[valueType];
        return dom.getAttribute(valueType);
    }

    /**
     * Adds a global event listener
     * @template {keyof HTMLElementEventMap} K event type
     * @param {K} type event type
     * @param {string} query css query
     * @param {(this: HTMLElement, ev: HTMLElementEventMap[K]) => void} listener event listener
     * @param {HTMLElement} [root=document.body] optional root element 
     * @returns {void}
     */
    function on(type, query, listener, root) {
        if (typeof listener !== "function") throw Error("Listener of Html.on must be a function");
        if (!(root instanceof HTMLElement)) root = document.body;
        var managingElements = [];
        refresh();

        Mutation.addDomListener(function (changes) {
            if (changes.some(function (change) {
                return change.addedNodes.length;
            })) refresh();
        }, root, false, true);

        function refresh() {
            root.querySelectorAll(query).forEach(function (dom) {
                if (managingElements.includes(dom)) return;
                dom.addEventListener(type, listener);
            });
        }
    }
});