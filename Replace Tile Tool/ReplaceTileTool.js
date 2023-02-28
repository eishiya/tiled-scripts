/*	Replace Tile Tool by eishiya, last updated 28 Feb 2023

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
	
	Please note that in versions of Tiled before 1.8, only the bounding box
	of selections is visible to scripts, so complex selections will not act
	as you might expect.
	
	If you need to replace a large number of tiles and/or replace tiles across
	many maps, see the Mass Replace Tiles script:
	https://github.com/eishiya/tiled-scripts/blob/main/MassReplaceTiles.js
*/

var tool = tiled.registerTool("ReplaceTile", {
	name: "Replace Tile",
	icon: "ReplaceTile.png",
	usesSelectedTiles: true,
	targetLayerType: Layer.TileLayerType, //| Layer.ObjectGroupType,
	 
	replaceAll: false,
	isActive: false,
	replaceObjects: false,
	
	//lastMouseCoordinates: {x: 0, y: 0},

	activated: function() {
		this.isActive = true;
	},
	
	deactivated: function() {
		this.isActive = false;
	},

	/*mouseMoved: function(x, y, modifiers) {
		this.lastMouseCoordinates.x = x;
		this.lastMouseCoordinates.y = y;
	},*/

	mousePressed: function (button, x, y, modifiers) {
		//this.lastMouseCoordinates.x = x;
		//this.lastMouseCoordinates.y = y;
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
					
					//TODO: Move this and maybe the tileAt stuff into a separate function, since both this and showPreview need access to getting the current tile
					//find the most valid Tile Object under the cursor:
					//TODO: Respect object render order. No access to it in the scripting API currently.
					for(let objIndex = 0; objIndex < selectedLayer.objectCount; ++objIndex) {
						let obj = selectedLayer.objectAt(objIndex);
						if(!obj.tile) continue;
						
						//Top left bounds:
						let objRect = {x: obj.x, y: obj.y, width: obj.width, height: obj.height};
						
						let originX = obj.x, originY = obj.y;
						let origin = obj.tile.tileset.objectAlignment;
						switch(origin) {
							case Tileset.Top:
								originX += obj.width/2;
								//originY += 0;
								
								objRect.x -= obj.width/2;
								break;
							case Tileset.TopRight:
								originX += obj.width;
								//originY += 0;
								
								objRect.x -= obj.width;
								break;
							case Tileset.Left:
								//originX += 0;
								originY += obj.height/2;
								
								objRect.y -= obj.height/2;
								break;
							case Tileset.Center:
								originX += obj.width/2;
								originY += obj.height/2;
								
								objRect.x -= obj.width/2;
								objRect.y -= obj.
								break;
							case Tileset.Right:
								originX += obj.width;
								originY += obj.height/2;
								break;
							case Tileset.BottomLeft:
								//originX += 0;
								originY += obj.height;
								break;
							case Tileset.Bottom:
								originX += obj.width/2;
								originY += obj.height;
								break;
							case Tileset.BottomRight:
								originX += obj.width;
								originY += obj.height;
								break;
							case Tileset.Unspecified:
								if(this.map.orientation == TileMap.Isometric) { //Bottom alignment
									originX += obj.width/2;
									originY += obj.height;
								} else { //bottom left alignment
									originY += obj.height;
								}
									
								break;
							default:
								; //top left
						}
						
						//Bounds, min and max:
						let bounds = {minx: objRect.x, miny: objRect.y, maxx: objRect.x + objRect.width, maxy: objRect.y + objRect.height};
						
						//Update the bounding box if the object is rotated.
						if(obj.rotation != 0) {
							let angle = obj.rotation;
							angle = Math.PI / 180 * (-angle + 180); //convert to radians
							
							let topLeftX = obj.x, topLeftY = obj.y;
							let botRightX = obj.x + obj.width, botRightY = obj.y + obj.height;
							let topRightX = botRightX, topRightY = topLeftY;
							let botLeftX = topLeftX, botLeftY = botRightY;
							
							//Transform all four corners of the boundingBox:
							let topLeftX_2 = originX + (topLeftX-originX)*Math.cos(angle) + (topLeftY-originY)*Math.sin(angle);
							let topLeftY_2 = originY - (topLeftX-originX)*Math.sin(angle) + (topLeftY-originY)*Math.cos(angle);
							
							let topRightX_2 = originX + (topRightX-originX)*Math.cos(angle) + (topRightY-originY)*Math.sin(angle);
							let topRightY_2 = originY - (topRightX-originX)*Math.sin(angle) + (topRightY-originY)*Math.cos(angle);
							
							let botLeftX_2 = originX + (botLeftX-originX)*Math.cos(angle) + (botLeftY-originY)*Math.sin(angle);
							let botLeftY_2 = originY - (botLeftX-originX)*Math.sin(angle) + (botLeftY-originY)*Math.cos(angle);
							
							let botRightX_2 = originX + (botRightX-originX)*Math.cos(angle) + (botRightY-originY)*Math.sin(angle);
							let botRightY_2 = originY - (botRightX-originX)*Math.sin(angle) + (botRightY-originY)*Math.cos(angle);
							
							bounds.minx = Math.min(topLeftX_2, topRightX_2, botLeftX_2, botRightX_2);
							bounds.miny = Math.min(topLeftY_2, topRightY_2, botLeftY_2, botRightY_2);
							bounds.maxx = Math.max(topLeftX_2, topRightX_2, botLeftX_2, botRightX_2);
							bounds.maxy = Math.max(topLeftY_2, topRightY_2, botLeftY_2, botRightY_2);
						}
						
						if(x >= bounds.minx && x < bounds.maxx && y >= bounds.miny && y < bounds.maxy) {
							originalTile = obj.tile;
							tiled.log("Hit "+obj.name + "! Bounds: "+bounds.minx+", "+bounds.miny+" to "+bounds.maxx+", "+bounds.maxy);
						}
						//Keep cycling, so we get the top-most object (= manual render ordering)
					}
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
					//this.statusInfo = Math.floor(this.lastMouseCoordinates.x) + ", "+Math.floor(this.lastMouseCoordinates.y) + " Replace Tile preview not available for Object Layers.";
					this.statusInfo = "Targeting Objects for tile replacement is not currently supported, please switch to a Tile Layer.";
				} else {
					//this.statusInfo = "The selected layer is not a Tile Layer or Object Layer.";
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

					let region = tempThis.map.selectedArea.get();
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
						if(!tempThis.replaceAll && !mapObj.selected && tempThis.selectedObjects.length > 0) continue; //if an object isn't selected but other objects are, skip it (except when doing replaceAll, of course)
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
