/* 	AutoMap Helper ver. 2021.03.22 by eishiya

	This script adds several Actions to aid in the creation and editing of AutoMap rules.
		In the Map menu:
		- Generate AutoMap Layers
			Generates multiple input/output layers at once, optionally filling them with tiles.
		In the Edit menu:
		- Add UIDs to Selected Layers / Remove UIDs from Selected Layers
			Makes it easier to work with many layers that share names by letting you temporarily
			and non-destructively give them unique names.
		- Convert Brush to Layers
			Prepares your current brush for pasting to the selected layers by renaming its layers
			or (for single-layer brushes) by moving each tile to its own layer.
	You can read more about each tool in the comment section above each one.
	
	If you do not want some of these tools to clutter up your menus, you can easily
	remove them by removing the * just below their description, which will turn
	the code into a multi-line comment that ends just after that action's code.
	Alternatively, you can comment out just the tiled.extendMenu lines, if you want the tools
	to remain accessible via the command line or from your own scripts.
*/

/*	Automates the creation of multiple input and output layers for AutoMapping.

	======= Instructions ========
	When running this Action, you will be prompted for a layer name template.
	This must follow the same rules as input/output layers for automapping, except for the index:
		- If the index is just a number, all the output layers will have that index.
		- If the index is followed by a "+", the layers will be numbered starting with that number and increasing.
		- If the index is just a "+", the layers will be numbered from 0 and increasing.

	If any tiles are currently in your active brush AND you have a valid regions layer for your chosen layer type
	(i.,e. regions_input, regions_output, or regions, as appropriate), you will be asked whether you want to
	automatically fill the new layers with those tiles.
		- If Yes, the script will fill all the region tiles on the new layers with the tiles.
			You will also be prompted for flips to generate. All combinations of your chosen flips will be generated.
		- If No, the script will prompt you for the number of layers to generate.
		
	By default, each new layer is added at the bottom of the layer stack. If you'd prefer them at the top,
	change the value of "insertAtBottom" below.
*/
var automapHelper = tiled.registerAction("CreateAutomapLayers", function(action) {
	if(!tiled.activeAsset || !tiled.activeAsset.isTileMap) {
		tiled.alert("Active asset must be a TileMap for layers to be created.");
		return;
	}
	
	var map = tiled.activeAsset;
	
	var layerNames = tiled.prompt("Enter a layer name template in the format [input|inputnot|output][<index>+?]?_<target>\nIf a specific index is provided, all layers will have that index.\nIf the index is \"+\", each layer will be given its own index, starting with 0.");
	
	if(!layerNames || layerNames.length < 1) return;
	
	var nameRE = /^(input|inputnot|output)([0-9]*\+?|\+?)(\_.+)/;
	layerNames = nameRE.exec(layerNames);
	if(!layerNames || layerNames.length < 4) {
		tiled.alert("Invalid layer name template.");
		return;
	}
	// layerNames now contains the layer name data:
	//	0: the full layer name template
	//	1: input | inputnot | output
	//	2: index (may be empty)
	//	3: _postfix (underscore and target layer name)

	var regionsLayer = null;
	var fillWithBrushTiles = false;
	var generateFlips = [0];
	var indexOffset = 0;
	var insertAtBottom = true; //If true, add every new layer at the bottom (insertLayerAt(0)). Otherwise, each layer is created at the top of the stack. TODO: UI for this. For now, this value must be edited here.
	
	//Parse the index offset, to start numbering layers at the given index:
	if(layerNames[2] != '+' && layerNames[2].indexOf('+') > 0) {
		indexOffset = parseInt(layerNames[2]); //strip the +
		layerNames[2] = "+";
	}

	var brush = tiled.mapEditor.currentBrush;
	if( brush && brush.size.width > 0 && brush.size.height > 0 && brush.layerCount == 1 && brush.layerAt(0).isTileLayer //the brush exists
	&& (brush.size.width > 1 || brush.size.height > 1 || brush.layerAt(0).tileAt(0,0)) ) { //the brush contains tiles
		//check if there's an appropriate regions layer:
		for(var i = 0; i < map.layerCount; i++) { //TODO: Deal with layer groups too, if they work for automapping
			if(map.layerAt(i).name == "regions"
			|| (map.layerAt(i).name == "regions_input" && (layerNames[1] == "input" || layerNames[1] == "inputnot"))
			|| (map.layerAt(i).name == "regions_output" && layerNames[1] == "output")
			) {
				regionsLayer = map.layerAt(i);
				break;
			}
		}
		if(regionsLayer && tiled.confirm("Populate layers with selected tiles?\n(This will automatically create as many layers as needed to include all the tiles.)")) {
			fillWithBrushTiles = true;
			indexMessage = tiled.prompt("Which flips should be generated (H, V, D, X)? All combinations of these flips will be generated. Leave blank to not generate extra flips.").toLowerCase();
			indexMessage = indexMessage.replace(/[^hvdx]/g, ""); //Hex rotations are allowed even on non-hex maps, because Tiled allows it and correctly keeps the flags.
			if(indexMessage.length > 0) {
				//generate all combinations of these flags, in order.
				indexMessage = [...new Set(indexMessage)].join(""); //remove any redundant flip requests
				for(var i = 0; i < indexMessage.length; ++i) {
					var newFlag = 0;
					switch(indexMessage[i]) {
						case 'h':
							newFlag = Tile.FlippedHorizontally;
							break;
						case 'v':
							newFlag = Tile.FlippedVertically;
							break;
						case 'd':
							newFlag = Tile.FlippedAntiDiagonally;
							break;
						case 'x':
							newFlag = Tile.RotatedHexagonal120;
							break;
						default: ;
					}
					var numOldFlags = generateFlips.length;
					for(var old = 0; old < numOldFlags; ++old) {
						generateFlips.push(generateFlips[old] | newFlag);
					}
				}
			}
		}
	}

	map.macro("Create AutoMap Layers", function() {
		if(fillWithBrushTiles) { //generate a layer for each desired flip of each non-empty tile in the brush, and fill the region with it
			var numNewLayers = 0;
			var brushWidth = brush.layerAt(0).width;
			var brushHeight = brush.layerAt(0).height;
			for(var brushX = 0; brushX < brushWidth; ++brushX) {
				for(var brushY = 0; brushY < brushHeight; ++brushY) {
					var sourceTile = brush.layerAt(0).tileAt(brushX, brushY);
					var sourceFlags = brush.layerAt(0).flagsAt(brushX, brushY);
					if(sourceTile) {
						for(var flip = 0; flip < generateFlips.length; ++flip) {
							var newLayerName = layerNames[1];
							if(layerNames[2] == "+") {
								newLayerName += (numNewLayers + indexOffset);
							} else {
								newLayerName += layerNames[2];
							}
							newLayerName += layerNames[3];
							var newLayer = new TileLayer(newLayerName);
							numNewLayers++;
							var layerEdit = newLayer.edit();
							//Scan through regionsLayer, and at each non-empty coordinate, put this tile on the new layer:
							var boundingBox = regionsLayer.region().boundingRect;
							for(var regionX = boundingBox.x; regionX < boundingBox.x + boundingBox.width; ++regionX) {
								for(var regionY = boundingBox.y; regionY < boundingBox.y + boundingBox.height; ++regionY) {
									if(regionsLayer.tileAt(regionX, regionY)) {
										layerEdit.setTile(regionX, regionY, sourceTile, sourceFlags ^ generateFlips[flip]);
									}
								}
							}
							layerEdit.apply();
							if(insertAtBottom) map.insertLayerAt(0, newLayer);
							else map.addLayer(newLayer);
						}
					}
				}
			}
		} else { //Prompt the user for the number of layers, and don't populate them:
			var numLayers = Math.floor(tiled.prompt("How many layers should be created?"));
			if(numLayers && numLayers > 0) {
				for(var layerIndex = 0; layerIndex < numLayers; ++layerIndex) {
					var newLayerName = layerNames[1];
					if(layerNames[2] == "+") {
						newLayerName += (layerIndex + indexOffset);
					} else {
						newLayerName += layerNames[2];
					}
					newLayerName += layerNames[3];
					if(insertAtBottom) map.insertLayerAt(0, new TileLayer(newLayerName));
					else map.addLayer(new TileLayer(newLayerName));
				}
			}
		}
	});	
});
automapHelper.text = "Generate AutoMap Layers";

tiled.extendMenu("Map", [
    { action: "CreateAutomapLayers", before: "SelectNextTileset" },
	{separator: true}
]);
/*=============================================================================*/

/*	Adds two actions to the Edit menu to help with copy+pasting multi-layer rules:
		- Add UIDs to Selected Layers
		- Remove UIDs from Selected Layers
	These add unique identifiers to the layer names, which allows Tiled to correctly copy/paste from/to multiple layers at once,
	as it cannot correctly handle working with several layers with the same name at once, a common scenario in automapping.
*/
var uniquelyNameLayers = tiled.registerAction("AddUIDsToLayerNames", function(action) {
	if(!tiled.activeAsset || !tiled.activeAsset.isTileMap) {
		tiled.alert("Active asset must be a TileMap with layers for layers to be renamed.");
		return;
	}
	var map = tiled.activeAsset;
	
	var layersList = map.selectedLayers;
	if(layersList.length < 1) {
		tiled.alert("There are no layers selected, so no layers were renamed.");
		return;
	}
	//iterate over the layers and modify their names:
	map.macro("Add UIDs to Selected Layers", function() {
		for(var i = 0; i < layersList.length; ++i) {
			//var uid = "[uid:"+String(layersList[i])+"]";
			var uid = "[uid:"+layersList[i].id+"]";
			if(layersList[i].name.indexOf(uid) < 0) layersList[i].name = uid + layersList[i].name;
		}
	});
});
uniquelyNameLayers.text = "Add UIDs to Selected Layers";

var uniquelyUnnameLayers = tiled.registerAction("RemoveUIDsFromLayerNames", function(action) {
	if(!tiled.activeAsset || !tiled.activeAsset.isTileMap) {
		tiled.alert("Active asset must be a TileMap with layers for layers to be renamed.");
		return;
	}
	var map = tiled.activeAsset;
	
	var layersList = map.selectedLayers;
	if(layersList && layersList.length < 1) {
		tiled.alert("There are no layers selected, so no layers were renamed.");
		return;
	}
	//iterate over the layers and modify their names:
	map.macro("Remove UIDs from Selected Layers", function() {
		for(var i = 0; i < layersList.length; ++i) {
			var uid = "[uid:"+layersList[i].id+"]";
			layersList[i].name = layersList[i].name.replace(uid, '');
			//var uidEnd = layersList[i].name.indexOf("]");
			//if(layersList[i].name.indexOf("[uid:") == 0 && uidEnd > 0) {
			//	layersList[i].name = layersList[i].name.substring(uidEnd+1);
			//}
		}
	});
	
});
uniquelyUnnameLayers.text = "Remove UIDs from Selected Layers";

tiled.extendMenu("Edit", [
    { action: "AddUIDsToLayerNames", before: "Preferences" },
    { action: "RemoveUIDsFromLayerNames"},
	{separator: true}
]);
/*=============================================================================*/

/*	Converts the current brush into a multi-layer brush ready for painting on the selected layers.
	If the brush already has multiple tile layers, they'll be renamed to match the selected tile layers.
		If the brush has fewer layers than selected, the bottom layers will be left with nothing.
		If the brush has too many layers, the bottom layers will be left unchanged.
	If the brush has only a single layer, it will be turned into a multi-layer brush, one tile per layer.
		The layers will be named the same as the selected layers, in order from bottom to top.
		If the brush has more tiles than selected layers, the left-over tiles will remain
			on their original layer and in their original locations.
		If the brush has fewer tiles than selected layers, the last tile will be repeated
			on the bottom-most layers.
*/
var brushToLayers = tiled.registerAction("ConvertBrushtoLayers", function(action) {
	if(!tiled.activeAsset || !tiled.activeAsset.isTileMap) {
		tiled.alert("Active asset must be a TileMap with some layers selected. Brush was not changed.");
		return;
	}
	var map = tiled.activeAsset;
	if(map.selectedLayers.length < 1) {
		tiled.alert("There are no layers selected. Brush was not changed.");
		return;
	}
	var brush = tiled.mapEditor.currentBrush;
	if( brush && brush.size.width > 0 && brush.size.height > 0 && brush.layerCount > 0 //the brush exists
	&& (brush.size.width > 1 || brush.size.height > 1 || brush.layerAt(0).tileAt(0,0)) ) { //the brush contains tiles
		var nextMapLayer = 0;
		if(brush.layerCount == 1) { //put each tile on a new layer
			var nextBrushX = -1, nextBrushY = 0;
			var brushLayer = brush.layerAt(0);
			var brushWidth = brushLayer.width;
			var brushHeight = brushLayer.height;
			//var lastSeenTile, lastSeenFlags, lastSeenLayerName;
			while(nextMapLayer < map.selectedLayers.length) {
				while(nextMapLayer < map.selectedLayers.length && !map.selectedLayers[nextMapLayer].isTileLayer)
					nextMapLayer++; //skip non-tile map layers
				if(nextMapLayer < map.selectedLayers.length) {
					//Find the next tile to make a layer for:
					nextBrushX++;
					if(nextBrushX >= brushWidth) {
							nextBrushX = 0;
							nextBrushY++;
						}
					while(nextBrushX < brushWidth && nextBrushY < brushHeight && !brushLayer.tileAt(nextBrushX, nextBrushY)) {
						nextBrushX++;
						if(nextBrushX >= brushWidth) {
							nextBrushX = 0;
							nextBrushY++;
						}
					}
					
					if(nextBrushX < brushWidth && nextBrushY < brushHeight) {
						var newLayer = new TileLayer(map.selectedLayers[nextMapLayer].name);
						var layerEdit = newLayer.edit();
						layerEdit.setTile(0, 0, brushLayer.tileAt(nextBrushX, nextBrushY), brushLayer.flagsAt(nextBrushX, nextBrushY));
						layerEdit.apply();
						brush.addLayer(newLayer);
						//clear the tile from the original layer:
						layerEdit = brush.layerAt(0).edit();
						layerEdit.setTile(nextBrushX, nextBrushY, null);
						layerEdit.apply();
					} else { //We're out of usable tiles in the brush, but still have layers to fill. Repeat the previous layer's tile.
						var newLayer = new TileLayer(map.selectedLayers[nextMapLayer].name);
						var layerEdit = newLayer.edit();
						var previousLayer = brush.layerAt(brush.layerCount-1);
						layerEdit.setTile(0, 0, previousLayer.tileAt(0, 0), previousLayer.flagsAt(0, 0));
						layerEdit.apply();
						brush.addLayer(newLayer);
					}
				}
				nextMapLayer++;
			}
			//If we used up all the tiles, crop the brush to 1x1. Otherwise, leave as-is.
			var moreTilesFound = false;
			while(nextBrushX < brushWidth && nextBrushY < brushHeight) {
				nextBrushX++;
				if(nextBrushX >= brushWidth) {
					nextBrushX = 0;
					nextBrushY++;
				}
				if(brushLayer.tileAt(nextBrushX, nextBrushY)) {
					moreTilesFound = true;
					break;
				}
			}
			if(!moreTilesFound) {
				if(nextBrushY >= brushHeight) {
					brush.setSize(1, 1);
				}
			}
		} else { //rename the existing layers
			var nextBrushLayer = 0;
			while(nextMapLayer < map.selectedLayers.length && nextBrushLayer < brush.layerCount) {
				while(nextMapLayer < map.selectedLayers.length && !map.selectedLayers[nextMapLayer].isTileLayer)
					nextMapLayer++; //skip non-tile map layers
				while(nextBrushLayer < brush.layerCount && !brush.layerAt(nextBrushLayer).isTileLayer)
					nextBrushLayer++; //skip non-tile brush layers

				if(nextMapLayer < map.selectedLayers.length && nextBrushLayer < brush.layerCount) {
					brush.layerAt(nextBrushLayer).name = map.selectedLayers[nextMapLayer].name;
				}
				nextBrushLayer++;
				nextMapLayer++;
			}
		}
		tiled.mapEditor.currentBrush = brush;
	} else {
		tiled.alert("There are no tiles in the brush. Brush was not changed.");
	}
	
});
brushToLayers.text = "Convert Brush to Layers";

tiled.extendMenu("Edit", [
    { action: "ConvertBrushtoLayers", before: "Preferences" },
	{separator: true}
]);
/*=============================================================================*/