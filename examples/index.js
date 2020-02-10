if (undefined) var { View } = require("../src/ez");


View.registerView("test", `<input type="text" ez-value="text"/><input type="text" ez-disabled="!text"/>`, {
    text: ""
});

View.registerView("foo", `<span>'\${text}'</span>`, {
    construct: function (text) {
        this.text = text;
    },
    text: ""
});