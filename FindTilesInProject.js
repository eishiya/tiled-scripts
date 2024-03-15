/* 	Find Tiles In Project script by eishiya, last updated 15 Mar 2024

	Adds an action to the Tileset menu that lets you find instances
	of selected tiles in maps in the Project.
	
	Since this script scans all your maps, it can take a while. Be patient.
	
	Requires Tiled 1.10.1+ and a loaded project.
*/

if(tiled.project && tiled.projectFilePath.length > 0) {
	let findTilesInProject = tiled.registerAction("FindTilesInProject", function(action) {
		let tileset = tiled.activeAsset;
		if(!tileset.isTileset || tileset.selectedTiles.length < 1) return;
		
		function selectTiles(map, tiles) {
			let selectedCount = 0;
			let selection = map.selectedArea.get();
			selection.subtract(selection);
			
			function selectInLayer(layer) {
				if(!layer) return;
				if(layer.isTileLayer) {
					let bounds = layer.region().boundingRect;
					let endX = bounds.x + bounds.width;
					let endY = bounds.y + bounds.height;
					for(let x = bounds.x; x < endX; ++x) {
						for(let y = bounds.y; y < endY; ++y) {
							if(tiles.includes(layer.tileAt(x, y))) {
								selectedCount++;
								selection.add(Qt.rect(x, y, 1, 1));
							}
						}
					}
				} else if(layer.isObjectLayer) {
					for(let obj = 0; obj < layer.objectCount; ++obj) {
						let mapObj = layer.objectAt(obj);
						if(mapObj.tile && tiles.includes(mapObj.tile)) {
							selectedCount++;
							mapObj.selected = true;
						} else
							mapObj.selected = false;
					}
				} else if(layer.isGroupLayer || layer.isTileMap) {
					//process over its child layers recursively:
					for(let gi = 0; gi < layer.layerCount; ++gi) {
						selectInLayer(layer.layerAt(gi));
					}
				}
			}
			selectInLayer(map);
			
			if(selectedCount > 0) {
				map.selectedArea.set(selection);
				tiled.log("Found "+selectedCount+" instances in "+map.fileName);
			}
			return selectedCount;
		}
		
		let maps = [];
		
		//TODO: Update for the final Project API, maybe we don't need collectMaps()
		function getOpenMap(file) {
			for(let asset of tiled.openAssets) {
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
			for(let file of files) {
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
			for(let file of files) {
				collectMaps(folder+"/"+file);
			}
		}
		
		let folders = tiled.project.folders;
		for(let folder of folders)
			collectMaps(folder);
		
		let tilesToSelect = tileset.selectedTiles;
		
		for(let map of maps) {
			if(map.isTileMap) {
				selectTiles(map, tilesToSelect);
			} else { //a path
				map = tiled.open(map);
				if(selectTiles(map, tilesToSelect) < 1)
					tiled.close(map);
			}
		}
		tiled.activeAsset = tileset;
	});
	findTilesInProject.text = "Find Tiles in Project";
	
	tiled.extendMenu("Tileset", [
		{ action: "FindTilesInProject", before: "TilesetProperties" },
		//{separator: true}
	]);
}