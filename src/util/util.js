if (undefined) var { Enumerables } = require("../ez");

ezDefine("Util", function (exports) {
    "use strict";

    var protoToSkip = Object.getPrototypeOf({});

    exports.getPrototypeChain = getPrototypeChain;
    exports.startsWith = startsWith;
    exports.getModel = getModel;
    exports.empty = empty;
    exports.cast = cast;
    return exports;

    /**
     * Coalesce for functions (will return an empty function if none are found)
     * @returns {Function} First valid parameter or empty function
     */
    function empty() {
        return (Enumerables.toArray(arguments).find(function (callBack) {
            return !!callBack;
        })) || (function () { });
    }

    /**
     * Casts a value as something else
     * @template {*} E type of cast
     * @param {E} prototype cast
     * @param {*} value value to be cast
     * @returns {E} value cast as the first parameter
     */
    function cast(prototype, value) {
        return value;
    }

    /**
     * More efficient version of `substring(startingIndex).startsWith(searchingFor)` for large strings
     * @param {string} fullText Large text to look through
     * @param {number} startingIndex index to start looking at
     * @param {string} searchingFor text to find
     * @returns {boolean}
     */
    function startsWith(fullText, startingIndex, searchingFor) {
        for (var index = 0; index < searchingFor.length; index++) {
            if (fullText[startingIndex + index] !== searchingFor[index]) return false;
        }
        return true;
    }

    /**
     * Parses a JSON string into an Object
     * @param {string} json JSON string
     * @returns {Object} Parsed JSON
     */
    function fromJson(json) {
        if (typeof json !== "string") return null;
        try { return JSON.parse(json); }
        catch (err) { return /^\[*\]$/.test(json) || /^{*}$/.test(json) || /^"*"$/.test(json) || /^'*'$/.test(json) ? json : null; }
    }

    /**
     * Gets the prototype chain of an object
     * @param {{}} obj Object to get the chain from
     * @returns {Array<{}>} Prototype chain
     */
    function getPrototypeChain(obj) {
        if (typeof obj !== "object") return [];
        var chain = [];
        while (obj) {
            chain.push(obj);
            obj = Object.getPrototypeOf(obj);
        }
        chain.push(null);
        return chain;
    }

    /**
     * 
     * @param {{}} obj
     * @returns {Array<{name: string | Symbol, descr: PropertyDescriptor}>} 
     */
    function getObjectDescription(obj) {
        if (typeof obj !== "object" || obj === null) return [];
        var list = Object.getOwnPropertyNames(obj);
        if (typeof Object.getOwnPropertySymbols === "function") list = list.concat(Object.getOwnPropertySymbols(obj));
        return list.map(function (propertyName) {
            return {
                name: propertyName,
                descr: Object.getOwnPropertyDescriptor(obj, propertyName)
            };
        });
    }

    /**
     * Gets a specified object from a json
     * @param {T} prototype specified object prototype
     * @param {string | T} json json string
     * @template T prototype object or function
     * @returns {T} parsed json as prototype object
     */
    function getModel(prototype, json) {
        return ({
            "undefined": function () { return undefined; },
            "function": function () { return prototype; },
            "symbol": function () { return prototype; },
            "string": function () { return json; },
            "boolean": function () { return !!json; },
            "number": function () { return +json; },
            "object": function () {
                var object = typeof json === "string" ? fromJson(json) : json;
                if (prototype instanceof Array) {
                    if (!object || !(object instanceof Array)) return [];
                    return object.map(function (item) { return getModel(prototype[0], item); });
                } else if (prototype instanceof Date) {
                    if (!object && object !== 0) object = json;
                    if (object === null) return null;
                    object = object instanceof Date ? object : new Date(object);
                    return isNaN(object.valueOf()) ? null : object;
                } else if (object === null) return null;
                return getPrototypeChain(prototype).reduceRight(function (result, proto) {
                    if (protoToSkip === proto) return result;
                    getObjectDescription(proto).forEach(function (descriptor) {
                        var newDescriptor = {}, newValue = getModel(prototype[descriptor.name], object[descriptor.name]);
                        if (typeof descriptor.descr.get === "function") newDescriptor.get = descriptor.descr.get;
                        if (typeof descriptor.descr.set === "function") newDescriptor.set = descriptor.descr.set;
                        if ("configurable" in descriptor.descr) newDescriptor.configurable = descriptor.descr.configurable;
                        if ("enumerable" in descriptor.descr) newDescriptor.enumerable = descriptor.descr.enumerable;
                        if ("writable" in descriptor.descr) newDescriptor.writable = descriptor.descr.writable;
                        if ("value" in descriptor.descr) newDescriptor.value = newValue;
                        Object.defineProperty(result, descriptor.name, newDescriptor);
                        if (!("value" in descriptor.descr)) result[descriptor] = newValue;
                    });
                    return result;
                }, {});
            }
        }[typeof prototype] || function () { throw Error("Unknown type " + typeof prototype); })();
    }

});