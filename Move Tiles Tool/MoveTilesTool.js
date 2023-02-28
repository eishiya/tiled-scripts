/*	Move Tiles Tool by eishiya, last updated 28 Feb 2023

	Adds a tool to your Map Toolbar that allows you to move selected tiles
	relative to their original position using the mouse or the keyboard,
	without requiring you to cut+paste the tiles, which can be more work when
	you just need to move some tiles over a little bit.
	
	Click+drag to start moving. Click quickly to commit. Right click to
	cancel and return the moved tiles to their original position (but see
	the multiple layers caveat below).
	
	If no tiles are selected, the tile underneath the cursor position at first
	click will be moved. Otherwise, tiles within the selection will be moved.
	Due to limitations of Tiled's scripting API, non-rectangular selections will
	not behave as you might expect, all tiles within the *bounding box* of
	the selection will be moved.
	
	The arrow keys will only move the tiles if there are tiles selected, or
	if a preview was already generated by a mouse click.
	
	This tool can work with multiple layers selected at once, but make sure
	that every tile layer in the map has a unique name, as Tiled uses layer
	names when deciding which tiles go where.
	
	If you hold Ctrl or Alt when just starting to move the tiles, the tiles
	will be Copied instead of Cut.
	
	You can also use the keyboard to commit (Enter/Return) and cancel (Esc).
	
	Please note that this tool creates more Undo entries than a native tool
	would, at least in Cut mode. Cutting out the tiles creates an Undo entry
	for each affected layer. Cancelling creates an additional Undo entry when
	the tiles are merged back into the map.
	
	In versions of Tiled before 1.8, only the bounding box of selections is
	visible to scripts, so complex selections will not act as you might expect.
*/

var tool = tiled.registerTool("MoveTiles", {
	name: "Move Tiles",
	icon: "MoveTilesTool.png",
	
	longClickTime: 300, //time, in ms, for a click to count as a drag. Clicks shorter than this will commit the changes.
	//Note: Any click that crosses a tile boundary counts as a drag and will not commit the changes, regardless of length.
	
	targetLayerType: Layer.TileLayerType,
	
	isDragging: false, //true if we're dragging.
	mouseHeld: false,
	tilesChosen: false,
	clickStartTime: 0,
	lastPosition: {x: 0, y: 0}, //last position of the *cursor* on the map, this is compared against this.tilePosition
	currentPosition: {x: 0, y: 0}, //current position of the *brush* on the map, used to place the preview
	sourcePosition: {x: 0, y: 0}, //original position from which the brush was sampled
	brush: null,
	//Cut mode currently doesn't work because of silliness in the Tiled scripting API. It can be made to work, but would make buildBrush() more complicated.
	cutTiles: true, //if true, delete tiles in original selection after creating the brush
	tilesWereCut: false,
	
	deactivated: function() {
		this.returnCutTiles();
		this.resetTool();
	},

	mousePressed: function (button, x, y, modifiers) {
		if(button == 1) { //left-click, perform the replace
			this.clickStartTime = Date.now();
			this.lastPosition.x = this.tilePosition.x;
			this.lastPosition.y = this.tilePosition.y;
			this.mouseHeld = true;
			
			if(this.tilesChosen) {
				this.isDragging = false;
			} else {
				this.isDragging = true;
				this.buildBrush(false);
				this.moveTiles(this.currentPosition.x, this.currentPosition.y); //show the preview
			}
		} else if(button == 2) { //right-click, cancel
			this.returnCutTiles();
			this.resetTool();
		}
	},
	
	mouseReleased: function(button, x, y, modifiers) {
		if(Date.now() - this.clickStartTime >= this.longClickTime)
			this.isDragging = true;
		
		if(button == 1) {
			this.mouseHeld = false;
			
			if(!this.isDragging) {
				//Commit the move:
				if(!this.map || !this.preview) return;
				this.map.merge(this.preview);
				//Prepare for the next use:
				this.resetTool();
			}
		}
	},
	
	tilePositionChanged: function () {
		if(!this.mouseHeld) return;
		this.isDragging = true;
		this.moveTiles(this.currentPosition.x + this.tilePosition.x - this.lastPosition.x, this.currentPosition.y + this.tilePosition.y - this.lastPosition.y);
		
		//Update last known position:
		this.lastPosition.x = this.tilePosition.x;
		this.lastPosition.y = this.tilePosition.y;
	},
	
	keyPressed: function(key, modifiers) {
		if(!this.tilesChosen) {
			this.buildBrush(true);
		}
		let distance = 1;
		if(modifiers & Qt.ShiftModifier) {
			distance = 10; //TODO: Get and use the major grid sizes when those become available
		}
		switch(key) {
			case Qt.Key_Down:
				this.moveTiles(this.currentPosition.x, this.currentPosition.y+distance);
				break;
			case Qt.Key_Left:
				this.moveTiles(this.currentPosition.x-distance, this.currentPosition.y);
				break;
			case Qt.Key_Up:
				this.moveTiles(this.currentPosition.x, this.currentPosition.y-distance);
				break;
			case Qt.Key_Right:
				this.moveTiles(this.currentPosition.x+distance, this.currentPosition.y);
				break;
			case Qt.Key_Enter:
			case Qt.Key_Return:
				//Commit the move:
				if(!this.map || !this.preview) return;
				this.map.merge(this.preview);
				//Prepare for the next use:
				this.resetTool();
				break;
			case Qt.Key_Escape:
				this.returnCutTiles();
				this.resetTool();
				break;
		}
	},
	
	modifiersChanged: function(modifiers) {
		if(modifiers & Qt.ControlModifier || modifiers & Qt.AltModifier)
			this.cutTiles = false;
		else
			this.cutTiles = true;
	},
	
	updateStatusInfo: function () {
		if(!this.map || this.map.selectedLayers.length < 1) {
			this.statusInfo = "Move Tiles Tool has no map or selected layers, so it cannot move anything.";
			return;
		}
		if(this.tilesChosen) {
			this.statusInfo = "Moving tiles " + (this.currentPosition.x - this.sourcePosition.x) + ", " + (this.currentPosition.y - this.sourcePosition.y) + " from their original position.";
		} else {
			this.statusInfo = this.tilePosition.x + ", " + this.tilePosition.y;
		}
	},
	
	//Copies the currently selected tiles to this.brush
	buildBrush: function(keyboardMode) {
		if(!this.map) return;
		if(this.map.selectedLayers.length < 1) return;
		
		let region = null;
		
		if(this.map.selectedArea) {
			let selectedRegion = this.map.selectedArea.get();
			region = {boundingRect: {x: 0, y: 0, width: 0, height: 0}};
			
			region.boundingRect.x = selectedRegion.boundingRect.x;
			region.boundingRect.y = selectedRegion.boundingRect.y;
			region.boundingRect.width = selectedRegion.boundingRect.width;
			region.boundingRect.height = selectedRegion.boundingRect.height;
			
			if(region.boundingRect.width * region.boundingRect.height == 0) {
				region = null;
			} else {
				if(selectedRegion.rects) {
					let rects = selectedRegion.rects;
					region.rects = [];
					for(let r = 0; r < rects.length; ++r) {
						let rect = rects[r];
						region.rects.push({x: rect.x, y: rect.y, width: rect.width, height: rect.height}); //make extra sure it's a copy and not a reference
					}
				} else {
					region.rects = [region.boundingRect];
				}
			}
			//Clear the selection, so that merge works correctly:
			this.map.selectedArea.set(Qt.rect(0,0,0,0));
		}
		
		if(!region && !keyboardMode) {
			region = {boundingRect: {x: this.tilePosition.x, y: this.tilePosition.y, width: 1, height: 1}};
			region.rects = [region.boundingRect];
		}
		
		if(!region) return;
		
		this.brush = new TileMap();		
		this.brush.setSize(region.boundingRect.width, region.boundingRect.height);
		this.brush.setTileSize(this.map.tileWidth, this.map.tileHeight);
		
		this.currentPosition.x = region.boundingRect.x;
		this.currentPosition.y = region.boundingRect.y;
		
		this.sourcePosition.x = region.boundingRect.x;
		this.sourcePosition.y = region.boundingRect.y;
		
		if(this.cutTiles) this.tilesWereCut = true;
		
		//Add layers to the brush, and populate them:
		if(this.addLayerToBrush(this.map, region) > 0) {
			this.tilesChosen = true;
		}
	},
	
	//Recursively adds this layer and its children to the brush, when appropriate
	addLayerToBrush: function(curLayer, region, overrideSelected) {
		if(!curLayer) return 0;
		let brushTilesPlaced = 0;
		if(curLayer.isTileLayer) {
			if(this.map.selectedLayers.indexOf(curLayer) < 0) return 0; //ignore layers that aren't selected
			let newLayer = new TileLayer();
			newLayer.name = curLayer.name;
			newLayer.offset = curLayer.offset;
			newLayer.opacity = curLayer.opacity;
			
			let originalLayerEdit = null;
			if(this.cutTiles) originalLayerEdit = curLayer.edit();
			
			let boundsX = region.boundingRect.x;
			let boundsY = region.boundingRect.y;
			
			let layerEdit = newLayer.edit();
			for(let r = 0; r < region.rects.length; ++r) {
				let rect = region.rects[r];
				for(let x = 0; x < rect.width; ++x) {
					for(let y = 0; y < rect.height; ++y) {
						let tile = curLayer.tileAt(x+rect.x, y+rect.y);
						if(tile) {
							layerEdit.setTile( x + rect.x - boundsX, y + rect.y - boundsY, curLayer.tileAt(x+rect.x, y+rect.y), curLayer.flagsAt(x+rect.x, y+rect.y) );
							brushTilesPlaced++;
							if(originalLayerEdit) { //erase original tile
								originalLayerEdit.setTile( x+rect.x, y+rect.y, null );
							}
						}
					}
				}
			}
			layerEdit.apply();
			if(originalLayerEdit) originalLayerEdit.apply();
			this.brush.addLayer(newLayer);
		} else if(curLayer.isGroupLayer || curLayer.isTileMap) {
			for(let gi = 0; gi < curLayer.layerCount; ++gi) {
				brushTilesPlaced += this.addLayerToBrush(curLayer.layerAt(gi), region);
			}
		}
		return brushTilesPlaced;
	},
	
	moveTiles: function(offsetX, offsetY) {
		if(this.tilesChosen == false) return;
		let preview = new TileMap();
		preview.setSize(this.map.width, this.map.height);
		preview.setTileSize(this.map.tileWidth, this.map.tileHeight);
		preview.infinite = this.map.infinite;
		
		//Copy the brush to the preview at the given offset:		
		for(let li = 0; li < this.brush.layerCount; ++li) {
			let newLayer = new TileLayer();
			let brushLayer = this.brush.layerAt(li);
			newLayer.name = brushLayer.name;
			newLayer.offset = brushLayer.offset;
			newLayer.opacity = brushLayer.opacity;
			
			let layerEdit = newLayer.edit();
			for(let x = 0; x < this.brush.width; ++x) {
				for(let y = 0; y < this.brush.height; ++y) {
					layerEdit.setTile( offsetX + x, offsetY + y, brushLayer.tileAt(x, y), brushLayer.flagsAt(x, y) );
				}
			}
			layerEdit.apply();
			
			preview.addLayer(newLayer);
		}
		
		this.currentPosition.x = offsetX;
		this.currentPosition.y = offsetY;
		
		this.preview = preview;
	},
	
	//Reset the tool's state to prepare for the next use:
	resetTool: function() {
		this.isDragging = false;
		this.tilesChosen = false;
		this.preview = new TileMap(); //clear preview
		this.brush = null;
		this.mouseHeld = false;
		this.tilesWereCut = false;
	},
	
	//Places the brush at its original location. Used when cancelling a move.
	returnCutTiles: function() {
		if(this.tilesWereCut) {
			this.moveTiles(this.sourcePosition.x, this.sourcePosition.y);
			if(!this.map || !this.preview) return;
				this.map.merge(this.preview);
		}
		this.tilesWereCut = false;
	}
});
