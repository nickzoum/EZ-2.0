if (undefined) var { View } = require("../src/ez");


View.registerView("test", `<span class="a" ez-class="b" />`, {
    b: "c",
    onLoad: function () {
        var self = this;

        setTimeout(function () {
            self.b = "asd";
        }, 5000);
    }
});