if (undefined) var { View } = require("../src/ez");


View.registerView("test", `
<div ez-loop="key in list">
  <div ez-loop="index in list[key]">
  <button ez-on-click="inc(key, index)">\${list[key][index]}</button>    
  </div>
</div>
<div ez-loop="key in list">
  <div ez-loop="index in list[key]">
\${list[key][index]}   
  </div>
</div>
\${list, "json"}
\${list.a, "json"}
`, {
    list: {
        a: [1, 2, 3],
        b: [4, 5, 6]
    },
    inc: function (key, index) {
        this.list[key][index] += 1;
        this.list[key].splice();
    }
});