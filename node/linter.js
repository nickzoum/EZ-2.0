/** @typedef {import("./node")} NodeInfo */

const ezDefineTemplate = `(function (global, factory) {
    "use strict";
    if (typeof exports !== "undefined" && typeof module !== "undefined") module.exports{node_path} = factory(exports{node_path} || {});
    else {
        if (typeof global{browser_path} === "undefined") global{browser_path} = {};
        factory(global{browser_path}.{module_name} = global{browser_path}.{module_name} || {});
    }
})(this,`;

exports.getLinter = getLinter;

/**
 * 
 * @param {string} text 
 * @param {boolean} exportMode true 
 * @param {string} packageName 
 * @returns {NodeInfo.ILinter}
 */
function getLinter(text, exportMode, packageName) {
    /** @type {NodeInfo.ILinter} */
    var linter = {
        fixDefinition: fixDefinition,
        fixRequire: fixRequire,
        packageName: packageName,
        exportMode: exportMode,
        scope: null,
        text: text
    };
    return linter;
}

/**
 * @this {NodeInfo.ILinter}
 * @returns {NodeInfo.ILinter}
 */
function fixRequire() {
    var self = this;
    self.text = self.text.replace(/(if[\s]{0,1}\(undefined\).*;)/g, "");
    return self;
}

/**
 * @this {NodeInfo.ILinter}
 * @returns {NodeInfo.ILinter}
 */
function fixDefinition() {
    var self = this;
    self.text = self.text.replace(/ezDefine\((["']\w+["']),/, function (fullMatch, moduleName) {
        moduleName = moduleName.substring(1, moduleName.length - 1);
        return ezDefineTemplate.replace(/\{module_name\}/g, moduleName)
            .replace(/\{browser_path\}/g, self.exportMode ? "" : `.${self.packageName}`)
            .replace(/\{node_path\}/g, self.exportMode ? "" : `.${moduleName}`);
    });
    return self;
}