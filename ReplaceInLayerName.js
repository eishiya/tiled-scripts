/* 	Replace in Layer Name by eishiya, last updated 14 May 2023

	Adds an action to the Layer menu and layers panel right-click menu that
	lets you search and replace strings in the names of selected layers.
	
	Requires Tiled 1.9+.
	
	This is useful when you need to bulk-rename layers, such as when changing
	which layers some Automapping rules target.
	
	Two options are available:
		- RegEx: Your find string will be treated as a regular expression,
			allowing you to match patterns rather than just literal strings.
			It should NOT have slashes around it. The global flag will always
			be set. If your regular expression is invalid, you will see an error
			in Tiled's issues panel and in the console.
		- Case-sensitive: Your find string will be treated as case-sensitive.
			This applies to both RegEx and regular strings.
	
	If RegEx is enabled, capture groups are supported. You can output them
	with $<number> in your replacement string. For example, (.) as your find
	string and $1$1 as your replacement string will double every character.
*/

var replaceInLayerName = tiled.registerAction("ReplaceInLayerName", function(action) {
	if(replaceInLayerName.dialogOpen) return;

	let dialog = new Dialog("Replace in Layer Name");
	dialog.newRowMode = Dialog.ManualRows;

	let findInput = dialog.addTextInput("Find:");
	dialog.addNewRow();
	let findLavel = dialog.addLabel("Find options:");
	let findRegexCheckbox = dialog.addCheckBox("RegEx", replaceInLayerName.regex);
	findRegexCheckbox.stateChanged.connect(function(state) { replaceInLayerName.regex = state; });
	let caseCheckbox = dialog.addCheckBox("Case-sensitive", replaceInLayerName.caseSensitive);
	caseCheckbox.stateChanged.connect(function(state) { replaceInLayerName.caseSensitive = state; });
	
	dialog.addNewRow();
	let replaceInput = dialog.addTextInput("Replace with:");
	
	dialog.addNewRow();
	let button = dialog.addButton("Replace");
	button.clicked.connect(function() {
		let map = tiled.activeAsset;
		if(!map || !map.isTileMap)
			return;
		let selectedLayers = map.selectedLayers;
		if(!selectedLayers)
			return;
		
		let find = findInput.text;
		if(replaceInLayerName.regex)
			find = new RegExp(find, 'g'+(replaceInLayerName.caseSensitive? '':'i') );
		else
			find = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'+(replaceInLayerName.caseSensitive? '':'i') );
			//Regex escape regex from https://stackoverflow.com/questions/3446170
		
		let replace = replaceInput.text;
		
		map.macro("Replace in Layer Name", function() {
			for(layer of selectedLayers) {
				layer.name = layer.name.replace(find, replace);
			}
		});
	});
	replaceInLayerName.dialogOpen = true;
	dialog.finished.connect(function() { replaceInLayerName.dialogOpen = false; });
	dialog.show();

});
replaceInLayerName.text = "Replace in Layer Name...";
replaceInLayerName.regex = false;
replaceInLayerName.dialogOpen = false;
replaceInLayerName.caseSensitive = true;

tiled.extendMenu("Layer", [
	{ action: "ReplaceInLayerName", before: "LayerProperties" },
	{separator: true}
]);
tiled.extendMenu("LayerView.Layers", [
	{ action: "ReplaceInLayerName", before: "LayerProperties" },
	{separator: true}
]);
