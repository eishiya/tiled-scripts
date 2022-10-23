/* 	Apply Action script by eishiya, last updated 23 Oct 2022
	
	This script adds an action to the Edit menu that lets you choose any action
	registered in Tiled (native or scripted) and apply it to all open documents.
	
	This script does not and cannot verify that the actions *make sense* being
	applied to all documents, so exercise caution.
*/

var applyActionState = {
	dialogOpen: false,
	chosenAction: null,
	chosenIndex: null
}

applyActionState.applyActionDialog = tiled.registerAction("ApplyActionDialog", function(action) {
	if(applyActionState.dialogOpen) return;
	applyActionState.dialogOpen = true;
	let dialog = new Dialog("Apply Action to Documents");
	
	let actionsDropdown = dialog.addComboBox("Action:", tiled.actions);
	actionsDropdown.toolTip = "Which action should be applied? To find actions faster, you can start typing their name.";
	actionsDropdown.currentTextChanged.connect(function(newText) {
		applyActionState.chosenIndex = actionsDropdown.currentIndex;
		applyActionState.chosenAction = newText;
	});
	if(applyActionState.chosenIndex != null) {
		actionsDropdown.currentIndex = applyActionState.chosenIndex;
	}
	
	let applyButton = dialog.addButton("Apply");
	applyButton.clicked.connect(function() {
		dialog.done(Dialog.Accepted);
		//Do the chosen action:
		let lastAsset = tiled.activeAsset;
		for(asset of tiled.openAssets) {
			tiled.activeAsset = asset;
			tiled.trigger(applyActionState.chosenAction);
		}
		tiled.activeAsset = lastAsset;
	});
	
	
	dialog.addNewRow();
	let closeButton = dialog.addButton("Cancel");
	closeButton.clicked.connect(function() { dialog.done(Dialog.Rejected);} );
	dialog.finished.connect(function() { applyActionState.dialogOpen = false; });
	
	dialog.show();
	
});
applyActionState.applyActionDialog.text = "Apply Action to Documents...";

tiled.extendMenu("Edit", [
    { action: "ApplyActionDialog", before: "Preferences" },
	{separator: true}
]);
