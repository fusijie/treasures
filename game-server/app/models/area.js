var EventEmitter = require('events').EventEmitter;
var dataApi = require('../util/dataApi');
//var Map = require('./../map/map');
var pomelo = require('pomelo');
var channelService = pomelo.channelService;
var ActionManager = require('./action/actionManager');
//var Queue = require('pomelo-collection').queue;
//var eventManager = require('./../event/eventManager');
var timer = require('./timer');
var EntityType = require('../consts/consts').EntityType;
var logger = require('pomelo-logger').getLogger(__filename);
var Treasure = require('./treasure');

var exp = module.exports;

var id = 0;
var width = 0;
var height = 0;

var actionManager = null;
//The map from player to entity
var players = {};

var entities = {};

var channel = null;

var treasureCount = 0;

/**
 * Init areas
 * @param {Object} opts
 * @api public
 */
exp.init = function(opts){
	id = opts.id;
  width = opts.width;
  height = opts.height;

	channel = channelService.getChannel('area_' + id, true);

	actionManager = new ActionManager();
  exp.generateTreasures(40);

	run();
};

// area run
function run() {
  timer.run();
}

function addEvent(player) {
  player.on('pickItem', function(args) {
    var player = exp.getEntity(args.entityId);
    player.target = null;
    console.log(player);
    player.treasureCount++;
    exp.removeEntity(args.target);
    channel.pushMessage({route: 'onPickItem', entityId: args.entityId, target: args.target, treasureCount: player.treasureCount});
  });
}

// the added entities in one tick
var added = [];
// the reduced entities in one tick
var reduced = [];
exp.entityUpdate = function() {
  if (reduced.length > 0) {
    channel.pushMessage({route: 'removeEntities', entities: reduced});
    reduced = [];
  }
  if (added.length > 0) {
    channel.pushMessage({route: 'addEntities', entities: added});
    added = [];
  }
};
/**
 * Add entity to area
 * @param {Object} e Entity to add to the area.
 */
exp.addEntity = function(e) {
  if (!e || !e.entityId) {
    return false;
  }

  entities[e.entityId] = e;
  
  if (e.type === EntityType.PLAYER) {
		channel.add(e.id, e.serverId);
    addEvent(e);
		
		if (!!players[e.id]) {
			logger.error('add player twice! player : %j', e);
		}
		players[e.id] = e.entityId;
	} else if (e.type === EntityType.TREASURE) {
    treasureCount++;
	}

  added.push(e);
	return true;
};

/**
 * Remove Entity form area
 * @param {Number} entityId The entityId to remove
 * @return {boolean} remove result
 */
exp.removeEntity = function(entityId) {
	var e = entities[entityId];
	if (!e) {
		return true;
  }

	if (e.type === EntityType.PLAYER) {
		channel.leave(e.id, e.serverId);
		actionManager.abortAllAction(entityId);
			
    delete players[e.id];
  } else if (e.type === EntityType.TREASURE) {
    treasureCount--;
    if (treasureCount < 25) {
      exp.generateTreasures(15);
    }
	}

  delete entities[entityId];
  reduced.push(entityId);
  return true;
};

/**
 * Get entity from area
 * @param {Number} entityId.
 */
exp.getEntity = function(entityId) {
  return entities[entityId];
};

/**
 * Get entities by given id list
 * @param {Array} The given entities' list.
 */
exp.getEntities = function(ids) {
	var result = [];
	for (var i = 0; i < ids.length; i++) {
		var entity = entities[ids[i]];
		if (entity) {
			result.push(entity);
    }
	}
	
	return result;
};

exp.getAllPlayers = function() {
	var _players = [];
	for (var id in players) {
		_players.push(entities[players[id]]);
	}	
	
	return _players;
};

exp.generateTreasures = function (n) {
  if (!n) {
    return;
  }
  for (var i = 0; i < n; i++) {
    var d = dataApi.treasure.random();
    var t = new Treasure({kindId: d.id, kindName: d.name, imgId: d.imgId});
    exp.addEntity(t);
  }
};

exp.getAllEntities = function() {
	return entities;
};

exp.getPlayer = function(playerId) {
	var entityId = players[playerId];
  return entities[entityId];
};

exp.removePlayer = function(playerId) {
	var entityId = players[playerId];

	if (entityId) {
		delete players[playerId];
		this.removeEntity(entityId);
	}
};

/**
 * Get area entities for given postion and range.
 */
exp.getAreaInfo = function() {
	var entities = this.getAllEntities();
	return {
		id: id,
		entities : entities,
    width: width,
    height: height
	};
};

exp.width = function() {
	return width;
};

exp.height = function() {
	return height;
};
exp.channel = function () {
	return channel;
};

exp.entities = function () {
	return entities;
};

exp.actionManager = function() {
	return actionManager;
};

exp.timer = function() {
	return timer;
};

exp.getDistance = function(pos1, pos2) {
	return Math.sqrt(Math.pow((pos1.x - pos2.x), 2) + Math.pow((pos1.y - pos2.y), 2));
};

