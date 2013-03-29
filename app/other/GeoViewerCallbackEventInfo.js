/*
 TogoViewerCallbackEventInfo.js
 Version 20101008
 Author: Stefano
 */
function GeoViewerCallbackEventInfo(){
	
    var infoBoxOptions = {
        disableAutoPan: false,
        alignBottom: true,
        maxWidth: 0,
        pixelOffset: new google.maps.Size(-150, -10),
        zIndex: 1000,
        boxStyle: {
            opacity: 1,
            width: "300px"
        },
        closeBoxMargin: "0px",
        closeBoxURL: "",
        infoBoxClearance: new google.maps.Size(2, 2),
        isHidden: false,
        pane: "floatPane",
        enableEventPropagation: false
    };
    //TODO Da togliere i blip, anche dal geoviewer
    // public
    this.isBlip = function(event){
        return isBlipPrivate(event);
    }
    
    // public
    this.openInfoWindow = function(gObject, event, latLng, map){
        var infoBox = new InfoBox(infoBoxOptions);
        var textBox = document.createElement("div");
        
        textBox.innerHTML = getDescription(event);
        
        infoBox.setContent(textBox);

        if (gObject instanceof google.maps.Marker) {
            infoBox.open(map, gObject);
        }
        else {
        	infoBox.setMarkerHeight(0);
            infoBox.setPosition(latLng);
            infoBox.open(map);
        }
        
        return infoBox;
    }
    
    // public
    this.closeInfoWindow = function(infoBox){
        infoBox.close();
    }
    
    // private
    function isBlipPrivate(event){
        var type = event.type;
        return type == "blip-ok" || type == "blip-ko";
    }

    // private
    function getDescription(event){
        var title = event.title;
        var description = event.description;
        var href = event.href;
        
        if (isBlipPrivate(event)) {
            var lastModified = event.lastModified;
            
            var text = "";
            text = text + "<div><b>Blip!</b></div>";
            if (lastModified != null) {
                text = text + lastModified + "<br/>";
            }
            
            text = text + description + "</div></div>";
            
            return text;
        }
        else {
            // Usa le funzioni di callback per gestire la visualizzazione dei dettagli
            var text = "";
            if (href == null) {
                text = '<div class="tooltip yellow-tooltip" id="event' + event.id + '" onClick="geomobi.app.redirectTo(\'eventoDetails/' + event.id + '\')">';
            }
            else{
                text = '<div class="tooltip yellow-tooltip" onClick="geomobi.app.redirectTo(\'eventoUrl/' + event.id + '\')">';
                //text = "<div class='tooltip yellow-tooltip' onClick=\"visualizzaUrl('" + href + (href.indexOf('?') == -1 ? "?" : "&") + "titolo=" + encodeURIComponent(title).replace(/%0A/g, '') + "&descrizione=" + encodeURIComponent(description).replace(/%0A/g, '') + "')\">";
            }
            
            text += '<div>' + title + '<img src="resources/images/arrow-right.png" style="float: right;" /></div>';
            return text;
        }
    }
}
