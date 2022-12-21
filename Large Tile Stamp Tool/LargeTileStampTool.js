/*	Large Tile Stamp Tool by eishiya, last updated 21 Dec 2022

	Adds a tool to your Map Toolbar that works similarly to the Stamp Brush,
	but will skip over cells in the map to avoid overlapping large tiles,
	allowing you to paint with large brushes as if you were painting on a map
	with a larger grid.
	
	It uses the largest width and height among the tiles of your brush
	to determine how many cells to skip over.
	If the tiles all fit within the grid, then no cells will be skipped.
	
	Works best when your tiles are an exact multiple of your grid size
	(e.g. 48x48 tiles on a 16x16 grid), and the tiles in the brush are all
	the same size. Otherwise, there will be gaps between tiles.
	
	You can right-click with this tool to sample the underlying tile.
	When you click a cell with a tile in it, it'll sample that tile.
	If you click an empty cell, it'll look for an overlapping large tile of the
	last used large tile size. If even this results in an empty cell,
	**it will reset the last "seen" tile size to 1x1 cell**, which will mean
	subsequent sampling will require clicking a non-empty cell.
	So, try to avoid sampling empty or small tiles with this tool.
	
	This tool does NOT support Tile Stamp variations, as those are not
	exposed to the scripting API.
	
	TODO: Line mode with Shift. There's skeleton code for it already, just
	no actual line implementation.
*/

var tool = tiled.registerTool("LargeTileStampTool", {
	alignToTopLeft: true, //Should large tiles be offset such that they behave as if they have top left alignment?
	
	name: "Large Tile Stamp Tool",
	icon: "LargeTileStamp.png",
	usesSelectedTiles: true,
	mouseDown: false,
	
	lineMode: false, //Controlled via Shift modifier
	lineStart: {x: -1, y: -1},
	
	tileStep: {x: 1, y: 1}, //How many cells does each large tile occupy?
	stampSize: {width: 0, height: 0}, //How many cells does the stamp cover?

	activated: function() {
		this.isActive = true;
	},
	
	deactivated: function() {
		this.isActive = false;
	},
	
	mouseReleased: function (button, x, y, modifiers) {
		if(button == 1) { //left
			this.mouseDown = false;
			if(this.lineMode) { //commit line mode on release
				if(!this.map || !this.preview) return;
				this.map.merge(this.preview);
			}
		}
	},

	mousePressed: function (button, x, y, modifiers) {
		if(this.isActive) {
			if(button == 1) { //left-click, commit the preview
				if(!this.map || !this.preview) return;
				this.map.merge(this.preview);
				this.mouseDown = true;
				if(this.lineMode) {
					this.lineStart.x = this.tilePosition.x;
					this.lineStart.y = this.tilePosition.y;
				}
			} else if(button == 2) { //right-click, sample the tile on the selected layer
				if(!this.map || this.map.selectedLayers.length < 1) return;
				let selectedLayer = this.map.selectedLayers[0];
				if(!selectedLayer || !selectedLayer.isTileLayer) return;
				let newTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
				let newBrush = new TileMap();
				newBrush.width = 1;
				newBrush.height = 1;
				let newLayer = new TileLayer();
				newBrush.addLayer(newLayer);
				let layerEdit = newLayer.edit();
				if(newTile) {
					layerEdit.setTile(0,0, newTile, selectedLayer.flagsAt(this.tilePosition.x, this.tilePosition.y));
				} else {
					//Try sampling the nearest tile based on the last measured stamp dimensions:
					let sampleX = Math.floor(this.tilePosition.x / this.tileStep.x) * this.tileStep.x;
					let sampleY = Math.floor(this.tilePosition.y / this.tileStep.y) * this.tileStep.y;
					if(this.alignToTopLeft)
						sampleY += (this.tileStep.y - 1);
					newTile = selectedLayer.tileAt(sampleX, sampleY);
					layerEdit.setTile(0,0, newTile, selectedLayer.flagsAt(sampleX, sampleY));
				}
				layerEdit.apply();
				tiled.mapEditor.currentBrush = newBrush;
				this.showPreview();
			}
		}
	},
	
	tilePositionChanged: function () {
		if(this.isActive) {
			this.showPreview();
			if(this.mouseDown && !this.lineMode) { //Don't commit immediately in line mode
				if(!this.map || !this.preview) return;
				this.map.merge(this.preview, true);
			}
		}
	},
	
	modifiersChanged: function(modifiers) {
		if(this.isActive) {
			if(modifiers & Qt.ShiftModifier)
				this.lineMode = true;
			else
				this.lineMode = false;
			//this.showPreview();
		}
	},

	measureStamp: function(stamp) {
		this.stampSize.width = stamp.width;
		this.stampSize.height = stamp.height;
		
		let cellSize = {x: this.map.tileWidth, y: this.map.tileHeight};
		let tileSize = {x: cellSize.x, y: cellSize.y}; //Don't worry about tiles smaller than the cell size
		//Iterate every tile in the stamp and get the max width and height (in tiles):
		function checkLayer(layer) {
			if(!layer) return;
			if(layer.isTileLayer) {
				//Iterate every tile and compare to tileSize:
				for(rect of layer.region().rects) {
					for(x = rect.x; x < rect.x + rect.width; x++) {
						for(y = rect.y; y < rect.y + rect.height; y++) {
							let tile = layer.tileAt(x, y);
							if(tile) {
								if(tile.width > tileSize.x)
									tileSize.x = tile.width;
								if(tile.height > tileSize.y)
									tileSize.y = tile.height;
							}
						}
					}
				}
			} else if(layer.isGroupLayer || layer.isTileMap) {
				//process its child layers recursively:
				for(let gi = 0; gi < layer.layerCount; ++gi) {
					checkLayer(layer.layerAt(gi));
				}
			}
		}
		checkLayer(stamp);
		//Now we know the max size of the tiles in the stamp, and the cell size of the current map,
		//so we can calculate the tileStep and total stampSize
		this.tileStep.x = Math.ceil(tileSize.x / cellSize.x);
		this.tileStep.y = Math.ceil(tileSize.y / cellSize.y);
		this.stampSize.x = this.tileStep.x * stamp.width;
		this.stampSize.y = this.tileStep.y * stamp.height;
	},
	
	drawStamp: function(x, y, stamp, map) {
		//Calculate the top left corner of the stamp's location in the map, taking into account where it can and can't start:
		let offset = {
			x: Math.round((x - Math.floor(this.stampSize.x/2)) / this.tileStep.x) * this.tileStep.x,
			y: Math.round((y - Math.floor(this.stampSize.y/2)) / this.tileStep.y) * this.tileStep.y
		};
		if(this.alignToTopLeft) {
			offset.y += (this.tileStep.y - 1);
		}
		//map already has all the tile layers from the stamp in order, so we can just reuse them
		//This reuse allows line mode to work: line mode just does drawStamp repeatedly on the same preview
		let layerIndex = 0;
		let tempThis = this;
		function stampLayer(layer) {
			if(!layer) return;
			if(layer.isTileLayer) {
				let targetLayer = map.layerAt(layerIndex);
				let targetEdit = targetLayer.edit();
				for(rect of layer.region().rects) {
					for(sx = rect.x; sx < rect.x + rect.width; sx++) {
						for(sy = rect.y; sy < rect.y + rect.height; sy++) {
							let tile = layer.tileAt(sx, sy);
							if(tile) {
								//Draw this tile in the preview
								targetEdit.setTile(offset.x + sx*(tempThis.tileStep.x), offset.y + sy*(tempThis.tileStep.y), tile, layer.flagsAt(sx, sy));
							}
						}
					}
				}
				targetEdit.apply();
				layerIndex++;
			} else if(layer.isGroupLayer || layer.isTileMap) {
				//process its child layers recursively:
				for(let gi = 0; gi < layer.layerCount; ++gi) {
					stampLayer(layer.layerAt(gi));
				}
			}
		}
		stampLayer(stamp);
		
	}, //drawStamp

	showPreview: function() {
		if(!this.map || this.map.selectedLayers.length < 1) return;
		
		this.preparePreview();
		let stamp =  tiled.mapEditor.currentBrush;
		this.measureStamp(stamp); //set the step and stamp size
		
		let destinationMap = this.preview;
		if(this.lineMode) {
			//Draw a line between the starting position and the current position
			//TODO: Line mode!
			/*drawStamp already takes care of all the nitty-gritty, so all that's needed is:
				1. Calculate a line in terms of tileStep (that's our "pixel size") and stamp.width, swamp.height (our line segment size in "pixels")
					The line starts at this.lineStart and ends at this.tilePosition, both of these are set already. These are regular cell coordinates.
				2. For each line segment, calculate the actual cell that's closest to the middle of it
				3. drawStamp at that cell. It'll take care of aligning the stamp and its tiles to the supergrid.
			*/
		} else {
			this.drawStamp(this.tilePosition.x, this.tilePosition.y, stamp, destinationMap);
		}
		this.preview = destinationMap;
	},
	
	preparePreview: function() {
		var preview = new TileMap();
		preview.setSize(this.map.width, this.map.height);
		preview.setTileSize(this.map.tileWidth, this.map.tileHeight);
		preview.infinite = this.map.infinite;
		//Prepare layers:
		function addLayer(layer) {
			if(!layer) return;
			if(layer.isTileLayer) {
				let newLayer = new TileLayer(layer.name);
				preview.addLayer(newLayer);
			} else if(layer.isGroupLayer || layer.isTileMap) {
				//process its child layers recursively:
				for(let gi = 0; gi < layer.layerCount; ++gi) {
					addLayer(layer.layerAt(gi));
				}
			}
		}
		addLayer(tiled.mapEditor.currentBrush);
		this.preview = preview;
	}
});
