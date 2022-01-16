/*	Replace Tile Tool by eishiya, last updated 11 Dec 2021

	Adds a tool to your Map Toolbar that aids in replacing Tiles.
	
	It can do the following:
	- Left click: Replaces the tile you clicked on with your current tile in
		all selected, unlocked layers.
	- Right click: Sample the clicked tile, useful to choose a tile to replace
		others with.
	- Hold Shift: Replaces the tile you clicked on with your current tile in
		ALL layers, including unselected and locked layers, and ignores
		any current tile and object selection. Useful for mass replace.
	- Hold Alt: Replaces Tile Objects in addition to tiles. Currently only means
		anything when combined with Shift, as tiles aren't sampled from Objects.
		The Tile Object's horizontal and vertical flips are reconciled with
		the flip of the replacement tile, but diagonal flips are ignored,
		this Tool will never rotate or move your Objects.
	
	When replacing tiles, the original tile's rotation/flip flags are reconciled
	(XOR) with the new tile's. This means that if you replace a tile with
	a horizontally flipped version of itself, all instances of that tile will be
	flipped horizontally, so already flipped tiles will be un-flipped.
	If you just want to replace all instances of a tile without modifying their
	flips, make sure your new tile is completely unflipped and unrotated.
	
	It is recommended to include the ReplaceTile.png icon with this script,
	so that the tool shows up with that icon, instead of a big text button.
	
	If you need to replace a large number of tiles and/or replace tiles across
	many maps, see the Mass Replace Tiles script:
	https://github.com/eishiya/tiled-scripts/blob/main/MassReplaceTiles.js
*/

var tool = tiled.registerTool("ReplaceTile", {
	name: "Replace Tile",
	icon: "ReplaceTile.png",
	usesSelectedTiles: true,
	 
	replaceAll: false,
	isActive: false,
	replaceObjects: false,

	activated: function() {
		this.isActive = true;
	},
	
	deactivated: function() {
		this.isActive = false;
	},

	mousePressed: function (button, x, y, modifiers) {
		if(this.isActive) {
			if(button == 1) { //left-click, perform the replace
				//if(!this.map || !this.preview) return;
				//this.map.merge(this.preview); //Unreliable, because it uses layer names to decide which layers to merge ):
				
				//Until merging is improved, redo the whole tile-replacement logic when committing, to ensure layers with repeated names are affected correctly:
				if(!this.map || this.map.selectedLayers.length < 1) return;
				
				//Get the tile to replace:
				var selectedLayer = this.map.selectedLayers[0];
				if(!selectedLayer) return;
				let originalTile = null;
				if(selectedLayer.isTileLayer) {
					originalTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
				}/* else if(selectedLayer.isObjectLayer) {
					//Selecting tiles from objects is not yet supported because Object Alignment and rotations make this rather complicated, with no help from the scripting API
				}*/
				if(!originalTile) return;
				
				//Get the flags:
				var flags = 0;
				var brush = tiled.mapEditor.currentBrush;
				if(brush.width == 1 && brush.height == 1 && brush.layerCount > 0) {
					flags = brush.layerAt(0).flagsAt(0,0);
				}
				
				var tempThis = this;
				this.map.macro(this.name, function() {
					tempThis.replaceTile(originalTile, tempThis.selectedTile, flags, false);
				});
			} else if(button == 2) { //right-click, sample the tile on the selected layer
				if(!this.map || this.map.selectedLayers.length < 1) return;
				var selectedLayer = this.map.selectedLayers[0];
				if(!selectedLayer || !selectedLayer.isTileLayer) return;
				var newTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
				var tilesetsView = tiled.mapEditor.tilesetsView;
				if(newTile) {
					tilesetsView.currentTileset = newTile.tileset;
					tilesetsView.selectedTiles = [newTile];
				}
			}
		}
	},
	
	tilePositionChanged: function () {
		if(this.isActive) {
			this.showPreview();
		}
	},
	
	modifiersChanged: function(modifiers) {
		if(this.isActive) {
			if(modifiers & Qt.ShiftModifier || modifiers & Qt.ControlModifier)
				this.replaceAll = true;
			else
				this.replaceAll = false;
			
			if(modifiers & Qt.AltModifier)
				this.replaceObjects = true;
			else
				this.replaceObjects = false;
			
			this.showPreview();
		}
	},
	
	updateStatusInfo: function () {
		if(this.isActive) {
			if(!this.map || this.map.selectedLayers.length < 1) {
				this.statusInfo = "Replace Tile has no map or selected layers, so it cannot find a tile to replace.";
				return;
			}
			if(!this.selectedTile) {
				this.statusInfo = "No replacement tile selected.";
			} else {
				let selectedLayer = this.map.selectedLayers[0];
				if(!selectedLayer) {
					this.statusInfo = "No layer selected (probably a Tiled glitch, just move your cursor to try again).";
				} else if(selectedLayer.isTileLayer) {
					let originalTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
					this.statusInfo = this.tilePosition.x + ", " + this.tilePosition.y + " [" + (originalTile? originalTile.id : "empty") + " → "+this.selectedTile.id + "]";
				} else if(selectedLayer.isObjectLayer) {
					this.statusInfo = "Targeting Objects for tile replacement is not currently supported, please switch to a Tile Layer.";
				} else {
					this.statusInfo = "The selected layer is not a Tile Layer.";
				}
			}
		}
	},
	
	replaceTile: function(oldTile, newTile, flags, isPreview) {
		if(!this.map) return;
		
		let preview = this.preview;		
		let tempThis = this;
		
		//Recursively replace tiles in layers:
		function replaceTileInLayer(curLayer) {
			if(curLayer.isTileLayer) {
				if(isPreview) {
					newLayer = new TileLayer();
					newLayer.name = curLayer.name;
					newLayer.visible = curLayer.visible;
					newLayer.resize(curLayer.size);
				}
				if(tempThis.replaceAll || (!curLayer.locked && tempThis.map.selectedLayers.indexOf(curLayer) >= 0) ) {
					if(isPreview)
						layerEdit = newLayer.edit();
					else
						layerEdit = curLayer.edit();

					let region = tempThis.map.selectedArea;
					if(tempThis.replaceAll || !region || region.boundingRect.width <= 0 || region.boundingRect.height <= 0) {
						region = curLayer.region();
					}
					
					let rects;
					if(region.rects) rects = region.rects;
					else rects = [region.boundingRect];
					
					for(let r = 0; r < rects.length; ++r) {
						let curRect = rects[r];
						let endX = curRect.x + curRect.width;
						let endY = curRect.y + curRect.height;
						for(let x = curRect.x; x < endX; ++x) {
							for(let y = curRect.y; y < endY; ++y) {
								if(oldTile == curLayer.tileAt(x, y)) {
									layerEdit.setTile(x, y, newTile, curLayer.flagsAt(x, y) ^ flags);
								}
							}
						}
					}
					layerEdit.apply();
				}
				if(isPreview)
					preview.addLayer(newLayer);
			} else if(curLayer.isObjectLayer) {
				if(tempThis.replaceObjects && !isPreview && (tempThis.replaceAll || (!curLayer.locked && tempThis.map.selectedLayers.indexOf(curLayer) >= 0)) ) {
					for(let obj = 0; obj < curLayer.objectCount; ++obj) {
						let mapObj = curLayer.objectAt(obj);
						//if(!tempThis.replaceAll && !mapObj.selected /*&& selectedObjects.length > 0*/) continue; //if an object isn't selected but other objects are, skip it (except when doing replaceAll, of course)
						// ^ For now, replaceAll is always active if an Object Layer is going to be affected. And the Tiled API has no easy way to get a count selected Objects.
						if(mapObj.tile && mapObj.tile == oldTile) {
							mapObj.tile = newTile;
							if(flags & Tile.FlippedHorizontally)
								mapObj.tileFlippedHorizontally = !mapObj.tileFlippedHorizontally;
							if(flags & Tile.FlippedVertically)
								mapObj.tileFlippedVertically = !mapObj.tileFlippedVertically;
						}
						
					}
				}
			} else if(curLayer.isGroupLayer || curLayer.isTileMap) {
				let numLayers = curLayer.layerCount;
				for(let layerID = 0; layerID < numLayers; layerID++) {
					replaceTileInLayer(curLayer.layerAt(layerID));
				}
			}
		}

		replaceTileInLayer(this.map);
		if(isPreview)
			this.preview = preview;
	}, //replaceTile

	showPreview: function() {
		if(!this.map || this.map.selectedLayers.length < 1) return;
		
		this.preparePreview();
		
		//Get the tile to replace:
		var selectedLayer = this.map.selectedLayers[0];
		if(!selectedLayer || !selectedLayer.isTileLayer) return;
		var originalTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
		
		//Get the flags:
		var flags = 0;
		var brush = tiled.mapEditor.currentBrush;
		if(brush && brush.width == 1 && brush.height == 1 && brush.layerCount > 0) {
			flags = brush.layerAt(0).flagsAt(0,0);
		}
		
		this.replaceTile(originalTile, this.selectedTile, flags, true);
	},
	
	preparePreview: function() {
		var preview = new TileMap();
		preview.setSize(this.map.width, this.map.height);
		preview.setTileSize(this.map.tileWidth, this.map.tileHeight);
		preview.infinite = this.map.infinite;
		this.preview = preview;
	}
});
