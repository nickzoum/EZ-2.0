if (undefined) var { View } = require("../src/ez");


View.registerView("test", "<span ez-loop=\"key in list\">${list[key].foo, \"json\"}</span><span ez-if=\"list.a.foo.0\">123</span><other ez-pass=\"x\"/>", {
    list: {
        "a": {
            foo: []
        },
        b: {
            foo: []
        }
    },
    x: "FOOO",
    onLoad: function () {
        var self = this;

        setTimeout(function () {
            self.list.a.foo.push({ h: 3 });
            self.x = "OI";
        }, 2000);
    }
});

View.registerView("other", "<span>${text}</span>", {
    text: "",
    construct: function (text) {
        this.text = text;
    }
});