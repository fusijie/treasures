let config = require("config");

cc.Class({
    extends: cc.Component,

    properties: {
        bg: cc.Node,
        player_prefab: cc.Prefab,
    },

    // use this for initialization
    onLoad: function () {
        if (typeof pomelo === "undefined") {
            cc.director.loadScene("login_scene");
        }
        this.register_handler();
        this.init_scene();
        this.bind_touch_events();
    },

    register_handler: function () {
        // add entities
        pomelo.on('addEntities', (data) => {
            this.add_players(data.body.entities);
        });

        //Handle remove entities message
        pomelo.on('removeEntities', (data) => {
            this.remove_players(data.body.entities);
        });

        // Handle move  message
        pomelo.on('onMove', (data) => {
            if (data.body.entityId === this.player.entity_id) {
                return;
            }
            this.move_to(this.players[data.body.entityId], cc.p(data.body.endPos.x, data.body.endPos.y));
        });

        // Handle remove item message
        pomelo.on('onRemoveItem', function (data) {
            // app.getCurArea().removeEntity(data.entityId);
        });

        // Handle pick item message
        pomelo.on('onPickItem', function (data) {
            // var area = app.getCurArea();
            // var player = area.getEntity(data.entityId);
            // var item = area.getEntity(data.target);
            // player.set('score', player.score + data.score);
            // player.getSprite().scoreFly(data.score);
            // player.getSprite().updateName(player.name + ' - ' + player.score);
            // area.removeEntity(item.entityId);
        });

        pomelo.on('rankUpdate', function (data) {
            // var ul = document.querySelector('#rank ul');
            // var area = app.getCurArea();
            // var li = "";
            // data.entities.forEach(function (id) {
            //     var e = area.getEntity(id);
            //     if (e) {
            //         li += '<li><span>' + e.name + '</span><span>' + e.score + '</span></li>';
            //     }
            // });
            // ul.innerHTML = li;
        });

        // Handle kick out messge, occours when the current player is kicked out
        pomelo.on('onKick', function () {
            // console.log('You have been kicked offline for the same account logined in other place.');
            // app.changeView("login");
        });

        // Handle disconect message, occours when the client is disconnect with servers
        pomelo.on('disconnect', (reason) => {
            cc.director.loadScene("login_scene");
        });

        // Handle user leave message, occours when players leave the area
        pomelo.on('onUserLeave', function (data) {
            // var area = app.getCurArea();
            // var playerId = data.playerId;
            // console.log('onUserLeave invoke!');
            // area.removePlayer(playerId);
        });
    },

    bind_touch_events: function () {
        if (!this.player) {
            return;
        }
        this.bg.on(cc.Node.EventType.TOUCH_START, (event) => {
            let target_pos = this.node.convertToNodeSpaceAR(event.touch.getLocation());
            this.move_to(this.player, cc.p(parseInt(target_pos.x), parseInt(target_pos.y)));
        });
    },

    init_scene: function () {
        let players_info = [];
        for (let key in window.game_data.area.entities) {
            players_info[key] = window.game_data.area.entities[key];
        }
        this.add_players(players_info, true);
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
    },

    add_players: function (players_info, is_init) {
        this.players_info = this.players_info || [];
        this.players = this.players || [];
        if (players_info && Array.isArray(players_info)) {
            players_info.forEach((player_info) => {
                if (!this.players_info[player_info.entityId] && player_info.type === "player") {
                    let player_node = cc.instantiate(this.player_prefab);
                    player_node.parent = this.bg;

                    player_node.getComponent("player").init(player_info.name);
                    player_node.x = player_info.x;
                    player_node.y = player_info.y;
                    player_node.entity_id = player_info.entityId;
                    if (player_info.id === window.game_data.playerId) {
                        this.player = player_node;
                    }else {
                        if (!is_init) {
                            this.show_tip(`${player_info.name} on line!`);
                        }
                    }
                    this.players[player_node.entity_id] = player_node;
                    this.players_info[player_info.entityId] = player_info;
                }
            });
        }
    },

    remove_players: function (players_entity_ids) {
        this.players_info = this.players_info || [];
        this.players = this.players || [];
        if (players_entity_ids && Array.isArray(players_entity_ids)) {
            players_entity_ids.forEach((players_entity_id) => {
                if (this.players_info[players_entity_id]) {
                    this.show_tip(`${this.players_info[players_entity_id].name} off line!`);
                    this.players_info[players_entity_id] = undefined;
                }
                if (this.players[players_entity_id]) {
                    this.players[players_entity_id].parent = null;
                    this.players[players_entity_id] = undefined;
                }
            });
        }
    },

    move_to: function (player, target_pos) {
        if (!player) {
            return;
        }
        player.is_player_moving = true;
        player.target_pos = target_pos;

        if (player !== this.player) {
            return;
        }

        pomelo.request('area.playerHandler.move', { targetPos: target_pos }, (result) => {
            if (result.body.code === 200) {
            } else {
                console.warn('curPlayer move error!');
            }
        });
    },

    update: function (dt) {
        this.players.forEach((player) => {
            this.update_moving(player, dt);
        });
    },

    update_moving: function (player, dt) {
        if (!player) {
            return;
        }
        if (!player.is_player_moving) {
            return;
        }
        let player_info = this.players_info[player.entity_id];
        let target_pos = player.target_pos;

        let cur_pos = player.getPosition();
        let distance = cc.pDistance(cur_pos, target_pos);
        if (distance < 10) {
            player.is_player_moving = false;
            return;
        }

        let x_speed = player_info.walkSpeed * (target_pos.x - cur_pos.x) / distance;
        let y_speed = player_info.walkSpeed * (target_pos.y - cur_pos.y) / distance;

        player.x += x_speed * dt;
        player.y += y_speed * dt;
    },
});
