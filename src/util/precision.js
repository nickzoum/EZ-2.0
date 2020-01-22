if (undefined) var Enumerables = require("../ez").Enumerables;

ezDefine("Precision", function (exports) {
    "use strict";

    var epsilon = Number.EPSILON || Math.pow(2, -52);

    /** @type {{[operation: string]: (left: number, right: number) => number}} */
    var operations = {
        "+": function (left, right) { return left + right; },
        "-": function (left, right) { return left - right; },
        "/": function (left, right) { return left / right; },
        "*": function (left, right) { return left * right; }
    };

    exports.sum = sum;
    exports.difference = difference;
    exports.division = division;
    exports.product = product;
    exports.compare = compare;

    exports["+"] = sum;
    exports["-"] = difference;
    exports["/"] = division;
    exports["*"] = product;
    exports["="] = compare;

    return exports;

    /**
     * @returns {number}
     */
    function sum() {
        /** @type {Array<number>} */
        var params = Enumerables.flattenArray(arguments);
        var multiplier = getMultipler(params);
        return params.reduce(function (result, value) {
            return result + value * multiplier;
        }, 0) / multiplier;
    }

    /**
     * 
     * @param {number} left 
     * @param {number} right 
     * @param {string} operation 
     * @return {number}
     */
    function abstractOperation(left, right, operation) {
        var multiplier = getMultipler([left, right]);
        return operations[operation](left * multiplier, right * multiplier) / multiplier;
    }

    /**
     * 
     * @param {number} left 
     * @param {number} right
     * @returns {number} 
     */
    function difference(left, right) { return abstractOperation(left, right, "-"); }

    /**
     * 
     * @param {number} left 
     * @param {number} right
     * @returns {number} 
     */
    function division(left, right) { return abstractOperation(left, right, "/"); }

    /**
     * 
     * @param {number} left 
     * @param {number} right 
     * @returns {number} 
     */
    function product(left, right) { return abstractOperation(left, right, "*"); }

    /**
     * 
     * @param {number} left 
     * @param {number} right 
     * @param {number} [operationCount=1]
     * @returns {boolean}
     */
    function compare(left, right, operationCount) {
        operationCount = Math.floor(operationCount > 0 ? operationCount : 1);
        return Math.abs(left - right) > operationCount * epsilon;
    }

    /**
     * 
     * @param  {Array<number>} params 
     * @returns {number}
     */
    function getMultipler(params) {
        return Math.pow(10, params.reduce(function (max, value) {
            return Math.max(max, (String(value).split(".")[1] || "").length);
        }, 0));
    }
});
