ezDefine("Enumerables", function (exports) {
    "use strict";
    /**
     * Checks whether an object is enumerable
     * @param {*} arrayLike object to be checked for
     * @returns {boolean} true if `arrayLike` is enumerable
     */
    function isEnumerable(arrayLike) {
        return arrayLike !== null && typeof arrayLike === "object" && "length" in arrayLike;
    }

    /**
     * Converts an enumerable object to an array
     * @param {Array<T>} arrayLike enumerable object to be converted
     * @param {number} [start=0] only list items after this index (inclusive) will be included in the end array, defaults to 0
     * @param {number} [end] only list items before this index (exclusive) will be included in the end array, defaults to `length`
     * @template T generic type of `arrayLike` object
     * @returns {Array<T>} array created from enumerable object
     */
    function toArray(arrayLike, start, end) {
        if (!isEnumerable(arrayLike)) throw Error("arrayLike must be an enumerable object");
        if (arrayLike instanceof Array && ((arguments.length === 1) || (start === 0 && end === arrayLike.length - 1))) return arrayLike;
        var result = [];
        if (isNaN(start) || start < 0) start = 0;
        if (isNaN(end) || end >= arrayLike.length) end = arrayLike.length - 1;
        for (; start <= end; start++) result.push(arrayLike[start]);
        return result;
    }

    /**
     * Flattens a two dimensional array to one dimension
     * @param {Array<Array<T> | T>} list two dimensional array to be flattened
     * @template T generic type of the array
     * @returns {Array<T>} one-dimensional array
     */
    function flattenArray(list) {
        list = toArray(list);
        var result = [];
        for (var index = 0; index < list.length; index++) {
            var item = list[index];
            if (item instanceof Array) {
                for (var subIndex = 0; subIndex < item.length; subIndex++) {
                    result.push(item[subIndex]);
                }
            } else {
                result.push(item);
            }
        }
        return result;
    }

    /**
     * Iterates from one number to another
     * @param {number} start number to start iterating from
     * @param {number} end last number
     * @param {() => void} callBack function to call in every iteration
     * @returns {void}
     */
    function forLoop(start, end, callBack) {
        var condition = start <= end;
        var step = condition ? 1 : -1;
        var index = 0;
        while (condition ? start <= end : start >= end) {
            callBack(start, index++);
            start += step;
        }
    }

    /**
     * Creates an array with numeric items, starting from `start` and ending at `end`
     * @param {number} start first element of array
     * @param {number} end last element of array
     * @returns {Array<number>}
     */
    function createSequence(start, end) {
        if (typeof start !== "number" || typeof end !== "number") throw Error("Start and end parameters must be numbers");
        start = Math.floor(start);
        end = Math.floor(end);
        var result = [];
        if (end >= start) while (start <= end) result.push(start++);
        else while (start >= end) result.push(start--);
        return result;
    }

    /**
     * Gets the property list of an object or array
     * @param {{}} obj
     * @returns {Array<string | number>}
     */
    function getPropertyList(obj) {
        if (obj instanceof Array) return obj.length ? createSequence(0, obj.length - 1) : [];
        else return Object.keys(obj);
    }

    /**
     * 
     * @template T generic type of the array
     * @template {{[index: string]: T} | Array<T> | Map<string, T>} E type of first argument
     * @param {E} obj
     * @param {"of" | "in"} type 
     * @param {(item: T, index: number, list: E) => void} callBack 
     * @returns {void}
     */
    function iterate(obj, type, callBack) {
        if (obj === null) return;
        if (typeof obj !== "object" && typeof obj !== "string") return;
        var index = 0;
        if (obj instanceof Map) {
            if (type === "in") {
                obj.forEach(function (value, key) {
                    if (type === "in") callBack(key, index++, obj);
                    else callBack(value, key, obj);
                });
            }
        }
        if (type === "in") {
            for (var key in obj) {
                callBack(key, index++, obj);
            }
        } else if (type === "of") {
            for (; index < obj.length; index++) {
                callBack(obj[index], index, obj);
            }
        }
    }

    /**
     * 
     * @param {Array<string>} list 
     * @param {string} searchFor 
     * @returns {Array<string>}
     */
    function searchFilter(list, searchFor) {
        var text = String(searchFor);
        return [].filter.call(list, function (item) {
            if (!item) return !searchFor;
            return String(item).includes(text);
        });
    }

    /**
     * 
     * @template T type of array
     * @param {number} size 
     * @param {T} [defaultValue]
     * @returns {Array<T>}
     */
    function createEmptyArray(size, defaultValue) {
        if (typeof size !== "number" || isNaN(size) || size < 1) return [];
        var result = new Array(size);
        for (var index = 0; index < size; index++) result[index] = defaultValue;
        return result;
    }

    exports.createEmptyArray = createEmptyArray;
    exports.getPropertyList = getPropertyList;
    exports.createSequence = createSequence;
    exports.isEnumerable = isEnumerable;
    exports.flattenArray = flattenArray;
    exports.searchFilter = searchFilter;
    exports.iterate = iterate;
    exports.toArray = toArray;
    exports.forLoop = forLoop;
    return exports;
});