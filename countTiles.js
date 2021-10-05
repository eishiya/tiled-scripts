var action = tiled.registerAction("CountUsedTiles", function(action) {
	var map = tiled.activeAsset;
	if(!map || !map.isTileMap) {
		tiled.alert("To count tiles, make sure a Map document is active.")
		return;
	}
	
	//Assign firstgids to each tileset, so we can easily tell apart tiles from each tileset:
	var firstgids = [];
	var tilesets = map.tilesets;
	firstgids[0] = 1;
	for(var i = 1; i < tilesets.length; i++) {
		firstgids[i] = firstgids[i-1] + tilesets[i-1].tileCount;
	}
	
	//Hold the running tallies of tiles:
	var uniqueTiles = {}, uniqueRotations = {};
	
	var numLayers = map.layerCount;
	for(var layerID = 0; layerID < numLayers; layerID++) {
		var curLayer = map.layerAt(layerID);
		if(curLayer.isTileLayer && curLayer.visible) {
			for(var x = 0; x < curLayer.width; x++) {
				for(var y = 0; y < curLayer.height; y++) {
					var cell = curLayer.cellAt(x, y);
					if(cell.tileId > -1) {
						var gid = cell.tileId; //no flips
						var tileset = curLayer.tileAt(x, y).tileset;
						//add the firstgid for this tile's tileset:
						tileset = tilesets.indexOf(tileset);
						if(tileset >= 0)
							gid += firstgids[tileset];
						uniqueTiles[gid] = true;
						//Add in the flips:
						if(cell.flippedHorizontally)
							gid |= 0x80000000;
						if(cell.flippedVertically)
							gid |= 0x40000000;
						if(cell.flippedAntiDiagonally)
							gid |= 0x20000000;
						if(cell.rotatedHexagonal120)
							gid |= 0x10000000;
						uniqueRotations[gid] = true;
					}
				}
			}
		}
	}
	
	tiled.alert("Unique tiles by ID: " + Object.keys(uniqueTiles).length + "\n"
		+ "Unique tiles (counting rotations separately): " + Object.keys(uniqueRotations).length
	);
	
});

action.text = "Count Used Tiles";
//action.shortcut = "Home";
tiled.extendMenu("Map", [
    { action: "CountUsedTiles", before: "MapProperties" }
]);