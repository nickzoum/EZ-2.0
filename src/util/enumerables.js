ezDefine("Enumerables", function (exports) {

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
        for (; start < end; start++) result.push(arrayLike[start]);
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

    exports.isEnumerable = isEnumerable;
    exports.flattenArray = flattenArray;
    exports.toArray = toArray;
    exports.forLoop = forLoop;
    return exports;
});