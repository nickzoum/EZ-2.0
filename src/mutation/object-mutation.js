if (undefined) var Enumerables = require("../ez").Enumerables;

/** @typedef {require("../ez")} JSDoc */

ezDefine("Mutation", function (exports) {
    "use strict";

    var arrayFunctions = ["copyWithin", "fill", "pop", "push", "shift", "unshift", "sort", "splice"];

    var scopeID = 0;

    /** @type {Map<{}, JSDoc.ObjectListenerScope>} */
    var referenceMap = new Map();

    exports.addListener = function (obj, callBack) {
        if (typeof callBack !== "function") return;
        addListener(obj, callBack, "", function () { return false; }, ++scopeID);
    };
    exports.deepClone = deepClone;
    exports.setValue = setValue;
    return exports;

    /**
     * @template {{}} T
     * @param {T} oldObject 
     * @returns {T}
     */
    function deepClone(oldObject) {
        if (typeof oldObject !== "object" || oldObject === null) return oldObject;
        if (oldObject instanceof Array) return oldObject.map(deepClone);
        if (oldObject[key] instanceof Date) return new Date(+oldObject);
        var newObject = {};
        for (var key in oldObject) {
            ({
                "function": function () {
                    newObject[key] = oldObject[key];
                },
                "undefined": function () {
                    newObject[key] = undefined;
                },
                "symbol": function () {
                    newObject[key] = oldObject[key];
                },
                "object": function () {
                    if (oldObject[key] instanceof Array) newObject[key] = oldObject[key].map(deepClone);
                    else if (oldObject[key] instanceof Date) newObject[key] = new Date(oldObject[key].valueOf());
                    else if (oldObject[key] instanceof URL) newObject[key] = new URL(oldObject[key].href);
                    else newObject[key] = deepClone(oldObject[key]);
                },
                "string": function () {
                    newObject[key] = oldObject[key];
                },
                "number": function () {
                    newObject[key] = oldObject[key];
                },
                "bigint": function () {
                    newObject[key] = oldObject[key];
                },
                "boolean": function () {
                    newObject[key] = oldObject[key];
                }
            }[typeof oldObject[key]] || function () { })();
        }
        return newObject;
    }

    /**
     * 
     * @param {{}} obj
     * @param {(target: {}, property: string, type: "get" | "set", value: *, path: string) => void} callBack
     * @param {Array<string>} [path]
     * @param {() => boolean} checkParent
     * @param {number} scopeID
     * @returns {void} 
     */
    function addListener(obj, callBack, path, checkParent, scopeID, parentScope, parentKey) {
        if (typeof obj !== "object" || obj === null) return;
        if (checkParent(obj)) return;
        var fullScope = scopeID + "#" + path;
        var reference = referenceMap.get(obj);
        var existed = reference;
        if (!existed) {
            reference = {
                references: {},
                children: {}
            };
            referenceMap.set(obj, reference);
            addArrayListener(obj, function () {
                for (var refKey in reference.references) {
                    if (reference.references[refKey] && typeof reference.references[refKey].callBack === "function") {
                        reference.references[refKey].callBack(obj, null, "set", obj, reference.references[refKey].path);
                    }
                }
                Enumerables.getPropertyList(obj).forEach(function (key) {
                    addListener(obj[key], callBack, path + (path ? "." : "") + key, childCheckParent, scopeID, reference.children, key);
                });
            });
        }
        reference.references[fullScope] = {
            callBack: callBack,
            path: path
        };
        if (parentScope) parentScope[parentKey] = reference.references[fullScope];
        Enumerables.getPropertyList(obj).forEach(function (key) {
            var oldValue = obj[key];
            if (!(obj instanceof Array) && !existed) addDescriptor(obj, key, oldValue, reference, refreshProperty);
            addListener(oldValue, callBack, path + (path ? "." : "") + key, childCheckParent, scopeID, reference.children, key);
        });

        function childCheckParent(otherObj) {
            return obj === otherObj || checkParent(otherObj);
        }

        function refreshProperty(newValue, key) {
            addListener(newValue, callBack, path + (path ? "." : "") + key, childCheckParent, scopeID, reference.children, key);
        }
    }

    /**
     * 
     * @param {{}} obj 
     * @param {string} key 
     * @param {*} oldValue 
     * @param {JSDoc.ObjectListenerScope} reference 
     * @param {(newObject: *) => void} refreshProperty 
     */
    function addDescriptor(obj, key, oldValue, reference, refreshProperty) {
        var oldProperty = Object.getOwnPropertyDescriptor(obj, key);
        if (!oldProperty || oldProperty.configurable) {
            var newProperty = {
                enumerable: true,
                configurable: false
            };
            if (!oldProperty || "value" in oldProperty) {
                var oldGet = function () { return oldValue; };
                var oldSet = function (newValue) { oldValue = newValue; };
                newProperty.get = get;
                if (!oldProperty || oldProperty.writable) newProperty.set = set;
            } else {
                if (typeof oldProperty.get === "function") {
                    oldGet = oldProperty.get;
                    newProperty.get = get;
                } else return;
                if (typeof oldProperty.set === "function") {
                    oldSet = oldProperty.set;
                    newProperty.set = set;
                }
            }
            Object.defineProperty(obj, key, newProperty);
        }

        function get() {
            return oldGet();
            // TODO allow option to skip
            /*var result = oldGet();
             for (var refKey in reference.references) {
                 if (reference.references[refKey] && typeof reference.references[refKey].callBack === "function") {
                     reference.references[refKey].callBack(obj, key, "get", result, reference.references[refKey].path);
                 }
             }
             return result;*/
        }

        function set(newValue) {
            var _oldValue = oldValue;
            oldSet(newValue);
            if (_oldValue !== newValue) deleteCascade(reference);
            for (var refKey in reference.references) {
                if (reference.references[refKey] && typeof reference.references[refKey].callBack === "function") {
                    reference.references[refKey].callBack(obj, key, "set", newValue, reference.references[refKey].path);
                }
            }
            refreshProperty(newValue, key);
        }

        /**
         * 
         * @param {JSDoc.ObjectListenerScope} scope 
         */
        function deleteCascade(scope) {
            for (var child in scope.children) {
                deleteCascade(scope.children[child]);
                for (var refKey in scope.children[child].references) {
                    scope.children[child].references[refKey].callBack = null;
                }
            }
        }
    }

    /**
     * 
     * @param {*} obj 
     * @param {*} callBack 
     * @returns {}
     */
    function addArrayListener(obj, callBack) {
        if (obj instanceof Array) {
            arrayFunctions.forEach(function (functionName) {
                if (!(functionName in Array.prototype)) return;
                var description = Object.getOwnPropertyDescriptor(obj, functionName);
                if (description && !description.configurable) return;
                var oldFunction = obj[functionName];
                Object.defineProperty(obj, functionName, {
                    configurable: false,
                    enumerable: false,
                    writable: false,
                    value: function () {
                        var result = oldFunction.apply(this, arguments);
                        callBack();
                        return result;
                    }
                });
            });
        }
    }

    /**
     * Sets the value of an object and makes it immutable
     * @param {{}} obj object to add property to
     * @param {string} key name of property
     * @param {*} value value of property to be added
     * @returns {obj} initial object
     */
    function setValue(obj, key, value) {
        return Object.defineProperty(obj, key, {
            value: value,
            configurable: false,
            writable: false,
            enumerable: false
        }), obj;
    }

});