ezDefine("Mutation", function (exports) {

    var arrayFunctions = ["copyWithin", "fill", "pop", "push", "shift", "unshift", "slice", "sort", "splice"];

    exports.addListener = addListener;
    exports.deepClone = deepClone;
    return exports;

    /**
     * @template {{}} T
     * @param {T} oldObject 
     * @returns {T}
     */
    function deepClone(oldObject) {
        if (typeof oldObject !== "object" || oldObject === null) return oldObject;
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
     * @returns {void} 
     */
    function addListener(obj, callBack, path) {
        // TODO remove get and set on object removal
        if (typeof obj !== "object" || obj === null) return;
        path = path || "";
        if (obj instanceof Array) {
            arrayFunctions.forEach(function (functionName) {
                var description = Object.getOwnPropertyDescriptor(obj, functionName);
                if (description && !description.configurable) return;
                var oldFunction = obj[functionName];
                Object.defineProperty(obj, functionName, {
                    configurable: false,
                    enumerable: false,
                    writable: false,
                    value: function () { addListener(obj, callBack, path); return oldFunction.apply(this, arguments); }
                });
            });
            var list = "0".repeat(obj.length).split("").map(function (v, i) { return i; });
        } else {
            list = Object.keys(obj);
        }
        list.forEach(function (key) {
            var oldProperty = Object.getOwnPropertyDescriptor(obj, key);
            if (oldProperty.configurable === false) return;
            var newProperty = {
                enumerable: true,
                configurable: false
            };
            var _value = obj[key];
            if ("value" in oldProperty) {
                var oldGet = function () { return _value; };
                var oldSet = function (newValue) { _value = newValue; };
                newProperty.get = get;
                if (oldProperty.writable) newProperty.set = set;
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
            var fullPath = (path ? (path + ".") : "") + key;
            Object.defineProperty(obj, key, newProperty);
            callBack(obj, key, "set", _value, path);
            if (typeof _value === "object" && _value !== null) {
                addListener(_value, callBack, fullPath);
            }

            function get() {
                var result = oldGet();
                callBack(obj, key, "get", result, path);
                return result;
            }

            function set(newValue) {
                oldSet(newValue);
                callBack(obj, key, "set", newValue, path);
                if (typeof newValue === "object" && newValue !== null) addListener(newValue, callBack, fullPath);
            }
        });
    }

});