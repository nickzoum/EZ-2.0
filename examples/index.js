if (undefined) var { View, Parser, Expressions } = require("../src/ez");


View.registerView("test", `<input type="text" ez-value="text"/><foo ez-pass="text"/>`, {
    text: ""
});

View.registerView("foo", `<span>'\${text}'</span>`, {
    construct: function (text) {
        this.text = text;
    },
    text: ""
});