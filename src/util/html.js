if (undefined) var Mutation = require("../ez").Mutation;

ezDefine("HTML", function (exports) {
    "use strict";
    // TODO improve support 

    /** @type {{
     *   [valueType: string]: {
     *     list: Array<HTMLElement>, 
     *     set: (attr: Attr, value: *) => boolean, 
     *     get: (attr: Attr) => *
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
            set: function (attr, value) {
                if (!attr.ownerElement) return false;
                attr.value = value;
                attr.ownerElement.value = value;
                return true;
            },
            get: function (attr) {
                return attr.ownerElement.value;
            }
        },
        "checked": {
            list: [HTMLInputElement],
            set: function (attr, value) {
                if (!attr.ownerElement || attr.ownerElement.type !== "checkbox") return false;
                attr.value = value ? "checked" : "unchecked";
                attr.ownerElement.checked = !!value;
                return true;
            },
            get: function (attr) {
                if (attr.ownerElement && attr.ownerElement.type === "checkbox") return attr.ownerElement.checked;
            }
        },
        "readonly": {
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
            set: function (attr, value) {
                if (value) {
                    if (!attr.ownerElement) attr.ezOwnerElement.setAttributeNode(attr);
                } else {
                    if (attr.ownerElement) attr.ownerElement.removeAttributeNode(attr);
                }
                return true;
            },
            get: function (attr) {
                return !!attr.ownerElement;
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
            set: function (attr, value) {
                if (value) {
                    if (!attr.ownerElement) attr.ezOwnerElement.setAttributeNode(attr);
                } else {
                    if (attr.ownerElement) attr.ownerElement.removeAttributeNode(attr);
                }
                return true;
            },
            get: function (attr) {
                return !!attr.ownerElement;
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
        if (dom instanceof Attr) return setAttributeValue(dom, valueType);
        var attribute = dom.getAttributeNode(valueType);
        if (!attribute) attribute = document.createElement(valueType);
        if (!("ezOwnerElement" in attribute)) Mutation.setValue(attribute, "ezOwnerElement", dom);
        return setAttributeValue(attribute, value);
    }

    /**
     * Sets the attribute of an element (handles special cases)
     * @param {Attr} attribute attribute object
     * @param {*} value value to set to attribute
     * @returns {boolean} true if special case
     */
    function setAttributeValue(attribute, value) {
        var name = attribute.name, mapValue = map[name], dom = attribute.ownerElement || attribute.ezOwnerElement;
        if (!(dom instanceof HTMLElement)) return false;
        if (!mapValue || !(mapValue.list.includes(dom.constructor))) {
            try { if (attribute.ownerElement !== dom) dom.setAttributeNode(attribute); }
            catch (err) { console.error(err); }
            attribute.value = value;
            return false;
        }
        if (!("ezOwnerElement" in attribute)) Mutation.setValue(attribute, "ezOwnerElement", dom);
        return mapValue.set(attribute, value);
    }

    /**
     * Gets the attribute of an element (handles special cases)
     * @param {HTMLElement} dom element object
     * @param {string} valueType name of attribute
     * @returns {*} value of element for specified attribute
     */
    function getValue(dom, valueType) {
        if (dom instanceof Attr) return getAttributeValue(dom);
        var attribute = dom.getAttributeNode(valueType);
        if (!attribute) attribute = document.createElement(valueType);
        if (!("ezOwnerElement" in attribute)) Mutation.setValue(attribute, "ezOwnerElement", dom);
        return getAttributeValue(attribute);
    }


    /**
     * Gets the attribute of an element (handles special cases)
     * @param {Attr} attribute attribute object
     * @returns {*} value of element for specified attribute
     */
    function getAttributeValue(attribute) {
        var name = attribute.name, mapValue = map[name], dom = attribute.ownerElement || attribute.ezOwnerElement;
        if (!(dom instanceof HTMLElement)) return false;
        if (!mapValue || !(mapValue.list.includes(dom.constructor))) {
            try { if (attribute.ownerElement !== dom) dom.setAttributeNode(attribute); }
            catch (err) { console.error(err); }
            return;
        }
        if (!("ezOwnerElement" in attribute)) Mutation.setValue(attribute, "ezOwnerElement", dom);
        return mapValue.get(attribute);
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