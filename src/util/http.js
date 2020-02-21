if (undefined) var { Mutation } = require("../ez");

/** @typedef {require("../ez")} JSDoc */

ezDefine("Http", function (exports) {
    "use strict";

    var defaults = {
        "withCredentials": false,
        headers: {
            "Accept": ["application/json", "text/html"],
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    };

    exports.deleteCookieByName = deleteCookieByName;
    exports.deleteAllCookies = deleteAllCookies;
    exports.getCookieByName = getCookieByName;
    exports.setCookie = setCookie;
    exports.delete = _delete;
    exports.socket = socket;
    exports.post = post;
    exports.put = put;
    exports.get = get;
    return exports;

    /**
     * Sends a get request
     * @param {string} url Where the request is going to be sent
     * @param {HttpOptions} options optional options for the request / headers
     * @returns {JSDoc.Http.RequestPromise} Promise that is activated when the request is loaded
     */
    function get(url, options) {
        return abstractRequest("get", url, null, options);
    }

    /**
     * Sends a post request
     * @param {string} url Where the request is going to be sent
     * @param {Object} [data] The data that are going to be sent
     * @param {HttpOptions} options optional options for the request / headers
     * @returns {JSDoc.Http.RequestPromise} Promise that is activated when the request is loaded
     */
    function post(url, data, options) {
        return abstractRequest("post", url, data, options);
    }

    /**
     * Sends a put request
     * @param {string} url Where the request is going to be sent
     * @param {Object} [data] The data that are going to be sent
     * @param {HttpOptions} options optional options for the request / headers
     * @returns {JSDoc.Http.RequestPromise} Promise that is activated when the request is loaded
     */
    function put(url, data, options) {
        return abstractRequest("put", url, data, options);
    }

    /**
     * Sends a delete request
     * @param {string} url Where the request is going to be sent
     * @param {HttpOptions} options optional options for the request / headers
     * @returns {JSDoc.Http.RequestPromise} Promise that is activated when the request is loaded
     */
    function _delete(url, options) {
        return abstractRequest("delete", url, null, options);
    }

    /**
     * Sends a request (GET|POST)
     * @param {string} method method of request (GET|POST)
     * @param {string} url where the request is going to be sent
     * @param {Object} [data] data to be sent
     * @param {HttpOptions} options optional options for the request / headers
     * @returns {JSDoc.Http.RequestPromise} Promise that is activated when the request is loaded
     */
    function abstractRequest(method, url, data, options) {
        if (typeof options !== "object" || options === null) options = {};
        if (typeof options.headers !== "object" || options.headers === null) options.headers = {};
        /** @type {XMLHttpRequest} */
        var request;
        var progressList = [];
        var promise = new Promise(function HttpPromise(resolve, reject) {
            request = createCORSRequest(method, url);
            if (request) {
                request.withCredentials = "withCredentials" in options ? options.withCredentials : defaults.withCredentials;
                for (var key in defaults.headers) {
                    var list = key in options.headers ? options.headers[key] : defaults.headers[key];
                    (list instanceof Array ? list : [list]).forEach(function (item) {
                        if (item !== undefined) request.setRequestHeader(key, item);
                    });
                }
                request.upload.addEventListener("progress", function (event) {
                    progressList.forEach(function (callBack) {
                        try { callBack(event); }
                        catch (err) { console.error(err); }
                    });
                });
                request.onloadend = function () { onLoadEnd(request).then(resolve).catch(reject); };
                request.send(data);
            } else {
                reject("CORS not supported");
            }
        });
        Mutation.setValue(promise, "abort", function () {
            if (request) {
                request.cancelled = true;
                request.abort();
            } return promise;
        });
        Mutation.setValue(promise, "addProgressListener", function (callBack) {
            if (typeof callBack === "function") progressList.push(callBack);
            else throw Error("A progress listener can only be a function");
            return promise;
        });
        return promise;
    }

    /**
     * Function called when a request ends
     * @param {XMLHttpRequest} request the request that was sent
     * @returns {Promise<string>} Promise that sends data or error
     */
    function onLoadEnd(request) {
        return new Promise(function (resolve, reject) {
            var status = request.status;
            var result = String(request.response);
            if (status >= 200 && status < 300) resolve(result);
            else reject(request.cancelled ? "Request was cancelled" : result);
        });
    }

    /**
     * Create an HTTP Request with Cors
     * @param {string} method method of request (GET|POST)
     * @param {string} url where the request is going to be sent
     * @returns {XMLHttpRequest} the request created
     */
    function createCORSRequest(method, url) {
        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
            xhr.open(method, url, true);
        } else if (typeof XDomainRequest !== "undefined") {
            xhr = new this.XDomainRequest();
            xhr.open(method, url);
        } else {
            throw Error("The browser does not support CORS requests");
        }
        return xhr;
    }

    /**
     * Gets the value of a cookie
     * @param {string} name name of cookie
     * @returns {string} value of cookie
     */
    function getCookieByName(name) {
        var list = document.cookie.split("; ");
        for (var index = 0; index < list.length; index++) {
            var cookieList = list[index].split("=");
            if (cookieList[0] === name) return cookieList[1];
        }
        return null;
    }

    /**
     * Creates/Updates a cookie
     * @param {string} name name of cookie
     * @param {string} value value of cookie
     * @returns {void}
     */
    function setCookie(name, value) {
        document.cookie = [name, value].join("=") + ";";
    }

    /**
     * Deletes a cookie
     * @param {string} name name of cookie
     * @returns {void}
     */
    function deleteCookieByName(name) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    }

    /**
     * Deletes all of the cookies
     * @returns {void}
     */
    function deleteAllCookies() {
        document.cookie.split(";").forEach(function (cookie) {
            deleteCookieByName(cookie.split("=")[0].replace(/^\s+/g, "").replace(/\s+$/g, ""));
        });
    }

    /**
     * Creates a new socket
     * @param {string} url socket endpoint
     * @returns {JSDoc.Http.SocketPromise} The created socket
     */
    function socket(url) {
        /** @type {WebSocket} */
        var socket;
        /** @type {Array<() => void>} */
        var messageCBList = [];
        /** @type {Array<() => void>} */
        var closeCBList = [], isClosed = false;
        var promise = new Promise(function (res, rej) {
            resolve = res; reject = rej;
            try { socket = new WebSocket(url); } catch (err) { reject(err); }
            socket.onopen = function () { resolve(); };
            socket.onerror = function () { reject(); };
            socket.onmessage = function (result) { callList(messageCBList, result.data); };
            socket.onclose = function () { isClosed = true; callList(closeCBList); };
        });
        Mutation.setValue(promise, "close", function () {
            try { if (socket) socket.close(); }
            catch (err) { reject(err); }
            return promise;
        });
        Mutation.setValue(promise, "addListener", function (callBack) {
            if (typeof callBack === "function") messageCBList.push(callBack);
            return promise;
        });
        Mutation.setValue(promise, "onClose", function (callBack) {
            if (typeof callBack === "function") {
                if (isClosed) callList([callBack]);
                closeCBList.push(callBack);
            }
            return promise;
        });

        return promise;

        function resolve() { }
        function reject() { }

        /**
         * @param {Array<() => void>} list 
         * @param {...Array<*>} arguments 
         * @returns {void} 
         */
        function callList(list) {
            var params = [].slice.call(arguments, 1);
            try {
                list.forEach(function (cb) {
                    cb.apply(null, params);
                });
            } catch (err) { reject(err); }
        }
    }



});