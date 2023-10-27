/*	Force Edge Terrain Tool by eishiya, last updated 21 Oct 2023

	Adds a tool to your Map Toolbar that treats Mixed Terrains as Edge Terrains,
	making it easier to draw thin shapes.
	
	To paint a Terrain Shape, choose a Terrain, and then click and drag,
	just like the Terrain Brush tool.
	
	Requires Tiled 1.10.2+
	
	Caveats/Tips:
	- You can right-click to sample a terrain from the map, but the newly
	selected Terrain will not be reflected in the Terrains panel.
	This is a limitation of the Tiled API.
*/

var forceEdgeTerrainTool = tiled.registerTool("ForceEdgeTerrain", {
	name: "Force Edge Terrain Tool",
	icon: ":images/16/remove.png", //looks vaguely like a line xP
	usesWangSets: true,
	targetLayerType: Layer.TileLayerType,

	currentTerrain: -1,
	currentTerrainSet: null,
	terrainHasEdges: false,
	
	lastModifiedTile: {x: null, y: null},
	lastIndex: WangIndex.NumIndexes,
	
	activated: function() {
		this.getTerrain();
	},
	
	getEdgeAt: function(x, y, lastX = null, lastY = null) { //x and y are pixel coords
		//Calculate where within the current tile we are:
		let tileX = (x % this.map.tileWidth) / this.map.tileWidth;
		let tileY = (y % this.map.tileHeight) / this.map.tileHeight;
		//Calculate the index we clicked on:
		let index = WangIndex.NumIndexes;
		//Convert x and y to tile coords:
		x = Math.floor(x / this.map.tileWidth);
		y = Math.floor(y / this.map.tileHeight);
		
		//We've moved into another tile from the last modified one, use that to determine which edge to draw:
		if(x === lastX || y === lastY ) {
			index = this.lastIndex;
			if(x > lastX)
				index = WangIndex.Left;
			else if(x < lastX)
				index = WangIndex.Right;
			else if(y > lastY)
				index = WangIndex.Top;
			else if(y < lastY)
				index = WangIndex.Bottom;
			return index;
		}

		if(tileX < tileY) { //Bottom and Left, x == y is the \ diagonal through the tile.
			if((1 - tileX) < tileY) //Top and Left, 1-tileX == tileY is the / diagonal through the tile.
				index = WangIndex.Bottom;
			else
				index = WangIndex.Left;
		} else { //Top and Right
			if((1 - tileX) < tileY) //Top and Left, 1-tileX == tileY is the / diagonal through the tile.
				index = WangIndex.Right;
			else
				index = WangIndex.Top;
		}
		
		return index;
	},

	mousePressed: function (button, x, y, modifiers) {
		if(button == 1) { //left-click, start the rectangle
			this.mouseDown = true;
			this.lastModifiedTile.x = this.tilePosition.x;
			this.lastModifiedTile.y = this.tilePosition.y;
			if(this.map && this.preview)
				this.map.merge(this.preview, false); //start a new stroke
			
		} else if(button == 2) { //right-click, sample the terrain from a tile:
			if(!this.currentTerrainSet) return;
			if(!this.map || !this.map.currentLayer) return;
			var selectedLayer = this.map.currentLayer;
			if(!selectedLayer || !selectedLayer.isTileLayer) return;
			var newTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
			if(newTile) {
				//Calculate where within the current tile we are:
				let tileX = (x % this.map.tileWidth) / this.map.tileWidth;
				let tileY = (y % this.map.tileHeight) / this.map.tileHeight;
				//Calculate the index we clicked on:
				let index = WangIndex.NumIndexes;
				switch(this.currentTerrainSet.type) {
					case WangSet.Corner:
						if(tileX < 0.5) { //left
							if(tileY < 0.5)
								index = WangIndex.TopLeft;
							else
								index = WangIndex.BottomLeft;
						} else { //right
							if(tileY < 0.5)
								index = WangIndex.TopRight
							else
								index = WangIndex.BottomRight;
						}
						break;
					case WangSet.Edge:
						if(tileX < tileY) { //Bottom and Left, x == y is the \ diagonal through the tile.
							if((1 - tileX) < tileY) //Top and Left, 1-tileX == tileY is the / diagonal through the tile.
								index = WangIndex.Bottom;
							else
								index = WangIndex.Left;
						} else { //Top and Right
							if((1 - tileX) < tileY) //Top and Left, 1-tileX == tileY is the / diagonal through the tile.
								index = WangIndex.Right;
							else
								index = WangIndex.Top;
						}
						break;
					default: //Mixed
						if(tileX < 1/3) { //left
							if(tileY < 1/3) //top
								index = WangIndex.TopLeft;
							else if(tileY < 2/3) //middle
								index = WangIndex.Left;
							else //bottom
								index = WangIndex.BottomLeft;
						} else if(tileX < 2/3) { //middle
							if(tileY < 1/3) //top
								index = WangIndex.Top;
							else if(tileY < 2/3) //middle
								; //index = WangIndex.Middle; //Middle markings are not implemented in Tiled.
							else //bottom
								index = WangIndex.Bottom;
						} else { //right
							if(tileY < 1/3) //top
								index = WangIndex.TopRight;
							else if(tileY < 2/3) //middle
								index = WangIndex.Right;
							else //bottom
								index = WangIndex.BottomRight;
						}
				}
				//Get the terrain at this index:
				if(index < WangIndex.NumIndexes) {
					//tiled.mapEditor.currentWangColorIndex = this.currentTerrainSet.wangId(newTile)[index];
					//this.getTerrain();
					//TODO: If mapEditor.currentWangColorIndex becomes assignable, use the above code instead.
					let oldTerrain = this.currentTerrain;
					this.currentTerrain = this.currentTerrainSet.wangId(newTile)[index];
					if(oldTerrain != this.currentTerrain) {
						let paintStyle = this.currentTerrainSet.effectiveTypeForColor(this.currentTerrain);
						if(paintStyle == WangSet.Corner)
							this.terrainHasEdges = false;
						else
							this.terrainHasEdges = true;
					}
					this.updateStatusInfo();
				}
			}
		}
	},
	
	mouseReleased: function (button, x, y, modifiers) {
		if(button == 1) //we only track left-click drag
			this.mouseDown = false;
			this.lastModifiedTile.x = null;
			this.lastModifiedTile.y = null;
			lastIndex = WangIndex.NumIndexes;
			if(this.map && this.preview)
				this.map.merge(this.preview, true);
	},
	
	mouseMoved: function (x, y, modifiers) {
		let index = this.mouseDown? this.getEdgeAt(x, y, this.lastModifiedTile.x, this.lastModifiedTile.y) : this.getEdgeAt(x, y, null, null);
		let positionChanged = (index != this.lastIndex) || (this.lastModifiedTile.x != this.tilePosition.x || this.lastModifiedTile.y != this.tilePosition.y);
		if(index < WangIndex.NumIndexes) {
			if(this.mouseDown && positionChanged) {
				this.fillLine(Qt.point(this.lastModifiedTile.x, this.lastModifiedTile.y), this.tilePosition);
				if(this.map && this.preview)
					this.map.merge(this.preview, true);
				this.lastModifiedTile.x = this.tilePosition.x;
				this.lastModifiedTile.y = this.tilePosition.y;
			}
			if(positionChanged)
				this.showPreview(this.tilePosition.x, this.tilePosition.y, index);
			this.lastIndex = index;
		}
	},
	
	mapChanged: function(oldMap, newMap) {
		this.getTerrain();
		this.preparePreview();
	},
	
	updateStatusInfo: function () {
		if(!this.map || !this.map.currentLayer) {
			this.statusInfo = "Force Edge Terrain Tool has no map or selected layers, so it cannot draw anything.";
			return;
		}
		if(this.currentTerrain < 0) {
			this.statusInfo = "No terrain selected.";
		} else {
			if(!this.terrainHasEdges) {
				this.statusInfo = "Selected Terrain does not have Edge labels.";
				return;
			}
			var selectedLayer = this.map.currentLayer;
			if(!selectedLayer) {
				this.statusInfo = "No layer selected (probably a Tiled glitch, move your cursor to try again).";
			} else if(selectedLayer.isTileLayer) {
				let originalTile = selectedLayer.tileAt(this.tilePosition.x, this.tilePosition.y);
				if(this.currentTerrain > 0 && this.currentTerrainSet)
					 this.statusInfo = this.tilePosition.x + ", " + this.tilePosition.y + " [" + (originalTile? originalTile.id : "empty") + "] [Using Terrain \""+this.currentTerrainSet.colorName(this.currentTerrain)+"\" from Terrain Set \""+this.currentTerrainSet.name+"\"]";
				else
					this.statusInfo = this.tilePosition.x + ", " + this.tilePosition.y + " [" + (originalTile? originalTile.id : "empty") + "]";
			} else {
				this.statusInfo = "The selected layer is not a Tile Layer.";
			}
		}
	},
	
	getTerrain: function() {
		let oldTerrain = this.currentTerrain;
		let oldTerrainSet = this.currentTerrainSet;
		
		this.currentTerrainSet = tiled.mapEditor.currentWangSet;
		if(this.currentTerrainSet == null)
			this.currentTerrain = -1;
		else this.currentTerrain = tiled.mapEditor.currentWangColorIndex;
		
		if(this.currentTerrainSet) {
			if(this.currentTerrainSet != oldTerrainSet || this.currentTerrain != oldTerrain) {
				let paintStyle = this.currentTerrainSet.effectiveTypeForColor(this.currentTerrain);
				if(paintStyle == WangSet.Corner)
					this.terrainHasEdges = false;
				else
					this.terrainHasEdges = true;
			}
			return;
		}
	},
	
	getTerrainCallback: function() {
		forceEdgeTerrainTool.getTerrain();
	},

	showPreview: function(x, y, index) {
		this.preparePreview();
		if(!this.map || !this.map.currentLayer || !this.currentTerrainSet || this.currentTerrain < 0) return;
		if(index == WangIndex.NumIndexes) return;
		
		let currentLayer = this.map.currentLayer;
		if(!currentLayer.isTileLayer) return;
		
		let edit = currentLayer.wangEdit(this.currentTerrainSet);
		edit.correctionsEnabled = true;
		edit.setEdge(this.tilePosition.x, this.tilePosition.y, index, this.currentTerrain);
		
		let preview = this.preview;
		preview.addLayer(edit.generate());
		this.preview = preview;
	},
	
	preparePreview: function() {
		var preview = new TileMap();
		if(this.map) {
			preview.setSize(this.map.width, this.map.height);
			preview.setTileSize(this.map.tileWidth, this.map.tileHeight);
		}
		this.preview = preview;
	},
	
	fillLine: function(startPoint, endPoint) {		
		this.preparePreview();
		if(!this.map || !this.map.currentLayer || !this.currentTerrainSet || this.currentTerrain < 0) return;
		
		let currentLayer = this.map.currentLayer;
		if(!currentLayer.isTileLayer) return;
		
		let edit = currentLayer.wangEdit(this.currentTerrainSet);
		edit.correctionsEnabled = true;
		
		let line = Geometry.pointsOnLine(startPoint, endPoint, true);

		for(let i = 0; i < line.length-1; i++) {
			//Which way does this point connect?
			let curPoint = line[i];
			let nextPoint = line[i+1];
			let index = WangIndex.NumIndexes;
			if(curPoint.x == nextPoint.x) { //x is equal, above or below
				if(curPoint.y < nextPoint.y)
					index = WangIndex.Bottom;
				else// if(curPoint.y > nextPoint.y)
					index = WangIndex.Top;
			} else { //y must be equal; left or right
				if(curPoint.x < nextPoint.x)
					index = WangIndex.Right;
				else// if(curPoint.x > nextPoint.x)
					index = WangIndex.Left;
			}
			if(index < WangIndex.NumIndexes)
				edit.setEdge(curPoint.x, curPoint.y, index, this.currentTerrain);
		}
		
		let preview = this.preview;
		preview.addLayer(edit.generate());
		this.preview = preview;
	}
});

tiled.mapEditor.currentWangColorIndexChanged.connect(forceEdgeTerrainTool.getTerrainCallback);
tiled.mapEditor.currentWangSetChanged.connect(forceEdgeTerrainTool.getTerrainCallback);
