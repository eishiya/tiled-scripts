/* 	Copy+Paste Terrains by eishiya, last modified 16 Jun 2022

	This script adds four actions to the Tileset menu in the Tileset Editor
	that aid in building out terrains in Tilesets where the tiles are
	arranged very similarly.

	The first two let you copy paste terrains exactly from one set of tiles
	to another:
	- Copy Terrains
		Copies the terrains of the currently selected tiles exactly.
	- Paste Terrains
		Pastes the copied terrains to the currently selected tiles.
	This is a very basic copy+paste that only really works within a single
	Terrain Set. Pasting to different Terrain Sets or Tilesets are likely to be
	nonsense.

	The last two instead let you copy+paste an arrangement of a single terrain
	at a time, but let you paste as a different terrain, which is useful when
	you have tilesets that feature many different terrains that are all laid
	out the same, such as in RPG Maker tilesets:
	- Copy Terrain Arrangement
		Copies the layout of all instances of the currently selected terrain
		in the selected tiles. So, if you have Grass selected and use this
		action on a terrain containing both Grass and Water labels, only
		the Grass labels will be copied, Water labels will be ignored.
	- Paste Terrain Arrangement
		Pastes the copied layout into the selected terrains, using the currently
		selected terrain. So, if you copied some Grass labels, but have Water
		selected when you paste, you'll get the same shape, but Water instead.
		
		Any empty parts of the pasted terrain are simply not written, preserving
		anything that's already there, so you can paste multiple terrains into
		a single tile and get their "sum" labels in the end.
		
		If exactly one tile's terrains were copied, and multiple tiles
		are selected for pasting, that same terrain will be pasted to all
		of the selected tiles.
		
		Otherwise, the terrains will be copied in order. The first (typically
		topleftmost) terrain layout will be copied to the first tile, and so on.
		To keep the 2D arrangement of your tiles, make sure your destination
		selection has exactly the same shape as your source selection.

	These two actions can even copy+paste across different Terrain Sets
	and across different Tilesets!

	"Erase Terrain" also counts as a terrain, so you can erase away a particular
	label shape, or "copy" the empty parts of a label.

	This script requires Tiled 1.9 or newer.
*/

var terrainArrangements = {
	clipboard: [], //stores the copied terrain arrangements.
	//This is just a list of wangIDs currently, as Tiled provides only a 1D list of selected tiles
	//and nothing about their 2D arrangement
	
	copyTerrains: tiled.registerAction("copyTerrainArrangements", function(action) {
		if(!tiled.activeAsset || !tiled.activeAsset.isTileset) {
			tiled.alert("Active asset must be a Tileset to copy terrain arrangements.");
			return;
		}
		let tileset = tiled.activeAsset;
		let terrainsFound = false;
		terrainArrangements.clipboard.length = 0; //Reset clipboard
		let selectedTerrainSet = tiled.tilesetEditor.currentWangSet;
		let selectedTerrain = tiled.tilesetEditor.currentWangColorIndex;
		for(tile of tileset.selectedTiles) {
			let newWangID = [0,0,0,0,0,0,0,0];
			let oldWangID = selectedTerrainSet.wangId(tile);
			for(let i = 0; i < 8; ++i) {
				if(oldWangID[i] == selectedTerrain) {
					newWangID[i] = 1;
					terrainsFound = true;
				}
			}
			terrainArrangements.clipboard.push(newWangID);
		}
		if(terrainsFound === false)
			tiled.alert('No labels of terrain "' + selectedTerrainSet.colorName(selectedTerrain) + '" were copied.');
	}),

	pasteTerrains: tiled.registerAction("pasteTerrainArrangements", function(action) {
		if(!tiled.activeAsset || !tiled.activeAsset.isTileset) {
			tiled.alert("Active asset must be a Tileset to paste terrain arrangements.");
			return;
		}
		if(terrainArrangements.clipboard.length < 1) {
			tiled.alert("There are no terrain arrangements to paste.");
			return;
		}
		let tileset = tiled.activeAsset;
		let selectedTerrainSet = tiled.tilesetEditor.currentWangSet;
		let selectedTerrain = tiled.tilesetEditor.currentWangColorIndex;
		let selectedTiles = tileset.selectedTiles;
		let startIndex = 0, increment = 1;
		//Only paste the parts that are actually relevant to the current terrain set type:
		switch(selectedTerrainSet.type) {
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
		for(let ti = 0; ti < selectedTiles.length; ++ti) {
			let newWangID;
			if(terrainArrangements.clipboard.length === 1) {
				newWangID = terrainArrangements.clipboard[0];
			} else {
				if(ti >= terrainArrangements.clipboard.length)
					break;
				newWangID = terrainArrangements.clipboard[ti];
			}
			
			let tile = selectedTiles[ti];
			let oldWangID = selectedTerrainSet.wangId(tile);
			for(let i = startIndex; i < 8; i += increment) {
				if(newWangID[i] > 0) {
					oldWangID[i] = selectedTerrain;
				}
			}
			selectedTerrainSet.setWangId(tile, oldWangID);
		}
	})
};

terrainArrangements.copyTerrains.text = "Copy Terrain Arrangement";
terrainArrangements.pasteTerrains.text = "Paste Terrain Arrangement";

var terrainCopypaste = {
	clipboard: [], //stores the copied terrains.
	
	copyTerrains: tiled.registerAction("copyTerrains", function(action) {
		if(!tiled.activeAsset || !tiled.activeAsset.isTileset) {
			tiled.alert("Active asset must be a Tileset to copy terrains.");
			return;
		}
		let tileset = tiled.activeAsset;
		terrainCopypaste.clipboard.length = 0; //Reset clipboard
		let selectedTerrainSet = tiled.tilesetEditor.currentWangSet;
		let selectedTerrain = tiled.tilesetEditor.currentWangColorIndex;
		for(tile of tileset.selectedTiles) {
			let newWangID = [0,0,0,0,0,0,0,0];
			let oldWangID = selectedTerrainSet.wangId(tile);
			//Copy the terrains:
			for(let i = 0; i < 8; ++i) {
				newWangID[i] = oldWangID[i];
			}
			terrainCopypaste.clipboard.push(newWangID);
		}
	}),

	pasteTerrains: tiled.registerAction("pasteTerrains", function(action) {
		if(!tiled.activeAsset || !tiled.activeAsset.isTileset) {
			tiled.alert("Active asset must be a Tileset to paste terrains.");
			return;
		}
		if(terrainCopypaste.clipboard.length < 1) {
			tiled.alert("There are no terrains to paste.");
			return;
		}
		let tileset = tiled.activeAsset;
		let selectedTerrainSet = tiled.tilesetEditor.currentWangSet;
		let selectedTerrain = tiled.tilesetEditor.currentWangColorIndex;
		let selectedTiles = tileset.selectedTiles;
		let startIndex = 0, increment = 1;
		//Only paste the parts that are actually relevant to the current terrain set type:
		switch(selectedTerrainSet.type) {
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
		for(let ti = 0; ti < selectedTiles.length; ++ti) {
			let newWangID;
			if(terrainCopypaste.clipboard.length === 1) {
				newWangID = terrainCopypaste.clipboard[0];
			} else {
				if(ti >= terrainCopypaste.clipboard.length)
					break;
				newWangID = terrainCopypaste.clipboard[ti];
			}
			let tile = selectedTiles[ti];
			selectedTerrainSet.setWangId(tile, newWangID);
		}
	})
};

terrainCopypaste.copyTerrains.text = "Copy Terrains";
terrainCopypaste.pasteTerrains.text = "Paste Terrains";

tiled.extendMenu("Tileset", [
	{ action: "copyTerrains", before: "TilesetProperties" },
	{ action: "pasteTerrains" },
	{ action: "copyTerrainArrangements" },
	{ action: "pasteTerrainArrangements" },
	{separator: true}
]);
