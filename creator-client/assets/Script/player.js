cc.Class({
    extends: cc.Component,

    properties: {
        player_name: cc.Label,
    },

    // use this for initialization
    onLoad: function () {

    },

    init: function (name) {
        this.player_name.string = name;
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
