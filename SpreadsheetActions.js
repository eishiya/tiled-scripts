/// <reference types="@mapeditor/tiled-api" />

/* 	Spreadsheet Actions script by eishiya, last updated 14 Feb 2023
	Object shifting by edigeronimo

	Adds several actions to the Edit menu to insert and delete columns and rows
	at a selection location. The selection size determines the number of columns
	or rows that will be inserted or added.
	
	The actions use your selection's bounding box, not each individual selected
	row/column! If you have a complex selection, more rows/columns may be
	affected than you expect.
	
	When deleting columns/rows, the selected columns/rows will be deleted.
	When inserting columns/rows, they will be inserted to the left or above
		the selected area, so the inserted columns/rows will end up selected.
	
	When inserting rows/columns and the selection is outside the map, additional
	rows/columns may be inserted to ensure the map is large enough to include
	the selected area.
	
	By default, this script also shifts over objects. This works well on ortho-
	graphic and isometric maps, but may give inconsistent results on staggered
	maps. You can set shiftObjects to false below to disable object shifting.
*/

var spreadsheetActions = {
	shiftObjects: true, //Set this to false if you don't want objects to be shifted over.
	tileLayers: [], //List of layers on the current map.
	objectLayers: [], //List of object layers on the current map.
	savedSelection: null, //The user's selection, backed up before we mess with it.
	/* Calculates the the map's region.
		For finite maps, this is just the map size.
		For infinite maps, calculates the total area of all tile layers.
	*/
	getMapBounds: function(map) {
		if(map.infinite) {
			let bounds = null;
			function updateBounds(layer) {
				if(layer.isTileMap || layer.isGroupLayer) {
					for(let i = 0; i < layer.layerCount; ++i) {
						updateBounds(layer.layerAt(i));
					}
				} else if(layer.isTileLayer) {
					spreadsheetActions.tileLayers.push(layer);
					if(map.infinite) {
						if(bounds) {
							let newBounds = layer.region().boundingRect;
							if(newBounds.top < bounds.top) {
								bounds.height += (bounds.top - newBounds.top);
								bounds.y = newBounds.top;
							}
							if(newBounds.bottom > bounds.bottom) {
								bounds.height += (newBounds.bottom - bounds.bottom +1);
							}
							if(newBounds.left < bounds.left) {
								bounds.width += (bounds.left - newBounds.left);
								bounds.x = newBounds.x;
							}
							if(newBounds.right > bounds.right) {
								bounds.width += (newBounds.right - bounds.right +1);
							}
						} else {
							bounds = layer.region().boundingRect;
							bounds = Qt.rect(bounds.x, bounds.y, bounds.width, bounds.height);
						}
					}
				}
			}
			updateBounds(map);
			if(bounds)
				return bounds;
			return Qt.rect(0, 0, 0, 0); //no populated tile layers found!
		}
		return Qt.rect(0, 0, map.width, map.height);
	},
	/* Compiles a list of all tile and object layers in the map, recursively.
		Doesn't return anything, just saves them to tileLayers and objectLayers.
		This can't be merged into getMapBounds because resizing the map later
		will invalidate all these layer references.
	*/
	getMapLayers: function(map) {
		spreadsheetActions.tileLayers.length = 0;
		spreadsheetActions.objectLayers.length = 0;
		function getLayers(layer) {
			if(layer.isTileMap || layer.isGroupLayer) {
				for(let i = 0; i < layer.layerCount; ++i) {
					getLayers(layer.layerAt(i));
				}
			} else if(layer.isTileLayer) {
				spreadsheetActions.tileLayers.push(layer);
			} else if (layer.isObjectLayer && spreadsheetActions.shiftObjects) {
				spreadsheetActions.objectLayers.push(layer);
			}
		}
		getLayers(map);
	},

	//Saves the user's current selection so it can be restored later. This is a full copy, not a reference.
	saveSelection: function(map) {
		spreadsheetActions.savedSelection = map.selectedArea.get();
	},
	//Restores the saved selection.
	restoreSelection: function(map) {
		map.selectedArea.set(spreadsheetActions.savedSelection);
	},
	
	insertRows: tiled.registerAction("InsertRowsAt", function(action) {
		let map = tiled.activeAsset;
		if(!map || !map.isTileMap)
			return;
		let selection = map.selectedArea.boundingRect; //a reference we can't change...
		selection = Qt.rect(selection.x, selection.y, selection.width, selection.height); //...so we copy it
		if(selection.height == 0) return;
		let mapRegion = spreadsheetActions.getMapBounds(map);
		
		if(map.infinite) {
			//Don't bother trying to add rows outside the map on infinite maps
			if(selection.y > mapRegion.y + mapRegion.height) return;
			if(selection.y + selection.height < mapRegion.y) return;
		} else {
			//If the selection is outside the map, expand the affected region so the insertions fit
			if(selection.y > mapRegion.y + mapRegion.height) { //selection below the map
				selection.height += (selection.y - (mapRegion.y + mapRegion.height));
				selection.y = mapRegion.y + mapRegion.height;
			} else if(selection.y + selection.height < mapRegion.y) { //selection above the map
				selection.height = mapRegion.y - selection.y;
			}
		}

		map.macro("Insert Rows", function () {
			if(!map.infinite)
				map.resize(Qt.size(map.width, map.height + selection.height));
				//map.height = map.height + selection.height;
			spreadsheetActions.saveSelection(map);
			map.selectedArea.set(Qt.rect(0,0,0,0));
			spreadsheetActions.getMapLayers(map);
			for(layer of spreadsheetActions.tileLayers) {
				let layerEdit = layer.edit();
				//Copy all the columns from the beginning of the selection to the end of the map, starting from the bottom
				for(let y = mapRegion.bottom-1; y >= selection.top; y--) {
					for(x = mapRegion.left; x < mapRegion.right; x++) {
						let tile = layer.tileAt(x, y);
						let flags = layer.flagsAt(x, y);
						layerEdit.setTile(x, y+selection.height, tile, flags);
					}
				}
				//Clear the selected rows:
				for(let y = selection.top; y < selection.bottom; y++) {
					for(x = mapRegion.left; x < mapRegion.right; x++) {
						layerEdit.setTile(x, y, null);
					}
				}
				layerEdit.apply();
			}
			for (layer of spreadsheetActions.objectLayers) {
				//Find any objects after the insertion point and shift them
				tileSize = map.tileHeight;
				for (obj of layer.objects) {
					if (obj.y >= selection.y * tileSize) {
						obj.y += selection.height * tileSize;
					}
				}
			}
			spreadsheetActions.restoreSelection(map);
		});
	}),
	
	deleteRows: tiled.registerAction("DeleteRowsAt", function(action) {
		let map = tiled.activeAsset;
		if(!map || !map.isTileMap)
			return;
		let selection = map.selectedArea.boundingRect; //a reference we can't change...
		selection = Qt.rect(selection.x, selection.y, selection.width, selection.height); //...so we copy it
		if(selection.height == 0) return;
		let mapRegion = spreadsheetActions.getMapBounds(map);
		
		//Don't bother trying to remove rows outside the map on infinite maps
		if(selection.top >= mapRegion.bottom) return;
		if(selection.bottom <= mapRegion.top) return;
		
		//Make sure the selection doesn't go outside the map bounds, so we don't delete more rows than are actually selected:
		if(selection.bottom > mapRegion.bottom) {
			selection.height = mapRegion.bottom - selection.y;
		}
		if(selection.top < mapRegion.top) {
			selection.height = selection.bottom - mapRegion.y;
			selection.y = mapRegion.y;
		}
		if(selection.height < 1 || selection.height >= map.height) return;

		map.macro("Delete Rows", function() {
			spreadsheetActions.saveSelection(map);
			map.selectedArea.set(Qt.rect(0,0,0,0));
			spreadsheetActions.getMapLayers(map);
			for(layer of spreadsheetActions.tileLayers) {
				let layerEdit = layer.edit();
				//Copy all the rows from the end of the selection to the end of the map, starting from the top
				for(let y = selection.bottom; y < mapRegion.bottom; y++) {
					for(x = mapRegion.left; x < mapRegion.right; x++) {
						let tile = layer.tileAt(x, y);
						let flags = layer.flagsAt(x, y);
						layerEdit.setTile(x, y-selection.height, tile, flags);
					}
				}
				//On infinite maps, clear the rows beyond the map's new edge
				if(map.infinite) {
					for(let y = mapRegion.bottom - selection.height; y < mapRegion.bottom; y++) {
						for(x = mapRegion.left; x < mapRegion.right; x++) {
							layerEdit.setTile(x, y, null);
						}
					}
				}
				layerEdit.apply();
			}
			for (layer of spreadsheetActions.objectLayers) {
				//Find any objects after the insertion point and shift them
				tileSize = map.tileHeight;
				for (obj of layer.objects) {
					if (obj.y >= selection.y * tileSize) {
						obj.y -= selection.height * tileSize;
					}
				}
			}
			spreadsheetActions.restoreSelection(map);
			if(!map.infinite)
				map.resize(Qt.size(map.width, map.height - selection.height));
		});
	}),
	
	insertCols: tiled.registerAction("InsertColsAt", function(action) {
		let map = tiled.activeAsset;
		if(!map || !map.isTileMap)
			return;
		let selection = map.selectedArea.boundingRect; //a reference we can't change...
		selection = Qt.rect(selection.x, selection.y, selection.width, selection.height); //...so we copy it
		if(selection.width == 0) return;
		let mapRegion = spreadsheetActions.getMapBounds(map);
		
		if(map.infinite) {
			//Don't bother trying to add columns outside the map on infinite maps
			if(selection.x > mapRegion.x + mapRegion.width) return;
			if(selection.x + selection.width < mapRegion.x) return;
		} else {
			//If the selection is outside the map, expand the affected region so the insertions fit
			if(selection.x > mapRegion.x + mapRegion.width) { //selection right of the map
				selection.width += (selection.x - (mapRegion.x + mapRegion.width));
				selection.x = mapRegion.x + mapRegion.width;
			} else if(selection.x + selection.width < mapRegion.x) { //selection left of the map
				selection.width = mapRegion.x - selection.x;
			}
		}

		map.macro("Insert Columns", function() {
			if(!map.infinite)
				map.resize(Qt.size(map.width + selection.width, map.height));
				//map.height = map.height + selection.height;
			spreadsheetActions.saveSelection(map);
			map.selectedArea.set(Qt.rect(0,0,0,0));
			spreadsheetActions.getMapLayers(map);
			for(layer of spreadsheetActions.tileLayers) {
				let layerEdit = layer.edit();
				//Copy all the columns from the beginning of the selection to the end of the map, starting from the right
				for(let x = mapRegion.right-1; x >= selection.left; x--) {
					for(y = mapRegion.top; y < mapRegion.bottom; y++) {
						let tile = layer.tileAt(x, y);
						let flags = layer.flagsAt(x, y);
						layerEdit.setTile(x+selection.width, y, tile, flags);
					}
				}
				//Clear the selected columns:
				for(let x = selection.left; x < selection.right; x++) {
					for(y = mapRegion.top; y < mapRegion.bottom; y++) {
						layerEdit.setTile(x, y, null);
					}
				}
				layerEdit.apply();
			}
			for (layer of spreadsheetActions.objectLayers) {
				//Find any objects after the insertion point and shift them
				tileSize = map.tileWidth;
				for (obj of layer.objects) {
					if (obj.x >= selection.x * tileSize) {
						obj.x += selection.width * tileSize;
					}
				}
			}
			spreadsheetActions.restoreSelection(map);
		});
	}),
	
	deleteCols: tiled.registerAction("DeleteColsAt", function(action) {
		let map = tiled.activeAsset;
		if(!map || !map.isTileMap)
			return;
		let selection = map.selectedArea.boundingRect; //a reference we can't change...
		selection = Qt.rect(selection.x, selection.y, selection.width, selection.height); //...so we copy it
		if(selection.width == 0) return;
		let mapRegion = spreadsheetActions.getMapBounds(map);
		
		//Don't bother trying to remove columns outside the map
		if(selection.x > mapRegion.x + mapRegion.width) return;
		if(selection.x + selection.width < mapRegion.x) return;
		
		//Make sure the selection doesn't go outside the map bounds, so we don't delete more columns than are actually selected:
		if(selection.right > mapRegion.right) {
			selection.width = mapRegion.right - selection.x;
		}
		if(selection.left < mapRegion.left) {
			selection.height = selection.right - mapRegion.x;
			selection.x = mapRegion.x;
		}
		if(selection.width < 1 || selection.width >= map.width) return;

		map.macro("Delete Columns", function() {
			spreadsheetActions.saveSelection(map);
			map.selectedArea.set(Qt.rect(0,0,0,0));
			spreadsheetActions.getMapLayers(map);
			for(layer of spreadsheetActions.tileLayers) {
				let layerEdit = layer.edit();
				//Copy all the rows from the end of the selection to the end of the map, starting from the left
				for(let x = selection.right; x < mapRegion.right; x++) {
					for(y = mapRegion.top; y < mapRegion.bottom; y++) {
						let tile = layer.tileAt(x, y);
						let flags = layer.flagsAt(x, y);
						layerEdit.setTile(x-selection.width, y, tile, flags);
					}
				}
				//On infinite maps, clear the rows beyond the map's new edge
				if(map.infinite) {
					for(let x = mapRegion.right - selection.width; x < mapRegion.right; x++) {
						for(y = mapRegion.top; y < mapRegion.bottom; y++) {
							layerEdit.setTile(x, y, null);
						}
					}
				}
				layerEdit.apply();
			}
			for (layer of spreadsheetActions.objectLayers) {
				//Find any objects after the insertion point and shift them
				tileSize = map.tileWidth;
				for (obj of layer.objects) {
					if (obj.x >= selection.x * tileSize) {
						obj.x -= selection.width * tileSize;
					}
				}
			}
			spreadsheetActions.restoreSelection(map);
			if(!map.infinite)
				map.resize(Qt.size(map.width - selection.width, map.height));
		});
	})
};
spreadsheetActions.insertRows.text = "Insert Rows at Selection";
spreadsheetActions.insertCols.text = "Insert Columns at Selection";
spreadsheetActions.deleteRows.text = "Delete Selected Rows";
spreadsheetActions.deleteCols.text = "Delete Selected Columns";

tiled.extendMenu("Edit", [
	{ action: "InsertRowsAt", before: "Preferences" },
	{ action: "InsertColsAt" },
	{ action: "DeleteRowsAt" },
	{ action: "DeleteColsAt" },
	{separator: true}
]);
