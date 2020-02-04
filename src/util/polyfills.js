ezDefine("EZ", function () {
    "use strict";
    if (typeof Object.defineProperty !== "function") throw Error("Incopatible browser");

    /**
     * Adds a function to the prototype of a class
     * @param {{}} prototype The prototype of the class
     * @param {string} propertyName Name of property to be added
     * @param {Function} declaration Body of the property to be added
     * @returns {void}
     */
    function define(prototype, propertyName, declaration) {
        if (typeof prototype[propertyName] !== "function") {
            if (typeof Object.defineProperty === "function") {
                Object.defineProperty(prototype, propertyName, {
                    enumerable: false,
                    configurable: false,
                    value: declaration,
                    writable: false
                });
            } else {
                prototype[propertyName] = declaration;
            }
        }
    }

    define(Array.prototype, "findIndex", function (callbackfn, thisArg) {
        if (typeof callbackfn !== "function") throw new TypeError("callback is not a function");
        if (this === null || this === undefined) throw new TypeError("Array.prototype.findIndex called on null or undefined");
        for (var index = 0; index < this.length; index++) {
            if (index in this) {
                if (thisArg === undefined ? callbackfn(this[index], index, this) : callbackfn.call(thisArg, this[index], index, this)) return index;
            }
        }
        return -1;
    });
    define(Array.prototype, "find", function (callbackfn, thisArg) {
        if (typeof callbackfn !== "function") throw new TypeError("callback is not a function");
        if (this === null || this === undefined) throw new TypeError("Array.prototype.find called on null or undefined");
        for (var index = 0; index < this.length; index++) {
            if (index in this) {
                if (thisArg === undefined ? callbackfn(this[index], index, this) : callbackfn.call(thisArg, this[index], index, this)) return this[index];
            }
        }
    });
    define(Array.prototype, "includes", function (searchElement, fromIndex) {
        return Array.prototype.indexOf.call(this, searchElement, fromIndex) !== -1;
    });
    define(Array.prototype, "some", function (callbackfn, thisArg) {
        return Array.prototype.findIndex.call(this, callbackfn, thisArg) !== -1;
    });
    define(String.prototype, "repeat", function (count) {
        if (typeof count !== "number" || isNaN(count) || count < 0) count = 0;
        var result = [];
        while (count-- > 0) result.push(this);
        return result.join("");
    });
    define(String.prototype, "includes", function (text) {
        return this.indexOf(text) !== -1;
    });
    define(String.prototype, "startsWith", function (text) {
        return this.substring(0, text.length) === text;
    });
    define(String.prototype, "endsWith", function (text) {
        return this.substring(this.substring.length - text.length) === text;
    });
    define(NodeList.prototype, "forEach", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        for (var index = 0; index < this.length; index++) {
            callbackfn.call(this, this[index], index, thisArg);
        }
    });
    define(Object, "values", function (obj) {
        return Object.keys(obj).map(function (key) { return obj[key]; });
    });
    define(Object, "entries", function (obj) {
        return Object.keys(obj).map(function (key) { return [key, obj[key]]; });
    });
    define(Node.prototype, "remove", function () {
        if (this.parentNode) return this.parentNode.removeChild(this);
    });
    define(Node.prototype, "replaceWith", function () {
        var parent = this.parentNode, index = arguments.length, currentNode;
        if (!parent) return;
        if (!index) parent.removeChild(this);
        while (index--) {
            currentNode = arguments[index];
            if (currentNode.parentNode) currentNode.parentNode.removeChild(currentNode);
            if (!index) parent.replaceChild(currentNode, this);
            else parent.insertBefore(currentNode, this.previousSibling);
        }
    });
    define(Math, "log2", function (number) {
        return Math.log(number) / Math.log(2);
    });
    define(Math, "log10", function (number) {
        return Math.log(number) / Math.log(10);
    });
    define(window, "Promise", function (callBack) {
        var isCompleted = false;
        var catchList = [];
        var thenList = [];
        define(this, "then", function (callBack) {
            if (typeof callBack === "function") thenList.push(callBack);
            return this;
        });
        define(this, "catch", function (callBack) {
            if (typeof callBack === "function") catchList.push(callBack);
            return this;
        });
        define(this, "finally", function (callBack) {
            if (typeof callBack === "function") {
                thenList.push(function () { callBack(); });
                catchList.push(function () { callBack(); });
            }
            return this;
        });

        setTimeout(function () {
            callBack(resolve, reject);
        }, 0);

        function resolve(result) {
            if (isCompleted) return;
            thenList.forEach(function (callBack) { callBack(result); });
            isCompleted = true;
        }

        function reject(error) {
            if (isCompleted) return;
            catchList.forEach(function (callBack) { callBack(error); });
            isCompleted = true;
        }
    });
});