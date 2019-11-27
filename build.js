const minify = require("./node/minify");

minify.minifyScripts([
    "src/util/polyfills.js",
    "src/util/enumerables.js",
    "src/util/functions.js",
    "src/util/html.js",
    "src/util/expressions.js",
    "src/mutation/object-mutation.js",
    "src/mutation/dom-mutation.js",
    "src/view/expr-parser.js",
    "src/view/html-parser.js",
    "src/view/html-view.js"
]);

//require("child_process").exec("explorer build");