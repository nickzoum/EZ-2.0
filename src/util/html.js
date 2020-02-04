if (undefined) var Mutation = require("../ez").Mutation;

ezDefine("HTML", function (exports) {
    "use strict";
    // TODO improve support 

    /** @type {{
     *   [valueType: string]: {
     *     list: Array<HTMLElement>, 
     *     set: (dom: HTMLElement, value: *) => boolean, 
     *     get: (dom: HTMLElement) => *
     *   }} */
    var map = {
        "value": {
            list: [
                window.HTMLTextAreaElement,
                window.HTMLSelectElement,
                window.HTMLProgressElement,
                window.HTMLParamElement,
                window.HTMLOutputElement,
                window.HTMLOptionElement,
                window.HTMLMeterElement,
                window.HTMLInputElement,
                window.HTMLDataElement].filter(Boolean),
            set: function (dom, value) {
                dom.setAttribute("value", value);
                dom.value = value;
                return true;
            },
            get: function (dom) {
                return dom.value;
            }
        },
        "checked": {
            list: [HTMLInputElement],
            set: function (dom, value) {
                if (dom.type !== "checkbox") return false;
                dom.setAttribute("checked", value ? "checked" : "unchecked");
                dom.checked = !!value;
                return true;
            },
            get: function (dom) {
                return dom.type !== "checkbox" ? dom.checked : undefined;
            }
        },
        "disabled": {
            list: [
                HTMLTextAreaElement,
                HTMLStyleElement,
                HTMLSelectElement,
                HTMLOptionElement,
                HTMLOptGroupElement,
                HTMLLinkElement,
                HTMLInputElement,
                HTMLFieldSetElement,
                HTMLButtonElement
            ].filter(Boolean),
            set: function (dom, value) {
                dom.disabled = !!value;
                return true;
            },
            get: function (dom) {
                return dom.disabled;
            }
        }
    };

    exports.setValue = setValue;
    exports.getValue = getValue;
    exports.on = on;
    return exports;

    /**
     * Sets the attribute of an element (handles special cases)
     * @param {HTMLInputElement} dom element object
     * @param {string} valueType name of attribute
     * @param {*} value value to set to attribute
     * @returns {boolean} true if special case
     */
    function setValue(dom, valueType, value) {
        var mapValue = map[valueType];
        if (!mapValue || !(mapValue.list.includes(dom.constructor))) return dom.setAttribute(valueType, value), false;
        return mapValue.set(dom, value);
    }

    /**
     * Gets the attribute of an element (handles special cases)
     * @param {HTMLElement} dom element object
     * @param {string} valueType name of attribute
     * @returns {*} value of element for specified attribute
     */
    function getValue(dom, valueType) {
        var mapValue = map[valueType];
        if (!mapValue || !(mapValue.list.includes(dom.constructor))) return dom.getAttribute(valueType);
        return mapValue.get(dom);
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
        if (typeof query === "function") {
            root = listener;
            listener = query;
            query = "*";
        } else if (typeof listener !== "function") throw Error("Listener of Html.on must be a function");
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