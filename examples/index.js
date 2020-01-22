if (undefined) var View = require("../src/ez").View;

View.registerView("test", "<foo ez-on-change='onBar($)'></foo>", {
    construct: function () {

    },
    onBar: function (event) {
        console.log(event);
    }
});


View.registerView("foo", "<div></div>", {
    construct: function () {

    },
    onLoad: function () {
        var self = this;
        setTimeout(function () {
            self.emit("change", { test: 2, oi: 3 });
        }, 1500);
    }
});