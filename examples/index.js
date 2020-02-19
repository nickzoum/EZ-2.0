if (undefined) var { View } = require("../src/ez");


View.registerView("test", "<other ez-loop=\"key in list\" ez-pass=\"list[key].data\" />", {
    list: {
        a: {
            data: [1, 2, 3]
        },
        b: {
            data: [4, 5, 6]
        }
    },
    onLoad: function () {
        var self = this;

        setTimeout(function () {
        }, 2000);
    }
});

View.registerView("other", "", {
    construct: function (text) {
        console.log(text);
    }
});