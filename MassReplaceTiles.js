/* 	Mass Replace Tiles script by eishiya, last updated 29 Oct 2023

	This script adds three actions to the Map menu to mass replace tiles in
	a map, based on another map that provides the old tile -> new tile mappings.
	It is intended to help update old maps when tilesets change in size or have
	their layouts changed, or when you only want to replace some of the tiles
	instead of all of them.
	
	The first action, "Mass Replace Tiles", replaces tiles in the currently
	active map. When run from the menu, it will look for a "remappingMap" File
	property on the map or prompt you for a remapping map to use.
	
	The second action, "Mass Replace Tiles In Open Maps", will run the "Mass
	Replace Tiles" action on all open maps. If the currently open document looks
	like a valid remapping map, you'll be prompted whether you want to use it.
	Answering "Yes" here allows you to use a particular remapping map without
	having to specify it in any of the maps.
	
	The third action, "Mass Replace Tiles in Project", will run the action on
	all maps in your Project, and otherwise works like the above.
	
	All instances of the old tiles will be replaced by the corresponding
	new tiles, both when used on Tile Layers, and when used as Tile Objects.
	
	Requires Tiled 1.8+, but works best in 1.9+.
	Mass Replace Tiles in Project requires Tiled 1.10.1+.
	
	
	====================== Setting up your remapping map ======================
	Before you can use this script, you will need to create a remapping map,
	which is a regular Tiled map which will tell this script which old tiles
	should be replaced with which new tiles.
	
	The map should have two Tile Layers:
	"old" should contain the tiles you're replacing. The easiest way to make
		this layer is to select everything in your old tileset and stamp it
		onto the layer. Make sure your map is large enough to fit all that.
		Any empty cells on this layer will be ignored.
	"new" should contain the replacement tiles. Each replacement tile should be
		in the same cell as the old tile, but on this layer instead.
		If a cell on this layer is empty, no change will be made to
		the corresponding old tile.
		
	These layers must be top-level layers (not within a group). If multiple
	layers with these names are present, the uppermost of those will be used.
	
		
	====================== Setting up your map to modify ======================
	When your remapping map is ready, you will need to tell this script
	to use it.
	
	When you want to Mass Replace Tiles in a single map, the easiest option is
	to have your remapping map open in Tiled, go to the map you want to modify,
	and run "Mass Replace Tiles". The script will detect that you have a
	remapping map open and ask you if you want to use it.

	If you use the "In Open Maps" or "In Project" batch actions with
	the remapping map as your active document, you will be prompted whether
	you want to use that map. If you select "No", the script will instead look
	for a "remappingMap" custom File property on each map, and use that map
	if it's set, and not modify any maps without a "remappingMap" property.
	
	The "remappingMap" property can also be used when modifying a single map;
	if set, it will be used instead of prompting you for the map to use, which
	can be useful if you need to run the replacer many times on the same map.
	
	You can remove the "remappingMap" property after you're done using
	the mass tile replacer.
	
	
	============================= Tips and Notes ==============================
	This script will automatically remove any tilesets that were completely
	replaced in the map, but will not remove any tilesets that were already
	unused before the replacer runs. Set removeUnusedOldTilesets to false below
	if you don't want this script to ever remove tilesets.
	
	By default, empty tiles in the "new" layer are ignored and the corresponding
	old tiles are not changed. This makes partial replacements of tilesets more
	convenient. If you *do* want to replace tiles with empty, set
	allowReplaceWithEmpty to true below.
	
	The mass replacer will not run a remapping map on itself, so don't worry
	about messing it up by accidentally running the mass replacer on it.
	However, it IS possible to mess up a remapping map by applying a different
	remapping map to it, so make sure that if you're using the batch replacer,
	you only have one remapping map at a time, and that you never have
	a "remappingMap" property on a remapping map.
	
	You can replace tiles within a single tileset, replace tiles from one
	tileset with tiles from another, or any combination thereof.
	
	If you're using this script to aid in the reorganization of a single
	tileset, I recommend making the new version a separate tileset, so you
	can see both old and new tiles correctly in your remapping and can see
	how the riles correspond to one another.
	
	If a tile appears more than once in the "old" layer, the first mapping found
	will be used. This is usually the leftmost and uppermost occurrence.
	For clarity, avoid repeating tiles in the "old" layer.
	
	If you're looking to replace a few individual tiles in a map or two,
	this script is probably overkill and requires too much set up. For that
	scenario, take a look at the Replace Tile Tool in my scripts repository.
	https://github.com/eishiya/tiled-scripts
*/

let massReplaceTiles = tiled.registerAction("MassReplaceTiles", function(action) {
	// =================== CONFIG ===================
	let removeUnusedOldTilesets = true; //If true, any tilesets were used by the map before mass replacement but are no longer used after will be removed. Set to false to keep all tilesets. Any tilesets that were already not used will not be removed either way.
	let allowReplaceWithEmpty = false; //If true, empty tiles in the "new" layer will count as valid replacements. If false, the "old" tile will not be changed.
	// ==============================================
	
	let map = tiled.activeAsset;
	
	if(!map || !map.isTileMap) {
		if(!massReplaceTiles.silentMode) tiled.alert("Error: The active asset must be a TileMap to replace tiles in it.");
		return;
	}
	
	//Get the remappings:
	let remapper, mappings = null;
	
	if(massReplaceTiles.remapperMap) {
		remapper = massReplaceTiles.remapperMap;
		mappings = massReplaceTiles.mappings;
	} else {
		remapper = map.property("remappingMap");
		if(!remapper) {
			/*if(!massReplaceTiles.silentMode) tiled.alert("Error: No \"remappingMap\" custom property set on this map. This should be a File property pointing to your map of tile remappings.");
			return;*/
			if(massReplaceTiles.silentMode) return;
			
			//get list of open maps:
			let maps = [];
			let mapNames = [];
			for(asset of tiled.openAssets) {
				if(asset == map || !asset.isTileMap)
					continue;
				
				//check if this is a valid remapping map:
				let oldTiles = false, newTiles = false;
				for(let li = 0; li < asset.layerCount; ++li) {
					let layer = asset.layerAt(li);
					if(layer.name.toLowerCase() == "old" && layer.isTileLayer)
						oldTiles = true;
					else if(layer.name.toLowerCase() == "new" && layer.isTileLayer)
						newTiles = true;
				}
				if(!oldTiles || !newTiles)
					continue;
				
				//It's valid, save it to the list:
				maps.push(asset);
				if(map.fileName) {
					mapNames.push(FileInfo.fileName(map.fileName));
				} else { //unsaved map
					let mapName = "Unsaved map (";
					
					if(map.infinite) mapName += "infinite"; //TODO: Get used region?
					else mapName += (map.width + " x " + map.height);
					
					mapName += ")";
					mapNames.push(mapName);
				}
			}
			if(maps.length == 0) {
				tiled.alert("Error: This map has no \"remappingMap\" custom property, and no remapping maps were found open in Tiled. Please either create a File property called \"remappingMap\" and set it to the remapper you want to use, or open the remapping map in Tiled.");
				return;
			} else if(maps.length == 1) {
				let choice = tiled.confirm("This map doesn't have a \"remappingMap\" custom property set, but you appear to have a valid remapping map "+mapNames[0]+" open. Would you like to use it as the remapping map?");
				if(choice)
					remapper = maps[0];
				else
					return;
			} else if(tiled.versionLessThan || tiled.version.startsWith("1.9")) { //We can check for 1.10+ by checking for versionLessThan, and for 1.9 by checking the version string. Dialogs require 1.9+
				let dialog = new Dialog("Choose a remapping map");
				dialog.addLabel("Multiple valid remappingMaps were found open in Tiled.\nWhich would you like to use?");
				dialog.addNewRow();
				let dropdown = dialog.addComboBox("", mapNames);
				let choice = 0;
				dropdown.currentIndex = choice;
				dropdown.currentIndexChanged.connect( function() {choice = dropdown.currentIndex;} );
				let okButton = dialog.addButton("OK");
				let cancelButton = dialog.addButton("Cancel");
				cancelButton.clicked.connect(function() {dialog.reject()});
				okButton.clicked.connect(function() {dialog.accept()});
				let result = dialog.exec();
				if(result == Dialog.Rejected)
					return;
				else {
					if(choice < 0 || choice > maps.length)
						return;
					else remapper = maps[choice];
				}
			} else {
				tiled.alert("Error: This map has no \"remappingMap\" custom property, and while multiple possible remapping maps are open in Tiled, your version of Tiled is too old, so the multiple options cannot be displayed. Please either create a custom File property called \"remappingMap\" and set it to the remapper you want to use, or make sure only a single remapping map is open in Tiled.");
				return;
			}
			
			
		} else if(!remapper.url || remapper.url.length < 1) {
			if(!massReplaceTiles.silentMode) tiled.alert("Error: The \"remappingMap\" custom property doesn't have a file set. It should point to your map of tile remappings.");
			return;
		}
		if(remapper && !remapper.isTileMap)
			remapper = tiled.open(remapper);
	}
	if(!remapper || !remapper.isTileMap) {
		if(!massReplaceTiles.silentMode) tiled.alert("Error: The \"remappingMap\" does not point to a valid Tiled Map.");
		return;
	}
	
	if(remapper == map) {
		if(!massReplaceTiles.silentMode) tiled.alert("Warning: This map is the remapping map. Mass Replacing tiles on it will produce garbage. Skipping it.");
		return;
	}
	
	let oldTiles = null, newTiles = null;
	for(let li = 0; li < remapper.layerCount; ++li) {
		let layer = remapper.layerAt(li);
		if(layer.name.toLowerCase() == "old" && layer.isTileLayer)
			oldTiles = layer;
		else if(layer.name.toLowerCase() == "new" && layer.isTileLayer)
			newTiles = layer;
	}
	
	if(!oldTiles && !newTiles) {
		if(!massReplaceTiles.silentMode) tiled.alert("Error: The map of tile remappings does not have the required \"old\" and \"new\" layers, or they're not Tile Layers.");
		return;
	} else if(!oldTiles) {
		if(!massReplaceTiles.silentMode) tiled.alert("Error: The map of tile remappings does not have the required \"old\" layer, or it's not a Tile Layer.");
		return;
	} else if(!newTiles) {
		if(!massReplaceTiles.silentMode) tiled.alert("Error: The map of tile remappings does not have the required \"new\" layer, or it's not a Tile Layer.");
		return;
	}
	
	//Read the remapping map and save all the replacements
	if(!mappings) {
		mappings = new Map();
		//Get the region occupied by old tiles, so we look at only those cells that are important:
		let oldRegionRects = oldTiles.region().rects;
		
		for(oldRect of oldRegionRects) {
			for(let x = oldRect.x; x < oldRect.x + oldRect.width; x++) {
				for(let y = oldRect.y; y < oldRect.y + oldRect.height; y++) {
					tile = oldTiles.tileAt(x, y);
					if(tile) {
						let newTile = newTiles.tileAt(x, y);
						if(allowReplaceWithEmpty || newTile)
							mappings.set( tile, {tile: newTile, flags: oldTiles.flagsAt(x,y) ^ newTiles.flagsAt(x,y)} );
						//We must store a reference to the old tile to avoid it getting garbage-collected. This ensures tile references are consistent.
						//Fortunately using a Map and the old tile as the key accomplishes that.
					}
				}
			}
		}
		if(massReplaceTiles.remapperMap) //Save these mappings for subsequent runs
			massReplaceTiles.mappings = mappings;
	}
	
	function findReplacement(oldTile) {
		if(!oldTile) return null;
		return mappings.get(oldTile);
	}
	
	//Some functions for remapping a given layer:
	function remapTileLayer(layer) {
		if(!layer || !layer.isTileLayer) return;
		//iterate all the cells within the area used by tiles. This approach allows
		//the replacer to work on infinite maps, and avoids checking empty areas.
		let bounds = layer.region();
		let rects = bounds.rects;
		let layerEdit = layer.edit();
		for(rect of rects) {
			for(let x = rect.x; x < rect.x + rect.width; x++) {
				for(let y = rect.y; y < rect.y + rect.height; y++) {
					tile = findReplacement(layer.tileAt(x, y));
					if(tile) {
						layerEdit.setTile(x, y, tile.tile, tile.flags ^ layer.flagsAt(x, y));
					}
				}
			}
		}
		layerEdit.apply();
	}
	
	function remapObjectLayer(layer) {
		//iterate all the objects and replace any assigned tiles
		for(let obj = 0; obj < layer.objectCount; ++obj) {
			let mapObj = layer.objectAt(obj);
			let tile = findReplacement(mapObj.tile);
			if(tile) {
				mapObj.tile = tile.tile;
				mapObj.tileFlippedHorizontally = mapObj.tileFlippedHorizontally ^ (tile.flags & Tile.FlippedHorizontally > 0);
				mapObj.tileFlippedVertically = mapObj.tileFlippedVertically ^ (tile.flags & Tile.FlippedVertically > 0);
			}
		}
	}
	
	function remapLayer(layer) {
		if(!layer) return;
		if(layer.isTileLayer) {
			remapTileLayer(layer);
		} else if(layer.isObjectLayer) {
			remapObjectLayer(layer);
		} else if(layer.isGroupLayer) {
			//process over its child layers recursively:
			for(let gi = 0; gi < layer.layerCount; ++gi) {
				remapLayer(layer.layerAt(gi));
			}
		}
	}
	map.macro("Mass Replace Tiles", function() {
		let oldUsedTilesets = map.usedTilesets();
		//Remap each layer. Layer groups are handled recursively.
		for(let mi = 0; mi < map.layerCount; ++mi) {
			remapLayer(map.layerAt(mi));
		}
		if(removeUnusedOldTilesets) {
			let newUsedTilesets = map.usedTilesets();
			for(tileset of oldUsedTilesets) {
				if(!newUsedTilesets.includes(tileset))
					map.removeTileset(tileset);
			}
		}
		tiled.activeAsset = map;
	});
});
massReplaceTiles.text = "Mass Replace Tiles";
massReplaceTiles.silentMode = false;
massReplaceTiles.remapperMap = null;


let massReplaceBatch = tiled.registerAction("MassReplaceBatch", function(action) {
	massReplaceTiles.remapperMap = null;
	
	remapper = tiled.activeAsset;
	let remapperIsValid = true;
	if(!remapper || !remapper.isTileMap) {
		remapperIsValid = false;
	} else {
		let oldTiles = false, newTiles = false;
		for(let li = 0; li < remapper.layerCount; ++li) {
			let layer = remapper.layerAt(li);
			if(layer.name.toLowerCase() == "old" && layer.isTileLayer)
				oldTiles = true;
			else if(layer.name.toLowerCase() == "new" && layer.isTileLayer)
				newTiles = true;
		}
		if(!oldTiles || !newTiles) {
			remapperIsValid = false;
		}
	}
	if(remapperIsValid)
		remapperIsValid = tiled.confirm("The active map appears to be a valid remapping map. Would you like to use it for this batch?\nIf you select No, the mass replacer will look for a \"remappingMap\" property on each map.");
	if(remapperIsValid) {
		massReplaceTiles.remapperMap = remapper;
	}
	
	massReplaceTiles.silentMode = true;
	
	//Iterate over open maps and apply the "MassReplaceTiles" action to them.
	let assetCount = tiled.openAssets.length, map;
	for(let asset = 0; asset < assetCount; ++asset) {
		map = tiled.openAssets[asset];
		if(map && map.isTileMap) {
			tiled.activeAsset = map;
			tiled.trigger("MassReplaceTiles");
		}
	}
	tiled.activeAsset = remapper; //go back to the asset where we started
	
	//Reset the options to default, so that the single-map replacer runs normally:
	massReplaceTiles.silentMode = false;
	massReplaceTiles.remapperMap = null;
	massReplaceTiles.mappings = null;
	
});
massReplaceBatch.text = "Mass Replace Tiles in Open Maps";

let projectAvailable = tiled.project && tiled.projectFilePath.length > 0;
if(projectAvailable) {
	let massReplaceAll = tiled.registerAction("MassReplaceInProject", function(action) {
		massReplaceTiles.remapperMap = null;
		
		remapper = tiled.activeAsset;
		let remapperIsValid = true;
		if(!remapper || !remapper.isTileMap) {
			remapperIsValid = false;
		} else {
			let oldTiles = false, newTiles = false;
			for(let li = 0; li < remapper.layerCount; ++li) {
				let layer = remapper.layerAt(li);
				if(layer.name.toLowerCase() == "old" && layer.isTileLayer)
					oldTiles = true;
				else if(layer.name.toLowerCase() == "new" && layer.isTileLayer)
					newTiles = true;
			}
			if(!oldTiles || !newTiles) {
				remapperIsValid = false;
			}
		}
		if(remapperIsValid)
			remapperIsValid = tiled.confirm("The active map appears to be a valid remapping map. Would you like to use it for this batch?\nIf you select No, the mass replacer will look for a \"remappingMap\" property on each map.");
		if(remapperIsValid) {
			massReplaceTiles.remapperMap = remapper;
		} else if(!tiled.confirm("Are you sure you'd like to run the mass replacer on all maps in the project? Any maps that aren't already open will be saved and closed after modification, so you will not be able to Undo!")) {
			return;
		}
		
		massReplaceTiles.silentMode = true;
		
		//Iterate over open maps and apply the "MassReplaceTiles" action to them.
		let maps = [];
		
		//TODO: Update for the final Project API, maybe we don't need collectMaps()
		function getOpenMap(file) {
			for(asset of tiled.openAssets) {
				if(asset.fileName == file && asset.isTileMap)
					return asset;
			}
			return null;
		}
		
		//Recursively add all the maps in a folder to maps
		let checkedFolders = {};
		function collectMaps(folder) {
			let canonicalPath = FileInfo.canonicalPath(folder);
			if(checkedFolders[canonicalPath]) return;
			
			checkedFolders[canonicalPath] = true;
			//First, get all the files in this folder
			let files = File.directoryEntries(folder, File.Files | File.Readable | File.NoDotAndDotDot);
			for(file of files) {
				let path = folder+"/"+file;
				let format = tiled.mapFormatForFile(path);
				if(format) {
					let map = getOpenMap(path);
					if(map)
						maps.push(map);
					else
						maps.push(path);
				} //else there's no map format that can read this file, it's not a Tiled map, skip it.
			}
			//Then, look at any subfolders:
			files = File.directoryEntries(folder, File.Dirs | File.Readable | File.NoDotAndDotDot);
			for(file of files) {
				collectMaps(folder+"/"+file);
			}
		}
		
		let folders = tiled.project.folders;
		for(folder of folders)
			collectMaps(folder);
		
		for(map of maps) {
			if(map.isTileMap) {
				tiled.activeAsset = map;
				tiled.trigger("MassReplaceTiles");
			} else { //a path
				map = tiled.open(map);
				tiled.activeAsset = map;
				tiled.trigger("MassReplaceTiles");
				tiled.trigger("Save");
				tiled.close(map);
			}
		}
		tiled.activeAsset = remapper; //go back to the asset where we started
		
		//Reset the options to default, so that the single-map replacer runs normally:
		massReplaceTiles.silentMode = false;
		massReplaceTiles.remapperMap = null;
		massReplaceTiles.mappings = null;
	});
	massReplaceAll.text = "Mass Replace Tiles in Project";
}

if(projectAvailable) {
	tiled.extendMenu("Map", [
		{ action: "MassReplaceTiles", before: "MapProperties" },
		{ action: "MassReplaceBatch" },
		{ action: "MassReplaceInProject" },
		{separator: true}
	]);
} else {
	tiled.extendMenu("Map", [
		{ action: "MassReplaceTiles", before: "MapProperties" },
		{ action: "MassReplaceBatch" },
		{separator: true}
	]);
}
