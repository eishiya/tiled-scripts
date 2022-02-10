/*	Terrain Rectangle Tool by eishiya, last updated 10 Feb 2022
	Adds a tool to your Map Toolbar that draws rectangles and uses terrains
	to decide which tiles to place.
	
	If you have no terrain selected or you're using a version of Tiled older
	than 1.8, the tool will attempt to get a terrain from your current selected
	tile(s):
	If multiple tiles are selected, the first is used.
	If the tile has labels in multiple Terrain Sets,
		the first Terrain Set is used.
	If the tile has labels of multiple Terrains, the first non-empty Terrain
		is used, checking clockwise from Top. TerrainSet type is ignored during
		this check, so a disabled edge or corner Terrain may be used.
	For the best results, use the Terrains panel to select your terrain, using
	Tiled 1.8 or newer.
	
	To paint a Terrain Rectangle, click and drag, just like the Rectangle
	Shape Tool.
	
	By default, this tool will try to match the edges of the rectangle to
	the terrains already in the layer. If you want to place tiles without
	regard for the existing tiles, hold any modifier key while using the tool.
	
	If you right click, you will sample the clicked tile. This makes it easier
	to pick tiles without being forced into the Stamp Brush Tool.
	
	Unlike the built-in Terrains feature, this tool does not attempt to modify
	surrounding tiles to ensure a match. If this tool can't find a perfectly
	matching tile, it will not place a tile*.
	
	* The tool starts off by filling the rectangle with the filled tile of
	the chosen terrain before replacing the edges with the appropriate tiles,
	so if that tile is present but some others are not, the filled tiles will
	remain.
	
	It is recommended to include the TerrainRectangle.png icon with this script,
	so that the tool shows up with that icon, instead of a big text button.
*/

var terrainRectangleTool = tiled.registerTool("TerrainRectangle", {
	name: "Terrain Rectangle Tool",
	icon: "TerrainRectangle.png",
	usesWangSets: true,
	
	ignoreSurroundings: false, //should the edges be placed as if all surround tiles are empty?
	
	startPoint: false,
	endPoint: false,
	currentTerrain: -1,
	currentTerrainSet: null,
	rectangle: {x: 0, y: 0, width: 0, height: 0},
	candidateTiles: [],
	paintStyle: null, //Mixed terrains may behave as any of the three types depending on their labels
	
	activated: function() {
		this.getTerrain();
	},

	mousePressed: function (button, x, y, modifiers) {
		if(button == 1) { //left-click, start the rectangle
			if(this.currentTerrain < 0) return;
			this.startPoint = {x: this.tilePosition.x, y: this.tilePosition.y};
			this.endPoint = {x: this.tilePosition.x, y: this.tilePosition.y};
			this.showPreview();
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
			this.getTerrain();
		}
	},
	
	mouseReleased: function (button, x, y, modifiers) {
		if(button == 1 && this.currentTerrain > -1) { //left-click, finish the rectangle
			if(!this.map || !this.preview) return;
			this.map.merge(this.preview);
			this.startPoint = false;
			this.endPoint = false;
			this.rectangle.width = 0;
			this.rectangle.height = 0;
			this.preparePreview(); //reset preview
		}
	},
	
	tilePositionChanged: function () {
		if(this.startPoint) {
			this.endPoint = {x: this.tilePosition.x, y: this.tilePosition.y};
			this.showPreview();
		}
	},
	
	modifiersChanged: function(modifiers) {
		if(modifiers > 0) this.ignoreSurroundings = true;
		else this.ignoreSurroundings = false;
		
		this.showPreview();
	},
	
	mapChanged: function(oldMap, newMap) {
		this.getTerrain();
		this.startPoint = false;
		this.endPoint = false;
		this.rectangle.width = 0;
		this.rectangle.height = 0;
		this.preparePreview();
	},
	
	updateStatusInfo: function () {
		if(!this.map || this.map.selectedLayers.length < 1) {
			this.statusInfo = "Terrain Rectangle Tool has no map or selected layers, so it cannot draw anything.";
			return;
		}
		if(this.currentTerrain < 0) {
			this.statusInfo = "No terrain selected.";
		} else {
			var selectedLayer = this.map.selectedLayers[0];
			if(!selectedLayer) {
				this.statusInfo = "No layer selected (probably a Tiled glitch, just move your cursor to try again).";
			} else if(selectedLayer.isTileLayer) {
				if(this.rectangle.width > 0 && this.currentTerrain > 0) {
					this.statusInfo = this.tilePosition.x + ", " + this.tilePosition.y + " [" + this.rectangle.width + "x" + this.rectangle.height + " using Terrain \""+this.currentTerrainSet.colorName(this.currentTerrain)+"\" from Terrain Set \""+this.currentTerrainSet.name+"\"]";
				} else {
					let originalTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
					if(this.currentTerrain > 0 && this.currentTerrainSet)
						 this.statusInfo = this.tilePosition.x + ", " + this.tilePosition.y + " [" + (originalTile? originalTile.id : "empty") + "] [Using Terrain \""+this.currentTerrainSet.colorName(this.currentTerrain)+"\" from Terrain Set \""+this.currentTerrainSet.name+"\"]";
					else
						this.statusInfo = this.tilePosition.x + ", " + this.tilePosition.y + " [" + (originalTile? originalTile.id : "empty") + "]";
				}
			} else {
				this.statusInfo = "The selected layer is not a Tile Layer.";
			}
		}
	},
	
	getTerrain: function() {
		//Get the terrain to use based on the selected tile.
		let oldTerrain = this.currentTerrain;
		let oldTerrainSet = this.currentTerrainSet;
		
		this.currentTerrainSet = tiled.mapEditor.currentWangSet;
		if(this.currentTerrainSet == null)
			this.currentTerrain = -1;
		else this.currentTerrain = tiled.mapEditor.currentWangColorIndex;
		
		if(this.currentTerrainSet && this.currentTerrain > 0) {
			if(this.currentTerrainSet != oldTerrainSet || this.currentTerrain != oldTerrain)
				this.getCandidateTiles(this.currentTerrainSet);
			return;
		}
		
		//If no Terrain is selected or if the API isn't supported, try to get a terrain from the selected tile:
		let tilesetsView = tiled.mapEditor.tilesetsView;
		if(tilesetsView.selectedTiles.length < 0) {
			this.getCandidateTiles(null);
			return;
		}
		let tile = tilesetsView.selectedTiles[0];
		if(!tile) return;
		let tileset = tile.tileset;
		
		//Iterate over the WangSets in the tileset to find one that contains this tile:
		for(let wsi = 0; wsi < tileset.wangSets.length; ++wsi) {
			let wangSet = tileset.wangSets[wsi];
			let wangId = wangSet.wangId(tile);
			if(wangId) {
				//Find the first non-empty label and use that:
				for(let idi = 0; idi < wangId.length; ++idi) {
					let wangColor = wangId[idi];
					if(wangColor > 0) {
						this.currentTerrain = wangColor;
						this.currentTerrainSet = wangSet;
						if(this.currentTerrainSet != oldTerrainSet || this.currentTerrain != oldTerrain)
							this.getCandidateTiles(this.currentTerrainSet);
						return;
					}
				}
			}
		}
	},
	
	getTerrainCallback: function() {
		terrainRectangleTool.getTerrain();
	},
	
	//Get a list of all tiles that have at least one corner/edge of the desired Terrain
	//Also determines how to best use a Mixed terrain set for this color.
	getCandidateTiles: function(wangSet) {
		this.candidateTiles.length = 0;
		if(!wangSet || this.currentTerrain < 0) return;
		let tileset = wangSet.tileset;
		let allTiles = tileset.tiles;
		let allTilesLength = tileset.tiles.length;
		let usesCorners = false, usesEdges = false; //Determine the usage type of Mixed terrains
		
		//Iterate all tiles in the tileset, and see which ones are in this terrain:
		for(let tilei = 0; tilei < allTilesLength; ++tilei) {
			let tile = allTiles[tilei];
			if(!tile) continue; //Shouldn't be necessary, but Tiled is weird and sometimes tile is null
			let wangId = wangSet.wangId(tile);
			if(wangId) { //also shouldn't be necessary...
				let pushed = false;
				//Check its wang colors for at least one match:
				for(let idi = 0; idi < wangId.length; ++idi) {
					let wangColor = wangId[idi];
					if(wangColor == this.currentTerrain) {
						if(idi % 2 == 0) { //even = edge
							usesEdges = true;
						} else { //odd = corner
							usesCorners = true;
						}
						if(!pushed) {
							this.candidateTiles.push(tile);
							pushed = true;
							if(wangSet.type != WangSet.Mixed) break;
						}
					}
				}
			}
		}
		if(wangSet.type == WangSet.Mixed) {
			if(usesCorners == usesEdges)
				this.paintStyle = WangSet.Mixed;
			else if(usesCorners)
				this.paintStyle = WangSet.Corner;
			else
				this.paintStyle = WangSet.Edge;
		} else
			this.paintStyle = wangSet.type;
	},
	
	getTilesByWangId: function(wangId) {
		if(!wangId || wangId.length < 8) return null;
		//Iterate through the candidate tiles and find a tile that matches what we want:
		//let type = this.currentTerrainSet.type;
		let type = this.paintStyle; //Using the calculated type allows using Mixed tilesets with partial labels
		let results = []; //results are {tile, flags}
		//Build list of allowed transformations:
		let transformations = [0];
		//TODO: Fetch the allowed transformations from the tileset when they're added to the scripting API, and build the list of possible transformations.
		
		for(let i = 0; i < this.candidateTiles.length; ++i) {
			let tile = this.candidateTiles[i];
			//TODO: Loop through the allowed transformations.
			let baseLabels = this.currentTerrainSet.wangId(tile);
			for(let ti = 0; ti < transformations.length; ++ti) {
				let tileLabels = this.transformWangId(baseLabels, transformations[ti]);
				//Decide which corners/edges to check:
				let startIndex = 0, increment = 1;
				switch(type) {
					case WangSet.Corner:
						//Check 1, 3, 5, 7
						startIndex = 1;
						increment = 2;
						break;
					case WangSet.Edge:
						//Check 0, 2, 4, 6
						increment = 2;
						break;
					default:
						increment = 1; //Mixed, check all
				}
				let valid = true;
				for(let wi = startIndex; wi < 8; wi += increment) {
					if(wangId[wi] != tileLabels[wi]) {
						valid = false;
						break;
					}
				}
				if(valid)
					results.push({tile: tile, flags: 0});
			}
		}
		
		return results;
	},
	
	//Flip the labels around according to flags.
	transformWangId: function(wangId, flags) {
		let temp;
		//wangId contents: [0: Top, 1: TopRight, 2: Right, 3: BottomRight, 4: Bottom, 5: BottomLeft, 6: Left, 7: TopLeft]
		if(flags & Tile.FlippedAntiDiagonally) {
			//swap top right and bottom left
			temp = wangId[1];
			wangId[1] = wangId[5];
			wangId[5] = temp;
			//swap top and left
			temp = wangId[0];
			wangId[0] = wangId[6];
			wangId[6] = temp;
			//swap right and bottom
			temp = wangId[2];
			wangId[2] = wangId[4];
			wangId[4] = temp;
		}
		if(flags & Tile.FlippedHorizontally) {
			//swap right and left
			temp = wangId[2];
			wangId[2] = wangId[6];
			wangId[6] = temp;
			//swap top right and top left
			temp = wangId[1];
			wangId[1] = wangId[7];
			wangId[7] = temp;
			//swap bottom right and bottom left
			
		}
		if(flags & Tile.FlippedVertically) {
			//swap top and bottom
			temp = wangId[0];
			wangId[0] = wangId[4];
			wangId[4] = temp;
			//swap top right and bottom right
			temp = wangId[1];
			wangId[1] = wangId[3];
			wangId[3] = temp;
			//swap top left and bottom left
			temp = wangId[7];
			wangId[7] = wangId[5];
			wangId[5] = temp;
		}
		return wangId;
	},
	
	//Returns a random tile from an array of tiles, taking tile probability into account
	randomFrom: function(array) {
		//Build a new array of these tiles, along with a running tally of tile probability sums:
		let probabilitySum = 0;
		let weightedArray = [];
		for(let i = 0; i < array.length; ++i) {
			let tile = array[i];
			if(tile.tile.probability > 0) {
				probabilitySum += tile.tile.probability;
				weightedArray.push({tile: tile, sum: probabilitySum});
			}
		}
		//Choose a random value between 0 and the probability sum:
		let randomRoll = Math.random() * probabilitySum;
		for(let i = 0; i < weightedArray.length; ++i) {
			if(randomRoll < weightedArray[i].sum)
				return weightedArray[i].tile;
		}
		//If we're still here, it means all the tiles had probability 0. Pick a random one:
		return array[Math.floor(Math.random()*array.length)];
	},
	
	showPreview: function() {
		this.preparePreview();
		if(!this.map || this.map.selectedLayers.length < 1 || !this.currentTerrainSet || this.currentTerrain < 0) return;
		if(!this.startPoint || !this.endPoint) return;
		
		let currentLayer = this.map.selectedLayers[0];
		if(!currentLayer.isTileLayer) return;
		
		//Calculate rectangle to affect:
		this.rectangle.x = Math.min(this.startPoint.x, this.endPoint.x);
		this.rectangle.y = Math.min(this.startPoint.y, this.endPoint.y);
		let maxX = Math.max(this.startPoint.x, this.endPoint.x);
		let maxY = Math.max(this.startPoint.y, this.endPoint.y);
		this.rectangle.width = 1 + maxX - this.rectangle.x;
		this.rectangle.height = 1 + maxY - this.rectangle.y;
		
		//Fill the rectangle with the base tile:
		let tiles = this.getTilesByWangId([this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain]);
		if(!tiles || tiles.length < 1) return;
		
		let layer = new TileLayer();
		let edit = layer.edit();
		for(let x = this.rectangle.x; x < this.rectangle.x + this.rectangle.width; ++x) {
			for(let y = this.rectangle.y; y < this.rectangle.y + this.rectangle.height; ++y) {
				let randomTile = this.randomFrom(tiles);
				edit.setTile(x, y, randomTile.tile, randomTile.flags);
			}
		}
		
		let x, y;
		
		//Tweak the edges based on surrounding tiles (or emptiness, if this.ignoreSurroundings is true):
		//Top edge:
		let end = this.rectangle.x + this.rectangle.width - 1;
		y = this.rectangle.y;
		let targetTerrain = [0, 0, this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain, 0];
		for(x = this.rectangle.x+1; x < end; ++x) {
			if(!this.ignoreSurroundings) {
				//check tile above for top side:
				let nearTile = currentLayer.tileAt(x, y-1);
				if(nearTile) {
					nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x, y-1));
					//replace top three points with the bottom three points of the tile above:
					targetTerrain[0] = nearTile[4]; //top = bottom
					targetTerrain[7] = nearTile[5]; //top left = bottom left
					targetTerrain[1] = nearTile[3]; //top right = bottom right
				} else {
					targetTerrain[0] = 0; //top
					targetTerrain[7] = 0; //top left
					targetTerrain[1] = 0; //top right
				}
			}
			tiles = this.getTilesByWangId(targetTerrain);
			if(!tiles || tiles.length < 1) continue;
			let randomTile = this.randomFrom(tiles);
			edit.setTile(x, y, randomTile.tile, randomTile.flags);
		}
		
		//Top left corner:
		x = this.rectangle.x;
		targetTerrain = [0, 0, this.currentTerrain, this.currentTerrain, this.currentTerrain, 0, 0, 0];
		if(!this.ignoreSurroundings) {
			//check tile above for top side:
			let nearTile = currentLayer.tileAt(x, y-1);
			if(nearTile) {
				nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x, y-1));
				//replace top three points with the bottom three points of the tile above:
				targetTerrain[0] = nearTile[4]; //top = bottom
				targetTerrain[7] = nearTile[5]; //top left = bottom left
				targetTerrain[1] = nearTile[3]; //top right = bottom right
			} else {
				targetTerrain[0] = 0; //top
				targetTerrain[7] = 0; //top left
				targetTerrain[1] = 0; //top right
			}
			//check left tile for left side:
			nearTile = currentLayer.tileAt(x-1, y);
			if(nearTile) {
				nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x-1, y));
				//replace left three points with the right three points of the tile to the left:
				targetTerrain[5] = nearTile[3]; //bottom left = bottom right
				targetTerrain[6] = nearTile[2]; //left = right
				//targetTerrain[7] = nearTile[1]; //top left = top right
			} else {
				targetTerrain[5] = 0; //bottom left
				targetTerrain[6] = 0; //left
				//targetTerrain[7] = 0; //top left
			}
		}
		tiles = this.getTilesByWangId(targetTerrain);
		if(tiles && tiles.length > 0) {
			let randomTile = this.randomFrom(tiles);
			edit.setTile(x, y, randomTile.tile, randomTile.flags);
		}
		
		//Top right corner:
		x = end;
		targetTerrain = [0, 0, 0, 0, this.currentTerrain, this.currentTerrain, this.currentTerrain, 0];
		if(!this.ignoreSurroundings) {
			//check tile below for bottom side:
			let nearTile = currentLayer.tileAt(x, y-1);
			if(nearTile) {
				nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x, y-1));
				//replace top three points with the bottom three points of the tile above:
				targetTerrain[0] = nearTile[4]; //top = bottom
				targetTerrain[7] = nearTile[5]; //top left = bottom left
				targetTerrain[1] = nearTile[3]; //top right = bottom right
			} else {
				targetTerrain[0] = 0; //top
				targetTerrain[7] = 0; //top left
				targetTerrain[1] = 0; //top right
			}
			nearTile = currentLayer.tileAt(x+1, y);
			if(nearTile) {
				nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x+1, y));
				//replace right three points with the left three points of the tile to the right:
				targetTerrain[3] = nearTile[5]; //bottom right = bottom left
				targetTerrain[2] = nearTile[6]; //right = left
				//targetTerrain[1] = nearTile[7]; //top right = top left
			} else {
				targetTerrain[3] = 0; //bottom right
				targetTerrain[2] = 0; //right
				//targetTerrain[1] = 0; //top right
			}			
		}
		tiles = this.getTilesByWangId(targetTerrain);
		if(tiles && tiles.length > 0) {
			let randomTile = this.randomFrom(tiles);
			edit.setTile(x, y, randomTile.tile, randomTile.flags);
		}
		
		//Bottom edge:
		y = this.rectangle.y + this.rectangle.height - 1;
		targetTerrain = [this.currentTerrain, this.currentTerrain, this.currentTerrain, 0, 0, 0, this.currentTerrain, this.currentTerrain];
		for(x = this.rectangle.x+1; x < end; ++x) {
			if(!this.ignoreSurroundings) {
				//check tile below for bottom side:
				let nearTile = currentLayer.tileAt(x, y+1);
				if(nearTile) {
					nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x, y+1));
					//replace bottom three points with the top three points of the tile below:
					targetTerrain[4] = nearTile[0]; //bottom = top
					targetTerrain[5] = nearTile[7]; //bottom left = top left
					targetTerrain[3] = nearTile[1]; //bottom right = top right
				} else {
					targetTerrain[4] = 0; //bottom
					targetTerrain[5] = 0; //bottom left
					targetTerrain[3] = 0; //bottom right
				}
			}
			tiles = this.getTilesByWangId(targetTerrain);
			if(!tiles || tiles.length < 1) continue;
			let randomTile = this.randomFrom(tiles);
			edit.setTile(x, y, randomTile.tile, randomTile.flags);
		}
		
		//Bottom left corner:
		x = this.rectangle.x;
		targetTerrain = [this.currentTerrain, this.currentTerrain, this.currentTerrain, 0, 0, 0, 0, 0];
		if(!this.ignoreSurroundings) {
			//check tile below for bottom side:
			let nearTile = currentLayer.tileAt(x, y+1);
			if(nearTile) {
				nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x, y+1));
				//replace bottom three points with the top three points of the tile below:
				targetTerrain[4] = nearTile[0]; //bottom = top
				targetTerrain[5] = nearTile[7]; //bottom left = top left
				targetTerrain[3] = nearTile[1]; //bottom right = top right
			} else {
				targetTerrain[4] = 0; //bottom
				targetTerrain[5] = 0; //bottom left
				targetTerrain[3] = 0; //bottom right
			}
			//check left tile for left side:
			nearTile = currentLayer.tileAt(x-1, y);
			if(nearTile) {
				nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x-1, y));
				//replace left three points with the right three points of the tile to the left:
				//targetTerrain[5] = nearTile[3]; //bottom left = bottom right
				targetTerrain[6] = nearTile[2]; //left = right
				targetTerrain[7] = nearTile[1]; //top left = top right
			} else {
				//targetTerrain[5] = 0; //bottom left
				targetTerrain[6] = 0; //left
				targetTerrain[7] = 0; //top left
			}
		}
		tiles = this.getTilesByWangId(targetTerrain);
		if(tiles && tiles.length > 0) {
			let randomTile = this.randomFrom(tiles);
			edit.setTile(x, y, randomTile.tile, randomTile.flags);
		}
		
		//Bottom right corner:
		//wangId contents: [0: Top, 1: TopRight, 2: Right, 3: BottomRight, 4: Bottom, 5: BottomLeft, 6: Left, 7: TopLeft]
		x = end;
		targetTerrain = [this.currentTerrain, 0, 0, 0, 0, 0, this.currentTerrain, this.currentTerrain];
		if(!this.ignoreSurroundings) {
			//check tile below for bottom side:
			let nearTile = currentLayer.tileAt(x, y+1);
			if(nearTile) {
				nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x, y+1));
				//replace bottom three points with the top three points of the tile below:
				targetTerrain[4] = nearTile[0]; //bottom = top
				targetTerrain[5] = nearTile[7]; //bottom left = top left
				targetTerrain[3] = nearTile[1]; //bottom right = top right
			} else {
				targetTerrain[4] = 0; //bottom
				targetTerrain[5] = 0; //bottom left
				targetTerrain[3] = 0; //bottom right
			}
			nearTile = currentLayer.tileAt(x+1, y);
			if(nearTile) {
				nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x+1, y));
				//replace right three points with the left three points of the tile to the right:
				//targetTerrain[3] = nearTile[5]; //bottom right = bottom left
				targetTerrain[2] = nearTile[6]; //right = left
				targetTerrain[1] = nearTile[7]; //top right = top left
			} else {
				//targetTerrain[3] = 0; //bottom right
				targetTerrain[2] = 0; //right
				targetTerrain[1] = 0; //top right
			}			
		}
		tiles = this.getTilesByWangId(targetTerrain);
		if(tiles && tiles.length > 0) {
			let randomTile = this.randomFrom(tiles);
			edit.setTile(x, y, randomTile.tile, randomTile.flags);
		}
		
		//wangId contents: [0: Top, 1: TopRight, 2: Right, 3: BottomRight, 4: Bottom, 5: BottomLeft, 6: Left, 7: TopLeft]
		//Left edge:
		x = this.rectangle.x;
		end = this.rectangle.y + this.rectangle.height - 1;
		targetTerrain = [this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain, 0, 0, 0];
		for(y = this.rectangle.y+1; y < end; ++y) {
			if(!this.ignoreSurroundings) {
				//check left tile for left side:
				let nearTile = currentLayer.tileAt(x-1, y);
				if(nearTile) {
					nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x-1, y));
					//replace left three points with the right three points of the tile to the left:
					targetTerrain[5] = nearTile[3]; //bottom left = bottom right
					targetTerrain[6] = nearTile[2]; //left = right
					targetTerrain[7] = nearTile[1]; //top left = top right
				} else {
					targetTerrain[5] = 0; //bottom left
					targetTerrain[6] = 0; //left
					targetTerrain[7] = 0; //top left
				}
			}
			tiles = this.getTilesByWangId(targetTerrain);
			if(!tiles || tiles.length < 1) continue;
			let randomTile = this.randomFrom(tiles);
			edit.setTile(x, y, randomTile.tile, randomTile.flags);
		}
		//Right edge:
		x = this.rectangle.x + this.rectangle.width - 1;
		targetTerrain = [this.currentTerrain, 0, 0, 0, this.currentTerrain, this.currentTerrain, this.currentTerrain, this.currentTerrain];
		for(y = this.rectangle.y+1; y < end; ++y) {
			if(!this.ignoreSurroundings) {
				//check right tile for right side:
				let nearTile = currentLayer.tileAt(x+1, y);
				if(nearTile) {
					nearTile = this.transformWangId(this.currentTerrainSet.wangId(nearTile), currentLayer.flagsAt(x+1, y));
					//replace right three points with the left three points of the tile to the right:
					targetTerrain[3] = nearTile[5]; //bottom right = bottom left
					targetTerrain[2] = nearTile[6]; //right = left
					targetTerrain[1] = nearTile[7]; //top right = top left
				} else {
					targetTerrain[3] = 0; //bottom right
					targetTerrain[2] = 0; //right
					targetTerrain[1] = 0; //top right
				}
			}
			tiles = this.getTilesByWangId(targetTerrain);
			if(!tiles || tiles.length < 1) continue;
			let randomTile = this.randomFrom(tiles);
			edit.setTile(x, y, randomTile.tile, randomTile.flags);
		}
		
		edit.apply();
		let preview = this.preview;
		preview.addLayer(layer);
		this.preview = preview;
	},
	
	preparePreview: function() {
		var preview = new TileMap();
		if(this.map) {
			preview.setSize(this.map.width, this.map.height);
			preview.setTileSize(this.map.tileWidth, this.map.tileHeight);
		}
		this.preview = preview;
	}
});

tiled.mapEditor.currentWangColorIndexChanged.connect(terrainRectangleTool.getTerrainCallback);
tiled.mapEditor.currentWangSetChanged.connect(terrainRectangleTool.getTerrainCallback);
