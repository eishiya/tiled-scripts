/*	Count Tiles by eishiya, last updated Dec 8 2021

	Adds an action to the Map menu that counts all the unique tiles in your map.
	It produces two numbers:
	- By ID, counting flipped variants as the same tile
	- Counting rotations separately, flipped versions are considered to be
		a different tile. This mode is useful for e.g. GB Studio, where
		flipped versions of tiles are treated as unique tiles.
	
	This script does not look at the *content* of the tiles, which means it will
	overcount tiles that look the same, and when counting rotations separately,
	it will overcount symmetrical tiles.

	If you're using this for GB Studio, keep in mind that transparent tiles
	overlapping over tiles will effectively create new "tiles", as will layers
	that are offset. This script may undercount if these situations occur
	in your map.
*/

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
	
	function countTiles(curLayer) {
		if(curLayer.isTileLayer && curLayer.visible) {
			//Get layer bounds:
			let region = curLayer.region();
			if(region) region = region.boundingRect;
			if(!region) return;
			
			for(let x = region.x; x < region.x + region.width; ++x) {
				for(let y = region.y; y < region.y + region.height; ++y) {
					let cell = curLayer.cellAt(x, y);
					if(cell.tileId > -1) {
						let gid = cell.tileId; //no flips
						let tileset = curLayer.tileAt(x, y).tileset;
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
		} else if(curLayer.isGroupLayer || curLayer.isTileMap) {
			var numLayers = curLayer.layerCount;
			for(var layerID = 0; layerID < numLayers; layerID++) {
				countTiles(curLayer.layerAt(layerID));
			}
		}
	}
	
	countTiles(map);
	
	tiled.alert("Unique tiles by ID: " + Object.keys(uniqueTiles).length + "\n"
		+ "Unique tiles (counting rotations separately): " + Object.keys(uniqueRotations).length
	);
	
});

action.text = "Count Used Tiles";
//action.shortcut = "Home";
tiled.extendMenu("Map", [
    { action: "CountUsedTiles", before: "MapProperties" }
]);
