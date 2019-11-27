ezDefine("EZ", function () {
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
                    configurable: false,
                    value: declaration,
                    writable: false
                });
            } else {
                prototype[propertyName] = declaration;
            }
        }
    }

    define(Array.prototype, "forEach", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        for (var index = 0; index < this.length; index++) {
            callbackfn.call(thisArg, this[index], index, this);
        }
    });
    define(Array.prototype, "reduce", function (callbackfn, initialValue) {
        Array.prototype.forEach.call(this, function (value, index, array) {
            initialValue = callbackfn.call(this, initialValue, value, index, array);
        });
        return initialValue;
    });
    define(Array.prototype, "map", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        return Array.prototype.reduce.call(this, function (accumulator, value, index, array) {
            accumulator.push(callbackfn.call(thisArg, value, index, array));
            return accumulator;
        }, []);
    });
    define(Array.prototype, "filter", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        return Array.prototype.reduce.call(this, function (accumulator, value, index, array) {
            if (callbackfn.call(thisArg, value, index, array)) accumulator.push(value);
            return accumulator;
        }, []);
    });
    define(Array.prototype, "findIndex", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        for (var index = 0; index < this.length; index++) {
            if (callbackfn.call(thisArg, this[index], index, this)) return index;
        }
        return -1;
    });
    define(Array.prototype, "find", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        return this[Array.prototype.findIndex.call(this, callbackfn, thisArg)];
    });
    define(Array.prototype, "indexOf", function (searchElement, fromIndex) {
        if (typeof fromIndex !== "number" || isNaN(fromIndex) || fromIndex < 0) fromIndex = 0;
        for (var index = 0; index < this.length; index++) {
            if (this[index] === searchElement) return index;
        }
        return -1;
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
    define(String.prototype, "reverse", function () {
        return String.prototype.split.call(this, "").reverse().join("");
    });
    define(NodeList.prototype, "toArray", function () {
        return Array.prototype.slice.call(this, 0);
    });
    define(NodeList.prototype, "forEach", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        for (var index = 0; index < this.length; index++) {
            callbackfn.call(this, this[index], index, thisArg);
        }
    });
    define(NodeList.prototype, "map", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        return Array.prototype.reduce.call(this, function (accumulator, value, index, array) {
            accumulator.push(callbackfn.call(thisArg, value, index, array));
            return accumulator;
        }, []);
    });
    define(NodeList.prototype, "filter", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        return Array.prototype.reduce.call(this, function (accumulator, value, index, array) {
            if (callbackfn.call(thisArg, value, index, array)) accumulator.push(value);
            return accumulator;
        }, []);
    });
    define(NodeList.prototype, "some", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        return Array.prototype.some.call(this, callbackfn, thisArg);
    });
    define(NodeList.prototype, "find", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        return Array.prototype.find.call(this, callbackfn, thisArg);
    });
    define(NodeList.prototype, "first", function () {
        return this[0];
    });
    define(NodeList.prototype, "last", function () {
        return this[this.length - 1];
    });
    define(Object.prototype, "join", function (seperator) {
        return Object.keys(this).join(seperator);
    });
    define(Object.prototype, "forEach", function (callbackfn, thisArg) {
        if (arguments.length === 1) thisArg = this;
        for (var key in this) {
            callbackfn.call(this, this[key], key, thisArg);
        }
    });
    define(Object, "values", function (obj) {
        return Object.keys(obj).map(function (key) { return obj[key]; });
    });
    define(Object, "entries", function (obj) {
        return Object.keys(obj).map(function (key) { return [key, obj[key]]; });
    });
    define(HTMLElement.prototype, "remove", function () {
        return this.parentElement.removeChild(this);
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
    define(HTMLElement.prototype, "hasClass", function () {
        if (arguments.length === 0) return false;
        var element = this;
        return Array.prototype.some.call(arguments, function (className) {
            return element.classList.contains(className);
        });
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