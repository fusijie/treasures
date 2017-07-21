let config = require("config");
let pomeloBuild = require("pomeloBuild");

const reg = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
const LOGIN_ERROR = "There is no server to log in, please wait.";
const LENGTH_ERROR = "Name is too long or too short.\n 20 character max.";
const NAME_ERROR = "Bad character in Name.\n Can only have letters,\n numbers, Chinese characters, and '_'";
const DUPLICATE_ERROR = "Please change your name to login.";
const SEVER_ERROR = "Server error.";
const LOGIN_SUCCESS = "Login success.";

cc.Class({
	extends: cc.Component,

	properties: {
		eb_name: cc.EditBox,
	},

	// use this for initialization
	onLoad: function () {
		pomeloBuild.create();
		pomelo.on("io-error", (event) => {
			this.show_tip(SEVER_ERROR);
		});
	},

	on_click_login: function () {
		let username = this.eb_name.string;
		if (username.length > 20 || username.length == 0) {
			this.show_tip(LENGTH_ERROR);
			return;
		}
		if (!reg.test(username)) {
			this.show_tip(NAME_ERROR);
			return;
		}
		this.entry(username, function () {
			pomelo.request('connector.entryHandler.entry', { name: username }, (data) => {
				pomelo.request("area.playerHandler.enterScene", { name: username, playerId: data.body.playerId }, (data) => {
					window.game_data = data.body.data;
					cc.director.loadScene("game_scene");
					cc.log(data);
				});
			});
		});
	},

	entry: function (name, callback) {
		pomelo.init({ host: config.GATE_HOST, port: config.GATE_PORT, log: true }, () => {
			pomelo.request('gate.gateHandler.queryEntry', { uid: name }, (data) => {
				pomelo.disconnect();

				if (data.body.code === 2001) {
					alert('server error!');
					return;
				}
				if (data.body.host === '127.0.0.1') {
					data.body.host = location.hostname;
				}
				// console.log(data);
				pomelo.init({ host: data.body.host, port: data.body.port, log: true }, () => {
					if (callback) {
						callback();
					}
				});
			});
		});
	},

	show_tip: function (msg) {
		let node = new cc.Node();
		node.x = cc.winSize.width / 2;
		node.y = cc.winSize.height / 2;
		let label_component = node.addComponent(cc.Label);
		label_component.string = msg;
		label_component.fontSize = 30;
		label_component.lineHeight = 40;
		node.runAction(cc.sequence(cc.moveBy(1, 0, 100), cc.removeSelf()));
		cc.game.addPersistRootNode(node);
	}
});
