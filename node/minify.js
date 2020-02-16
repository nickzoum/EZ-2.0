/* eslint-disable no-console */
var babelMinify = require("babel-minify");
var fs = require("fs");
var colors = require("./colors");
var packageConfig = require("../package.json");
var linter = require("./linter");

(function (global, factory) {
    "use strict";
    factory(exports);
})(this, function (exports) {
    var readWriteOptions = { encoding: "utf8" };
    var debugMode = ["1", "debug", "true", "on"].includes((packageConfig.debugMode || "").toLowerCase());
    console.log("Debug Mode: " + (debugMode ? colors.green + "On" : colors.magenta + "Off") + colors.reset);
    var exportMode = ["1", "global", "true", "on", "this"].includes((packageConfig.exportMode || "").toLowerCase());
    console.log("Export Mode: " + (exportMode ? colors.green + "Global" : colors.magenta + "Package") + colors.reset);

    exports.minifyScripts = minifyScripts;
    return exports;

    function minifyScripts() {
        setUpDirectory("./build");
        console.log("Handling JS Files: ");
        /** @type {Array<string>} */
        var files = [].concat.apply([], arguments);
        var newFiles = files.map(minifyScript);
        combineFiles(newFiles.map(function (item) { return item[0]; }), packageConfig.name + ".js");
        combineFiles(newFiles.map(function (item) { return item[1]; }), packageConfig.name + ".min.js");
    }

    /**
     * 
     * @param {string} path 
     */
    function setUpDirectory(path) {
        path.split("/").reduce(function (result, directory) {
            result += "/" + directory;
            if (!fs.existsSync(result)) fs.mkdirSync(result);
            return result;
        });
    }

    /**
     * 
     * @param {Array<string>} fileList 
     * @param {string} fileName 
     * @returns {void}
     */
    function combineFiles(fileList, fileName) {
        var newName = "./build/" + fileName;
        var text = fileList.map(function (file) {
            return fs.readFileSync(file, readWriteOptions);
        }).join("\r\n");
        fs.writeFileSync(newName, text, readWriteOptions);
        console.log("Files merged and saved at " + toLink(newName));
    }

    /**
     * 
     * @param {string} input 
     * @returns {Array<string>} 
     */
    function minifyScript(input) {
        var text = fs.readFileSync(input, readWriteOptions);
        var newName = "./build/" + input, newNameMin = newName.replace(/\.js$/, ".min.js");
        setUpDirectory("./build/" + input.split("/").slice(0, -1).join("/"));
        text = linter.getLinter(text, exportMode, packageConfig.name)
            .fixRequire()
            .fixDefinition().text.replace(/(\n|\r)+/g, "\r\n");
        fs.writeFileSync(newName, text, readWriteOptions);
        console.log("File " + toLink("./" + input) + " was copied to " + toLink(newName));
        text = babelMinify(text).code;
        fs.writeFileSync(newName, text, readWriteOptions);
        console.log("File " + toLink("./" + input) + " was minified and copied to " + toLink(newNameMin));
        return [newName, newNameMin];
    }

    /**
     * 
     * @param {string} fileName 
     * @returns {string}
     */
    function toLink(fileName) {
        return (/\.min\.js/.test(fileName) ? colors.magenta : colors.green) + colors.underscore + fileName + colors.reset;
    }
});