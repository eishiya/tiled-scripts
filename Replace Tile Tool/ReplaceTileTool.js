/*	Replace Tile Tool by eishiya, last updated Sep 2021
	Adds a tool to your Map Toolbar that aids in replacing Tiles.
	
	It can do three things:
	- Left click: Replaces the tile you clicked on with your current tile in
		all selected, unlocked layers.
	- (any modifier) + left click: Replaces the tile you clicked on with your
		current layers in ALL layers, including unselected and locked layers.
		Useful for mass replace.
	- Right click: Sample the clicked tile, useful to choose a tile to replace
		others with.
	
	When replacing tiles, the original tile's rotation/flip flags are reconciled
	(XOR) with the new tile's. This means that if you replace a tile with
	a horizontally flipped version of itself, all instances of that tile will be
	flipped horizontally, so already flipped tiles will be un-flipped.
	If you just want to replace all instances of a tile without modifying their
	flips, make sure your new tile is completely unflipped and unrotated.
	
	It is recommended to include the ReplaceTile.png icon with this script,
	so that the tool shows up with that icon, instead of a big text button.
*/

var tool = tiled.registerTool("ReplaceTile", {
	name: "Replace Tile",
	icon: "ReplaceTile.png",
	
	replaceAll: false, //should all instances of the tile be replaced, or only those on selected layers?
	isActive: false,
	
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
				
				//Until merging is improved, redo the whole tile-replacement logic when committing:
				if(!this.map || this.map.selectedLayers.length < 1) return;
				
				//Get the tile to replace:
				var selectedLayer = this.map.selectedLayers[0];
				if(!selectedLayer || !selectedLayer.isTileLayer) return;
				var originalTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
				
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
			if(modifiers > 0) this.replaceAll = true;
			else this.replaceAll = false;
			
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
				var selectedLayer = this.map.selectedLayers[0];
				if(!selectedLayer) {
					this.statusInfo = "No layer selected (probably a Tiled glitch, just move your cursor to try again).";
				} else if(selectedLayer.isTileLayer) {
					var originalTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
					this.statusInfo = this.tilePosition.x + ", " + this.tilePosition.y + " [" + (originalTile? originalTile.id : "empty") + " → "+this.selectedTile.id + "]";
				} else {
					this.statusInfo = "The selected layer is not a Tile Layer.";
				}
			}
		}
	},
	
	replaceTile: function(oldTile, newTile, flags, isPreview) {
		if(!this.map) return;
		
		var preview = this.preview;
		var startX = 0, endX = this.map.width;
		var startY = 0, endY = this.map.height;
		if(this.map.selectedArea && this.map.selectedArea.boundingRect.width > 0 && this.map.selectedArea.boundingRect.height > 0) {
			startX = this.map.selectedArea.boundingRect.x;
			endX = startX + this.map.selectedArea.boundingRect.width;
			startY = this.map.selectedArea.boundingRect.y;
			endY = startY + this.map.selectedArea.boundingRect.height;
		}
		//Iterate over all the layers and tiles to replace:
		var numLayers = this.map.layerCount;
		for(var layerID = 0; layerID < numLayers; layerID++) {
			var curLayer = this.map.layerAt(layerID);
			if(curLayer.isTileLayer) {
				if(isPreview) {
					newLayer = new TileLayer();
					newLayer.name = curLayer.name;
					newLayer.visible = curLayer.visible;
					newLayer.resize(curLayer.size);
				}
				if(this.replaceAll || (!curLayer.locked && this.map.selectedLayers.indexOf(curLayer) >= 0) ) {
					if(isPreview)
						layerEdit = newLayer.edit();
					else
						layerEdit = curLayer.edit();
					for(var x = startX; x < endX && x < curLayer.width; x++) {
						for(var y = startY; y < endY && y < curLayer.height; y++) {
							if(oldTile == curLayer.tileAt(x, y)) {
								layerEdit.setTile(x, y, newTile, curLayer.flagsAt(x, y) ^ flags);
							}
						}
					}
					layerEdit.apply();
				}
				if(isPreview) preview.addLayer(newLayer);
			}
		}
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
		this.preview = preview;
	}
});