#target illustrator

var docRef = app.activeDocument;
var layerName = "Logo";
var targetLayer = docRef.layers.getByName(layerName);

var currentNumber;


alert("Number of GroupItems: " + targetLayer.groupItems.length);

var num = 1;

for( var i = targetLayer.groupItems.length; i > 0; i--) {
    var group = targetLayer.groupItems[i - 1];
    group.hidden = false;

    var textNumbers = group.textFrames.getByName("Numbers");

    if(num < 10) {
        var currentNumber = "00000" + num;       
    } else if(num < 100) {
        var currentNumber = "0000" + num;
    } else if(num < 1000) {
        var currentNumber = "000" + num;
    }
    
    textNumbers.contents = currentNumber;
    var groupText = textNumbers.createOutline();

    num++;
}

//
// Loop through all items in the document and change spot color based on parent layer
/*
    
var whiteSpot = new SpotColor();
whiteSpot.spot = docRef.spots['White'];
var varnishSpot = new SpotColor();
varnishSpot.spot = docRef.spots['Primer'];    
    
for(var item = 0; item < docRef.pageItems.length; item++) {
        if(docRef.pageItems[item].filled == true && docRef.pageItems[item].layer == whitelayer) {
                docRef.pageItems[item].fillColor = whiteSpot;
        }else if(docRef.pageItems[item].filled == true && docRef.pageItems[item].layer == varnishlayer) {
                docRef.pageItems[item].fillColor = varnishSpot;
        }
}
*/

