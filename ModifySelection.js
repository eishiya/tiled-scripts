/*	Modify Selection script by eishiya, last updated Oct 26 2023

	Adds Expand Selection and Contract Selection to the Edit menu
	in the Map Editor.

	Each action will prompt for a radius. The radius must be positive.

	Contract Selection may be slow for large, complex selections and
	large radii.

	These actions are not available for Tilesets because tile selections
	are one-dimensional, and the Tiled scripting API does not provide enough
	information to figure out their 2D shape reliably.

	Requires Tiled 1.8+
*/

var expandSelection = tiled.registerAction("ExpandSelection", function(action) {
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap)
		return;
	
	let radius = parseInt(tiled.prompt("Expand selection by how many tiles?", "1", "Expand Selection"));
	if( radius < 1 || isNaN(radius) ) return;
	
	let oldSelection = map.selectedArea.get();
	let newSelection = map.selectedArea.get();
	//Do nothing if the selection is empty:
	let bounds = oldSelection.boundingRect;
	if(bounds.width == 0 || bounds.height  == 0)
		return;
	newSelection.subtract(oldSelection); //Empty it out. TODO: If Tiled adds API to create empty regions, use that.
	let oldRects = oldSelection.rects;
	
	for(rect of oldRects) {
		newSelection.add(Qt.rect(rect.x-radius, rect.y-radius, rect.width + radius*2, rect.height + radius*2));
	}
	
	map.macro("Expand Selection", function () {
		map.selectedArea.set(newSelection);
	});
});
expandSelection.text = "Expand Selection";

var contractSelection = tiled.registerAction("ContractSelection", function(action) {
	let map = tiled.activeAsset;
	if(!map || !map.isTileMap)
		return;
	
	let radius = parseInt(tiled.prompt("Contract selection by how many tiles?", "1", "Contract Selection"));
	if( radius < 1 || isNaN(radius) ) return;
	
	//Store two copies of the selected area so we can always check the old rects even after making changes:
	oldSelection = map.selectedArea.get();
	newSelection = map.selectedArea.get();
	//Do nothing if the selection is empty:
	let bounds = oldSelection.boundingRect;
	if(bounds.width == 0 || bounds.height  == 0)
		return;
	//Contract the selection by 1 repeatedly:
	while(radius > 0) {
		radius--;
		//Subtract pixels from each rect if they're next to open space:
		let oldRects = oldSelection.rects;
		
		for(rect of oldRects) {
			let subtraction = null; //we will collect the points into thin rects to cut down the amount of subtractions we do
			//check above:
			for(x = rect.x; x < rect.x + rect.width; x++) {
				if(oldSelection.contains(x, rect.y - 1)) { //don't subtract this point
					if(subtraction)
						newSelection.subtract(subtraction);
					subtraction = null;
				} else { //subtract this point
					if(subtraction) {
						subtraction.width = subtraction.width+1;
					} else {
						subtraction = Qt.rect(x, rect.y, 1, 1)
					}
				}
			}
			if(subtraction)
				newSelection.subtract(subtraction);
			subtraction = null;
			
			//check left:
			for(y = rect.y; y < rect.y + rect.height; y++) {
				if(oldSelection.contains(rect.x - 1, y)) { //don't subtract this point
					if(subtraction)
						newSelection.subtract(subtraction);
					subtraction = null;
				} else { //subtract this point
					if(subtraction) {
						subtraction.height = subtraction.height+1;
					} else {
						subtraction = Qt.rect(rect.x, y, 1, 1)
					}
				}
			}
			if(subtraction)
				newSelection.subtract(subtraction);
			subtraction = null;
			
			//check right:
			for(y = rect.y; y < rect.y + rect.height; y++) {
				if(oldSelection.contains(rect.x + rect.width, y)) { //don't subtract this point
					if(subtraction)
						newSelection.subtract(subtraction);
					subtraction = null;
				} else { //subtract this point
					if(subtraction) {
						subtraction.height = subtraction.height+1;
					} else {
						subtraction = Qt.rect(rect.x + rect.width - 1, y, 1, 1)
					}
				}
			}
			if(subtraction)
				newSelection.subtract(subtraction);
			subtraction = null;
			
			//check below:
			for(x = rect.x; x < rect.x + rect.width; x++) {
				if(oldSelection.contains(x, rect.y + rect.height)) { //don't subtract this point
					if(subtraction)
						newSelection.subtract(subtraction);
					subtraction = null;
				} else { //subtract this point
					if(subtraction) {
						subtraction.width = subtraction.width+1;
					} else {
						subtraction = Qt.rect(x, rect.y + rect.height - 1, 1, 1)
					}
				}
			}
			if(subtraction)
				newSelection.subtract(subtraction);
		}
		if(radius > 0) {
			//Update the selections for the next loop:
			oldSelection = newSelection;
			newSelection = map.selectedArea.get();
			newSelection.subtract(newSelection); //TODO: If Tiled adds API to clear or copy regions, use that.
			newSelection.add(oldSelection);
		}
	}
	map.macro("Contract Selection", function () {
		map.selectedArea.set(newSelection);
	});
});
contractSelection.text = "Contract Selection";

tiled.extendMenu("Edit", [
	{ action: "ExpandSelection", before: "SelectNone" },
	{ action: "ContractSelection" }
]);

//Only show this action in the Map editor:
expandSelection.updateMenus = function() {
	let asset = tiled.activeAsset;
	if(asset && asset.isTileMap) {
		expandSelection.enabled = true;
		expandSelection.visible = true;
		contractSelection.enabled = true;
		contractSelection.visible = true;
	} else {
		expandSelection.enabled = false;
		expandSelection.visible = false;
		contractSelection.enabled = false;
		contractSelection.visible = false;
	}
}

expandSelection.updateMenus(); //Make sure the actions have the correct state on load
tiled.activeAssetChanged.connect(expandSelection.updateMenus);
//TODO: If Tiled adds events for the selection changing, listen for those.
