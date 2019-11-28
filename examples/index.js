if (undefined) var View = require("../src/ez").View;

View.registerView("test",
    `<div ez-class='a'>\${a + (1+2)} Hello</div>
     <div>\${b?.test }</div>
     \${list.0}\${(1+1+'').length}
     <foobar ez-loop='item of list' ez-pass="item"></foobar>`,
    {
        construct: function () {
        },
        onLoad: function () {
            this.await(function () {
                this.b = { test: 2 };
                this.list.push("A", "B", "C");
            }, 2E3);
            this.await(function () {
                this.list.splice(0, 1, "Hello");
            }, 4E3);
            this.await(function () {
                this.list.splice(2, 1, "OI");
            }, 6E3);
        },
        await: function (cb, time) {
            var self = this;
            setTimeout(function () {
                cb.call(self);
            }, time);
        },
        a: 5,
        b: undefined,
        list: []
    });

View.registerView("foobar",
    "<div>${text}</div>",
    {
        construct: function (text) {
            this.text = text;
        },
        onLoad: function () {
        },
        text: undefined
    });