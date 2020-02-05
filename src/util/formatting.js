ezDefine("Formatting", function (exports) {
    "use strict";

    var decimalPoint = {
        current: /\./g,
        desired: "."
    };

    var thousandSeparator = {
        current: /,/g,
        desired: ""
    };

    var percentageSign = "%";

    var currency = " \u20AC";

    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    /**
     * Custom toString method for numbers
     * @param {number} number number to be transformed
     * @param {string} format form of requested number
     * @returns {string} string form of requested number 
     */
    function numberToString(number, format) {
        // TODO improve accuracy
        // eslint-disable-next-line valid-typeof
        if (format === "?") return number;
        if ((typeof number !== "number" && typeof number !== "bigint") || isNaN(number)) number = +number || 0; // jshint ignore:line
        var sign = number < 0 ? "-" : "";
        number = Math.abs(number);
        if (typeof format !== "string") format = "G";
        var result = /^([CDEFGNPRX])(\d*)$/.exec(format.toUpperCase());
        if (!result || !result[1]) result = [null, "G"];
        var formatType = result[1];
        var precision = +result[2];
        if (isNaN(precision) || precision < 0) precision = undefined;
        return sign + ({
            "C": function () {
                return this.F() + currency;
            },
            "D": function () {
                var result = numberGetInteger(number, "");
                if (precision === undefined) precision = result.length;
                precision -= result.length;
                return "0".repeat(Math.max(0, precision)) + result;
            },
            "E": function () {
                if (precision === undefined) precision = 6;
                if (number === 0) return 0;
                var exponent = Math.floor(Math.log10(number)) - 1;
                number /= Math.pow(10, exponent - precision);
                number = Math.round(number) / Math.pow(10, precision);
                var decimal = numberGetInteger((number % 1) * Math.pow(10, precision), "");
                if (decimal === "0") decimal = "";
                if (decimal.length > precision) { decimal = ""; number += 1; }
                return numberGetInteger(number, "") + (precision ? decimalPoint.desired : "") + decimal + format[0] + "+" + numberGetInteger(exponent, "");
            },
            "F": function () {
                if (precision === undefined) precision = 2;
                var decimal = numberGetInteger((number % 1) * Math.pow(10, precision), "");
                if (decimal === "0") decimal = "";
                if (decimal.length > precision) { decimal = ""; number += 1; }
                return numberGetInteger(number, "") + (precision ? decimalPoint.desired : "") + decimal + "0".repeat(Math.max(0, precision - decimal.length));
            },
            "G": function () {
                if (precision === undefined) precision = 15;
                var decimal = numberGetInteger((number % 1) * Math.pow(10, precision), "");
                if (decimal === "0") decimal = "";
                if (decimal.length > precision) { decimal = ""; number += 1; }
                return numberGetInteger(number, "") + (decimal ? decimalPoint.desired : "") + decimal;
            },
            "N": function () {
                if (precision === undefined) precision = 15;
                var decimal = numberGetInteger((number % 1) * Math.pow(10, precision), "") || "";
                if (decimal === "0") decimal = "";
                if (decimal.length > precision) { decimal = ""; number += 1; }
                return numberGetInteger(number, thousandSeparator.desired) + (decimal ? decimalPoint.desired : "") + decimal;
            },
            "P": function () {
                if (precision === undefined) precision = 2;
                number *= 100;
                var decimal = numberGetInteger((number % 1) * Math.pow(10, precision), "");
                if (decimal === "0") decimal = "";
                if (decimal.length > precision) { decimal = ""; number += 1; }
                return numberGetInteger(number, "") + (precision ? decimalPoint.desired : "") + decimal + "0".repeat(Math.max(0, precision - decimal.length)) + percentageSign;
            }
        }[formatType])();
    }

    /**
     * 
     * @param {number} number 
     * @param {string} replaceWith 
     * @returns {string}
     */
    function numberGetInteger(number, replaceWith) {
        return Math.round(number).toLocaleString("en-US").replace(thousandSeparator.current, replaceWith);
    }

    /**
     * Changes the decimal point of numbers
     * @param {"." | ","} newPoint
     * @returns {void} 
     */
    function setDecimalPoint(newPoint) {
        decimalPoint.desired = String(newPoint);
        setTimeout(function () {
            if (decimalPoint.desired === thousandSeparator.desired) {
                console.warn("The desired characters for the decimal point and the thousand separator are identical");
            }
        }, 0);
    }

    /**
     * Changes the thousand separator
     * @param {"." | ","} newSeparator
     * @returns {void} 
     */
    function setThousandSeparator(newSeparator) {
        thousandSeparator.desired = newSeparator;
        setTimeout(function () {
            if (decimalPoint.desired === thousandSeparator.desired) {
                console.warn("The desired characters for the decimal point and the thousand separator are identical");
            }
        }, 0);
    }

    /**
     * Changes the thousand separator
     * @param {string} newSign
     * @returns {void} 
     */
    function setPercentageSign(newSign) {
        percentageSign = newSign;
    }

    /**
     * Changes the currency sign
     * @param {string} newSign
     * @returns {void} 
     */
    function setCurrencySign(newSign) {
        currency = newSign;
    }

    /**
     * Custom toString method for dates
     * @param {Date} date date object
     * @param {string} format string format
     * @returns {string} string form of requested date
     */
    function dateToString(date, format) {
        date = date instanceof Date && !isNaN(date.valueOf()) ? date : new Date();
        format = format && (typeof format == "string") ? format : "HH:mm dd/MM/yy";
        var year = String(date.getFullYear());
        var month = String(date.getMonth() + 1);
        var monthDate = String(date.getDate());
        var day = String(date.getDay());
        var weekDay = weekDays[day];
        var fullMonth = months[month - 1];
        var hour = date.getHours();
        var hour12 = String(hour % 12);
        var hour24 = String(hour);
        var min = String(date.getMinutes());
        var sec = String(date.getSeconds());
        var fs = (sec - 0) + min * 60;
        return massReplace(format, {
            "EEEE": weekDay,
            "FME": fullMonth,
            "EEE": weekDay.substring(0, 3),
            "FMS": fullMonth.substring(0, 3),
            "yy": shortenText(year, 2, 2),
            "MM": shortenText(month, 2, 2),
            "dd": shortenText(monthDate, 2, 2),
            "hh": shortenText(hour12, 2),
            "HH": shortenText(hour24, 2),
            "mm": shortenText(min, 2, 2),
            "ss": shortenText(sec, 2),
            "M": month,
            "d": monthDate,
            "E": shortenText(day, -1, 1),
            "y": year,
            "h": hour12,
            "H": hour24,
            "fs": fs,
            "m": min,
            "s": sec
        });
    }

    /**
     * Does complex regex replacements
     * @param {string} text original text
     * @param {{[regexp: string]: string}} regexList list of expressions and replacements
     * @returns {string} replaced string
     */
    function massReplace(text, regexList) {
        return text.replace(new RegExp("(" + Object.keys(regexList).join("|") + ")", "g"), function (part) {
            return regexList[part];
        });
    }


    /**
     * Controls the size of a text
     * @param {string} text - text
     * @param {number} [min=-1] - min size
     * @param {number} [max=-1] - max size
     * @returns {string}
     */
    function shortenText(text, min, max) {
        min = typeof min === "number" ? min : -1;
        max = typeof max === "number" ? max : -1;
        if (min != -1) {
            var diff = min - text.length;
            if (diff > 0) {
                var extra = "0".repeat(diff);
                text = extra + text;
            }
        }
        if (max != -1) {
            if (max > text.length) {
                text = text.substring(0, max - 1);
            }
        }
        return text;
    }

    var formatMap = {
        "object": function (item, format) {
            if (item === null) return "";
            if (item instanceof Date) {
                return dateToString(item, format);
            } else if (item instanceof Array) {
                return item.join(format);
            }
            return JSON.stringify(item);
        },
        "string": function (item) {
            return item;
        },
        "number": function (item, format) {
            return numberToString(item, format);
        },
        "boolean": function (item) {
            return item ? "true" : "false";
        },
        "undefined": function () {
            return "";
        },
        "symbol": function (item) {
            return item.toString();
        },
        "function": function (item) {
            return item.toString();
        },
        "bigint": function (item, format) {
            return numberToString(item, format);
        }
    };

    exports.setThousandSeparator = setThousandSeparator;
    exports.setPercentageSign = setPercentageSign;
    exports.setCurrencySign = setCurrencySign;
    exports.setDecimalPoint = setDecimalPoint;
    exports.numberToString = numberToString;
    exports.dateToString = dateToString;
    exports.format = format;
    return exports;

    function format(item, format) {
        if (format === "json") return JSON.stringify(item);
        return formatMap[typeof item](item, format);
    }
});