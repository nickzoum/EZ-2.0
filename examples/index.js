if (undefined) var View = require("../src/ez").View;

View.registerView("test",
    "<div ez-class='a'>${a + (1+2)} Hello</div><div>${b?.test }</div>${list.0}",
    {
        construct: function () {
        },
        onLoad: function () {
            var self = this;
            setTimeout(function () {
                self.b = { test: 2 };
                self.list.push("hello there");
            }, 2E3);
        },
        a: 5,
        b: undefined,
        list: []
    });