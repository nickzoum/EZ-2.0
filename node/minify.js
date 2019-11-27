/* eslint-disable no-console */
const babelMinify = require("babel-minify");
const fs = require("fs");
const colors = require("./colors");
const packageConfig = require("../package.json");
const linter = require("./linter");

const readWriteOptions = {
    encoding: "utf8"
};

const debugMode = ["1", "debug", "true", "on"].includes((packageConfig.debugMode || "").toLowerCase());
console.log(`Debug Mode: ${debugMode ? `${colors.green}On` : `${colors.magenta}Off`}${colors.reset}`);

const exportMode = ["1", "global", "true", "on", "this"].includes((packageConfig.exportMode || "").toLowerCase());
console.log(`Export Mode: ${exportMode ? `${colors.green}Global` : `${colors.magenta}Package`}${colors.reset}`);

/**
 * @param {Array<string | Array<string>>} files
 * @returns {void}
 */
exports.minifyScripts = function minifyScripts(...files) {
    setUpBuild();
    console.log("Handling JS Files: ");
    var flatFiles = [].concat(...files.map(file => file instanceof Array ? file : [file]));
    flatFiles.forEach(minifyScript);
    combineFiles(flatFiles.map(file => `build/${getFileName(file)}.min.js`), `${packageConfig.name}.min.js`);
    console.log();
};

/**
 * @param {Array<string | Array<string>>} files
 * @returns {void}
 */
exports.minifyStyles = function minifyStyles(...files) {
    setUpBuild();
    console.log("Handling CSS Files: ");
    var flatFiles = [].concat(...files.map(file => file instanceof Array ? file : [file]));
    flatFiles.forEach(minifyStyle);
    combineFiles(flatFiles.map(file => `build/${getFileName(file)}.min.css`), `${packageConfig.name}.min.css`);
    console.log();
};

function setUpBuild() {
    if (!fs.existsSync("./build")) fs.mkdirSync("./build");
}

/**
 * 
 * @param {Array<string>} fileList 
 * @param {string} fileName 
 * @returns {void}
 */
function combineFiles(fileList, fileName) {
    fs.writeFileSync(`build/${fileName}`, fileList.map(file => fs.readFileSync(file, readWriteOptions)).join("\r\n"), readWriteOptions);
    console.log(`Files merged and saved at ${toLink(`./build/${fileName}`)}`);
}

/**
 * 
 * @param {string} input 
 * @returns {void} 
 */
function minifyScript(input) {
    var text = fs.readFileSync(input, readWriteOptions);
    text = linter.getLinter(text.replace(/((?<!\r)(\n\r?)+)/g, "\n"), exportMode, packageConfig.name)
        .fixRequire()
        .fixDefinition().text;
    /* text = linter.fixRequire(text);
     text = text.replace(/(if[\s]{0,1}\(undefined\).*;)/g, "");
     text = linter.fixDefinition(text);
     text = text.replace(/ezDefine\(("\w+"|'\w+'),/, function (fullMatch, moduleName) {
         moduleName = moduleName.substring(1, moduleName.length - 1);
         return template.replace(/\{module_name\}/g, moduleName)
             .replace(/\{browser_path\}/g, exportMode ? "" : `.${packageConfig.name}`)
             .replace(/\{node_path\}/g, exportMode ? "" : `.${moduleName}`);
     }).replace(/(const|var|let)?\s*(.*|\{.*\})\s*=\s*require\((".+"|'.+')\);/g, function (fullMatch, type, variable, path) {
         variable = variable.trim();
         path = path.trim();
         return (/\{.*\}/.test(variable) ? variable.substring(1, variable.length - 1).split(",") : [variable]).map(function (txt) {
             txt = txt.trim();
             return `${requireIf}var ${txt} = (this.${txt} || require(${path}))${txt === variable ? "" : `.${txt}`};`;
         }).join("\r\n");
     }).replace(/((?<!\r)\n\r?)+/g, "\r\n")
         .replace(/\r\n/g, "\r\n    ");*/
    if (!debugMode) text = babelMinify(text).code;
    //fs.writeFileSync(`build/${getFileName(input)}.min.js`, `(function(){\r\n    ${text}\r\n})();`, readWriteOptions);
    fs.writeFileSync(`build/${getFileName(input)}.min.js`, text, readWriteOptions);
    console.log(`File ${toLink(`./${input}`)}${debugMode ? "" : " was minified and"} copied to ${toLink(`./build/${getFileName(input)}.min.js`)}`);
}

/**
 * 
 * @param {string} input 
 * @returns {void} 
 */
function minifyStyle(input) {
    var text = fs.readFileSync(input, readWriteOptions);
    if (!debugMode) console.warn("Style minifier is not setup yet");
    fs.writeFileSync(`build/${getFileName(input)}.min.css`, text, readWriteOptions);
    console.log(`File ${toLink(`./${input}`)} was minified and copied to ${toLink(`./build/${getFileName(input)}.min.css`)}`);
}

/**
 * 
 * @param {string} path
 * @returns {string} 
 */
function getFileName(path) {
    return path.split("/").pop().split(".")[0];
}

/**
 * 
 * @param {string} fileName 
 * @returns {string}
 */
function toLink(fileName) {
    return `${/min\.(js|css)$|min$/.test(fileName) ? colors.magenta : colors.green}${colors.underscore}${fileName}${colors.reset}`;
}