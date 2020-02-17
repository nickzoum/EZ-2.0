if (undefined) var { View } = require("../src/ez");


View.registerView("test", `<span ez-loop="key in list">\${!list[key].foo}</span>`, {
    list: [{ foo: false }, { foo: true }],
    onLoad: function () {
        var self = this;

        setTimeout(function () {
            self.b = "asd";
        }, 5000);
    }
});