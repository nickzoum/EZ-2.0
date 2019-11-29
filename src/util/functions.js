if (undefined) var { Enumerables } = require("../ez");

ezDefine("Util", function (exports) {

    exports.startsWith = startsWith;
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

});