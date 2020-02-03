if (undefined) var { Enumerables } = require("../ez");

ezDefine("Util", function (exports) {
    "use strict";

    exports.getPrototypeChain = getPrototypeChain;
    exports.startsWith = startsWith;
    exports.getModel = getModel;
    exports.empty = empty;
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
     * Gets a specified object from a json
     * @param {T} prototype specified object prototype
     * @param {string | T} json json string
     * @template T prototype object or function
     * @returns {T} parsed json as prototype object
     */
    function getModel(prototype, json) {
        return ({
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
                    for (var key in proto) result[key] = getModel(prototype[key], object[key]);
                    return result;
                }, {});
            }
        }[typeof prototype] || function () { throw Error("Unknown type " + typeof prototype); })();
    }

});