if (undefined) var { Enumerables } = require("../ez");

ezDefine("Functions", function (exports) {


    /**
     * Coalesce for functions (will return an empty function if none are found)
     * @returns {Function} First valid parameter or empty function
     */
    function empty() {
        return (Enumerables.toArray(arguments).find(function (callBack) {
            return !!callBack;
        })) || (function () { });
    }

    exports.empty = empty;
    return exports;
});