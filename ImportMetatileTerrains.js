/* 	Import Metatile Terrains by eishiya, last updated 3 Mar 2023

	Adds an action to the Tileset menu that imports and expands terrains from
	a source tileset into the active metatileset. This allows you to label only
	the source tileset and get the corresponding terrains for the metatileset.
	
	If the source map of the metatileset has multiple layers, the bottom-most
	Tile Layer will be used.
	
	The script will only work correctly if the metatileset's source map is
	orthographic, and may raise errors otherwise.
	
	This script has not been tested with non-orthographic tilesets/source maps.
	It will not work correctly on hexagonal tiles, and may not work correctly
	on isometric tiles.
*/

var importMetatileTerrains = tiled.registerAction("ImportMetatileTerrains", function(action) {
	if(tiled.versionLessThan? tiled.versionLessThan("1.8.0") : tiled.version < "1.8.0") {
		tiled.alert("Import Metatile Terrains requires Tiled 1.8 or later.");
		return;
	}
	
	//Check that the active asset is a tileset based on an image:
	let tileset = tiled.activeAsset;
	if(!tileset || !tileset.isTileset || tileset.isCollection) {
		tiled.alert("The active asset must be an image-based Tileset with its Image property set to a TileMap.");
		return;
	}
	
	//Check that the tileset's source is a map that Tiled can open:
	let map = null;
	for(let fi = 0; fi < tiled.mapFormats.length; ++fi) {
		let format = tiled.mapFormat(tiled.mapFormats[fi]);
		if(format && format.canRead && format.supportsFile(tileset.image)) {
			map = format.read(tileset.image);
			break;
		}
	}
	if(!map || !map.isTileMap) {
		tiled.alert("Could not open the tileset source image as a TileMap, so the original terrain data could not be read. Perhaps this tileset is not a metatileset?");
		return;
	}
	
	//Make sure the map's and metatileset's tile sizes are positive:
	if(map.tileWidth == 0 || map.tileHeight == 0 || tileset.tileWidth == 0 || tileset.tileHeight == 0) {
		tiled.alert("Tile width and height must be above 0.");
		return;
	}
	
	//Calculate some values that we'll use to figure out the corner and edge subtiles of each metatile:
	let widthRatio = tileset.tileWidth / map.tileWidth;
	let heightRatio = tileset.tileHeight / map.tileHeight;
	let bottomEdgeOffset = Math.floor(heightRatio); //add to srcY to get the y of the bottom tile edge
	if(bottomEdgeOffset == heightRatio) bottomEdgeOffset--;
	let rightEdgeOffset = Math.floor(widthRatio); //add to srcX to get the x of the right tile edge
	if(rightEdgeOffset == widthRatio) rightEdgeOffset--;
	
	let middleOffsetX = Math.floor(widthRatio / 2);
	let middleOffsetY = Math.floor(heightRatio / 2);
	
	let margin = tileset.margin;
	let spacing = tileset.tileSpacing;
	
	let tilesetWidth = Math.floor((tileset.imageWidth - margin + spacing) / (tileset.tileWidth + spacing));
	
	//Helper function to find the bottom-most Tile Layer in a map:
	function findTileLayer(curLayer) {
		if(curLayer.isGroupLayer || curLayer.isTileMap) {
			let numLayers = curLayer.layerCount;
			for(let layerID = 0; layerID < numLayers; layerID++) {
				let found = findTileLayer(curLayer.layerAt(layerID));
				if(found)
					return found;
			}
		} else if(curLayer.isTileLayer)
			return curLayer;
		
		return null;
	}
	
	//Make sure the map even has a tile layer and tiles we can look at:
	let srcLayer = findTileLayer(map);
	if(!srcLayer) {
		tiled.alert("The source map for this metatileset does not contain any tiles, so there are no terrains to copy.");
		return;
	}
	let mapTilesets = map.usedTilesets(); //map.tilesets; //map.usedTilesets would be better, but may not be initialized for maps not open in the GUI
	let tilesetCount = mapTilesets.length;
	if(tilesetCount == 0) {
		tiled.alert("The source map for this metatileset does not use any tilesets, so there are no terrains to copy.");
		return;
	}
	
	//faux enum to identify wangID components
	let WangID = {
		Top: 0,
		TopRight: 1,
		Right: 2,
		BottomRight: 3,
		Bottom: 4,
		BottomLeft: 5,
		Left: 6,
		TopLeft: 7
	};
	
	//And finally, do the work of building the new terrain sets:
	tileset.macro("Import Metatile Terrains", function() {
		let dstTileCount = tileset.tileCount;
		let dstTiles = tileset.tiles;
		//tiled.log("tilesetCount of map "+map.fileName+": "+tilesetCount);
		for(let si = 0; si < tilesetCount; ++si) {
			let srcTileset = mapTilesets[si];
			let wangSetCount = srcTileset.wangSets.length;
			for(let wi = 0; wi < wangSetCount; ++wi) {
				let newWangSetContents = []; //contains {tile, wangID} pairs for the new terrain set
				let curWangSet = srcTileset.wangSets[wi];
				//Iterate each tile in the metatileset
				for(let ti = 0; ti < dstTileCount; ++ti) {
					let dstX = ti % tilesetWidth;
					let dstY = Math.floor(ti / tilesetWidth);
					let srcX = Math.floor(dstX * widthRatio);
					let srcY = Math.floor(dstY * heightRatio);
					
					let subtiles = [];
					subtiles[WangID.TopLeft] = srcLayer.tileAt(srcX, srcY);
					subtiles[WangID.Top] = srcLayer.tileAt(srcX + middleOffsetX, srcY);
					subtiles[WangID.TopRight] = srcLayer.tileAt(srcX + rightEdgeOffset, srcY);
					
					subtiles[WangID.Left] = srcLayer.tileAt(srcX, srcY + middleOffsetY);
					subtiles[WangID.Right] = srcLayer.tileAt(srcX + rightEdgeOffset, srcY + middleOffsetY);
					
					subtiles[WangID.BottomLeft] = srcLayer.tileAt(srcX, srcY + bottomEdgeOffset);
					subtiles[WangID.Bottom] = srcLayer.tileAt(srcX + middleOffsetX, srcY + bottomEdgeOffset);
					subtiles[WangID.BottomRight] = srcLayer.tileAt(srcX + rightEdgeOffset, srcY + bottomEdgeOffset);
					
					//Check that every subtile is part of the current tileset we're dealing with:
					let subtilesShareTileset = true;
					for(let sti = 0; sti < 8; ++sti) {
						if(!subtiles[sti]) continue;
						if(subtiles[sti].tileset != srcTileset) {
							subtilesShareTileset = false;
							break;
						}
					}
					
					//Build the new wangId based on the subtiles:
					if(subtilesShareTileset) {
						let newWangID = [0,0,0,0,0,0,0,0];
						if(subtiles[WangID.TopLeft])
							newWangID[WangID.TopLeft] = curWangSet.wangId(subtiles[WangID.TopLeft])[WangID.TopLeft];
						if(subtiles[WangID.Top])
							newWangID[WangID.Top] = curWangSet.wangId(subtiles[WangID.Top])[WangID.TopLeft];
						if(subtiles[WangID.TopRight])
							newWangID[WangID.TopRight] = curWangSet.wangId(subtiles[WangID.TopRight])[WangID.TopRight];
						
						if(subtiles[WangID.Left])
							newWangID[WangID.Left] = curWangSet.wangId(subtiles[WangID.Left])[WangID.TopLeft];
						if(subtiles[WangID.Right])
							newWangID[WangID.Right] = curWangSet.wangId(subtiles[WangID.Right])[WangID.TopRight];
						
						if(subtiles[WangID.BottomLeft])
							newWangID[WangID.BottomLeft] = curWangSet.wangId(subtiles[WangID.BottomLeft])[WangID.BottomLeft];
						if(subtiles[WangID.BottomLeft])
							newWangID[WangID.Bottom] = curWangSet.wangId(subtiles[WangID.Bottom])[WangID.BottomLeft];
						if(subtiles[WangID.BottomRight])
							newWangID[WangID.BottomRight] = curWangSet.wangId(subtiles[WangID.BottomRight])[WangID.BottomRight];

						if(0 < newWangID[0] + newWangID[1] + newWangID[2] + newWangID[3] + newWangID[4] + newWangID[5] + newWangID[6] + newWangID[7])
							newWangSetContents.push({tile: dstTiles[ti], wangId: newWangID});
					}
				}
				//If this terrain set has valid wangIds, add it to the metatileset:
				if(newWangSetContents.length > 0) {
					let newWangSet = tileset.addWangSet(curWangSet.name, WangSet.Mixed);
					newWangSet.colorCount = curWangSet.colorCount;
					//Copy terrain names:
					for(let ti = 0; ti < newWangSet.colorCount; ++ti) {
						newWangSet.setColorName(1+ti, curWangSet.colorName(1+ti));
					}
					//Populate terrain:
					for(let ti = 0; ti < newWangSetContents.length; ++ti) {
						newWangSet.setWangId(newWangSetContents[ti].tile, newWangSetContents[ti].wangId);
					}
				}
			}
		}
	});
});
importMetatileTerrains.text = "Import Metatile Terrains";

tiled.extendMenu("Tileset", [
    { action: "ImportMetatileTerrains", before: "TilesetProperties" },
	{separator: true}
]);
