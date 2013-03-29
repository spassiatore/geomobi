/*
 TogoViewer.js
 Version 20110518
 Author: pmarco
 */
// class
var GeoViewer = function(viewingMap){
    // final
    var DEFAULT_ZOOM = 14;
    
    // private	
    var map;
    var geocoder;
    var trafficLayer;
    var geocoderMarker;
    var positionIncreasingAccuracy = false;
    var positionWatchId;
    var positionAccuracy;
    var positionMarker;
    var positionCircle;
    var loadingOverlay;
    var crosshairsOverlay;
    
    var styles;
    var iconOptimized = true;
    
    var eventInfoOn = "click";
    var eventInfoHandler;
    var eventLazyShowMode = false;
    var eventLazyShowListener;
    var eventMinimumZoom;
    
    var currentEvent;
    var openInfoWindow;
    
    var markerCache = [];
    var circleCache = [];
    var polygonCache = [];
    var polylineCache = [];
    
    var blipCache = [];

    // constructor    
    map = viewingMap;
    
    google.maps.event.addListener(map, 'click', closeInfoWindow);
    
    eventInfoHandler = new GeoDefaultEventInfo();
    geocoder = new google.maps.Geocoder();
    // Stefano
    this.getMarkerCache = function(){
    	return markerCache;
    }
    
    this.closeInfoWindow = function (){
        if (openInfoWindow != null) {
            eventInfoHandler.closeInfoWindow(openInfoWindow);
        }
        
        currentEvent = null;
    }
    // public
    this.setStyles = function(geoStyles){
        styles = geoStyles;
        //ensureLoadingOverlay();
        //ensureCrosshairsOverlay();
    }

    // public Stefano
    this.setIconOptimized = function(optimize){
        iconOptimized = optimize;
    }
    
    // public
    this.setEventInfoHandler = function(newHandler){
        eventInfoHandler = newHandler;
    }
    
    this.getEventInfoHandler = function(){
    	return eventInfoHandler;
    }
    
    // public
    this.setEventInfoOn = function(event){
        eventInfoOn = event;
    }
    
    // public
    this.setEventMinimumZoom = function(level){
        eventMinimumZoom = level;
    }
    
    // public
    this.setEventLazyShowMode = function(mode){
        if (mode && eventLazyShowListener == null) {
            // Add listener
            eventLazyShowListener = google.maps.event.addListener(map, "bounds_changed", lazyShowEvents)
        }
        else if (!mode && eventLazyShowListener != null) {
            // Remove listener
            google.maps.event.removeListener(eventLazyShowListener);
        }
        eventLazyShowMode = mode;
    }
    
    // public
    this.setPositionOptions = function(options){
        positionOptions = options;
    }
    
    // public
    this.setPositionIncreasingAccuracy = function(option){
        positionIncreasingAccuracy = option;
    }
    
    // public
    this.loadEvents = function(href, centerMap, callback){
        load(href, centerMap);
    }
    
    // public
    this.loadBlips = function(href, centerMap, callback){
        load(href, centerMap);
    }
    
    // public
    this.addEvents = function(text, centerMap, callback){
    	
    	if (!ensureStyles()) {
            return;
        }
        
        closeInfoWindow();
        
        parseEvents(text);
        
        if (centerMap) {
            centerMapPrivate();
        }
        
        if (eventLazyShowMode) {
            lazyShowEvents();
        }
        
        if (callback != null) {
            callback();
        }
    }
    
    // public
    this.atGeocoder = function(address, failureCallback){
        if (!ensureStyles()) {
            return;
        }
        
        if (loadingOverlay != null) {
            loadingOverlay.show();
        }
        
        var bounds = provideGeocoderBounds();
        
        geocoder.geocode({
            address: address,
            bounds: bounds
        }, function(results, status){
            if (status == google.maps.GeocoderStatus.OK) {
                atGeocoderResultPrivate(results[0]);
            }
            else if (failureCallback != null) {
                failureCallback();
            }
            
            if (loadingOverlay != null) {
                loadingOverlay.hide();
            }
        });
    }
    
    // public
    this.getGeocoderResults = function(address, callback){
        if (!ensureStyles()) {
            return;
        }
        
        var bounds = provideGeocoderBounds();
        
        geocoder.geocode({
            address: address,
            bounds: bounds
        }, callback);
    }
    
    // public
    this.atGeocoderResult = function(result){
        if (!ensureStyles()) {
            return;
        }
        
        atGeocoderResultPrivate(result);
    }
    
    // public 
    this.atCurrentPosition = function(failureCallback){
        if (!ensureStyles()) {
            return;
        }
        
        if (!navigator || !navigator.geolocation) {
            if (failureCallback != null) {
                failureCallback();
            }
            return;
        }
        
        if (loadingOverlay != null) {
            loadingOverlay.show();
        }
        
        navigator.geolocation.getCurrentPosition(showCurrentPosition, function(error){
            if (failureCallback != null) {
                failureCallback(error);
            }
            
            if (loadingOverlay != null) {
                loadingOverlay.hide();
            }
            clearCurrentPosition();
        }, {
            'enableHighAccuracy': true,
            'maximumAge': 30000,
            'timeout': 5000
        });
    }
    
    // public            
    this.centerMap = function(defaultZoom){
        centerMapPrivate(defaultZoom);
    }
    
    // public
    this.clearEvents = function(){
    	
    	console.log('clearEvents');
    	
        closeInfoWindow();
        
        for (var i = 0; i < circleCache.length; i++) {
            circleCache[i].setMap(null);
        }
        for (var i = 0; i < markerCache.length; i++) {
            markerCache[i].setMap(null);
        }
        for (var i = 0; i < polygonCache.length; i++) {
            polygonCache[i].setMap(null);
        }
        for (var i = 0; i < polylineCache.length; i++) {
            polylineCache[i].setMap(null);
        }
        
        markerCache = [];
        circleCache = [];
        polygonCache = [];
        polylineCache = [];
    }
    
    // public
    this.clearBlips = function(){
        closeInfoWindow();
        
        for (var i = 0; i < blipCache.length; i++) {
            blipCache[i].setMap(null);
        }
        
        blipCache = [];
    }
    
    // public
    this.clearGeocoder = function(){
        closeInfoWindow();
        
        if (geocoderMarker) {
            geocoderMarker.setMap(null);
            geocoderMarker = null;
        }
    }
    
    // public
    this.clearPosition = function(){
        clearCurrentPosition();
    }
    
    // public
    this.hideTrafficLayer = function(){
        if (trafficLayer != null) {
            trafficLayer.setMap(null);
        }
    }
    
    // public
    this.showTrafficLayer = function(){
        if (trafficLayer == null) {
            trafficLayer = new google.maps.TrafficLayer();
        }
        
        trafficLayer.setMap(map);
    }
    
    // public
    this.hideEvents = function(){
        closeInfoWindow();
        
        for (var i = 0; i < circleCache.length; i++) {
            circleCache[i].setMap(null);
        }
        for (var i = 0; i < markerCache.length; i++) {
            markerCache[i].setMap(null);
        }
        for (var i = 0; i < polygonCache.length; i++) {
            polygonCache[i].setMap(null);
        }
        for (var i = 0; i < polylineCache.length; i++) {
            polylineCache[i].setMap(null);
        }
    }
    
    // public
    this.showEvents = function(){
        closeInfoWindow();
        
        for (var i = 0; i < circleCache.length; i++) {
            circleCache[i].setMap(map);
        }
        for (var i = 0; i < markerCache.length; i++) {
            markerCache[i].setMap(map);
        }
        for (var i = 0; i < polygonCache.length; i++) {
            polygonCache[i].setMap(map);
        }
        for (var i = 0; i < polylineCache.length; i++) {
            polylineCache[i].setMap(map);
        }
    }
    
    // public
    this.hideBlips = function(){
        closeInfoWindow();
        
        for (var i = 0; i < blipCache.length; i++) {
            blipCache[i].setMap(null);
        }
    }
    
    // public
    this.showBlips = function(){
        closeInfoWindow();
        
        for (var i = 0; i < blipCache.length; i++) {
            blipCache[i].setMap(map);
        }
    }
    
    // public
    this.showCrosshairs = function(){
        crosshairsOverlay.show();
    }
    
    // public
    this.hideCrosshairs = function(){
        crosshairsOverlay.hide();
    }
    
    // public
    this.getCurrentEvent = function(){
        return currentEvent;
    }
    
    // public
    this.getCurrentEventDescription = function(type){
        return styles[type].Description;
    }
    
    // public
    this.getMapCenterAsXMLString = function(){
        var center = map.getCenter();
        
        return "<Point>" +
        center.lat() +
        "," +
        center.lng() +
        "</Point>";
    }
    
    // private
    function load(href, centerMap, callback){
        if (!ensureStyles()) {
            return;
        }
        
        var request = window.ActiveXObject ? new ActiveXObject('Microsoft.XMLHTTP') : new XMLHttpRequest;
        
        if (loadingOverlay != null) {
            loadingOverlay.show();
        }
        
        request.onreadystatechange = function(){
            if (request.readyState == 4) {
            
                if (request.status == 200) {
                    request.onreadystatechange = doNothing;
                    
                    closeInfoWindow();
                    //var xml = TogoViewer.parseXML(request.responseText);
                    parseEvents(eval('(' + request.responseText + ')'));
                    if (centerMap) {
                        centerMapPrivate();
                    }
                    if (callback != null) {
                        callback();
                    }
                }
                else {
                    console.log("GeoViewer: unexpected problem while loading events:\n" + request.statusText);
                }
            }
            
            if (loadingOverlay != null) {
                loadingOverlay.hide();
            }
        };
        
        request.open("GET", href, true);
        request.send(null);
    }
    
    
    // private
    function centerMapPrivate(defaultZoom){
        // Center to fit all markers                        
        var bounds = new google.maps.LatLngBounds();
        var counter = 0;
        var path;
        
        for (var i = 0; i < markerCache.length; ++i) {
            bounds.extend(markerCache[i].getPosition());
            counter++;
        }
        for (var i = 0; i < polygonCache.length; ++i) {
            path = polygonCache[i].getPath();
            for (var j = 0; j < path.getLength(); ++j) {
                bounds.extend(path.getAt(j));
                counter++;
            }
        }
        for (var i = 0; i < polylineCache.length; ++i) {
            path = polylineCache[i].getPath();
            for (var j = 0; j < path.getLength(); ++j) {
                bounds.extend(path.getAt(j));
                counter++;
            }
        }
        
        if (!bounds.isEmpty()) {
            map.fitBounds(bounds);
        }
        else if (defaultZoom) {
            map.setZoom(defaultZoom);
        }
    }
    
    // private 
    function showCurrentPosition(pos){
        var latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        
        if (positionMarker) {
            map.panTo(latLng);
            map.setZoom(DEFAULT_ZOOM);
            positionMarker.setPosition(latLng);
            
            if (positionCircle != null) {
                positionCircle.setRadius(pos.coords.accuracy);
            }
        }
        else {
            map.panTo(latLng);
            map.setZoom(DEFAULT_ZOOM);
            positionMarker = new google.maps.Marker({
                map: map,
                position: latLng
            });
            var imageOptions = getStyleProperty("positionMarker", "markerimage");
            if (imageOptions != null) {
                positionMarker.setIcon(createMarkerImage(imageOptions));
            }
            var circleOptions = getStyleProperty("positionMarker", "circle");
            if (circleOptions != null) {
                positionCircle = new google.maps.Circle(circleOptions);
                positionCircle.bindTo('center', positionMarker, 'position');
                positionCircle.setRadius(pos.coords.accuracy);
                positionCircle.setMap(map);
            }
        }
        
        if (loadingOverlay != null) {
            loadingOverlay.hide();
        }
        
        if (positionIncreasingAccuracy) {
            positionAccuracy = pos.coords.accuracy;
			alert("first attempt accuracy: " + positionAccuracy);
            
            positionWatchId = navigator.geolocation.watchPosition(updateCurrentPosition, clearPositionWatch, {
                'enableHighAccuracy': true,
                'maximumAge': 0,
                'timeout': 5000
            });
        }
    }
    
    // private 
    function updateCurrentPosition(pos){
        var latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        
        if (positionWatchId == null) {
            return;
        }
        
        if (positionMarker != null) {
            positionMarker.setPosition(latLng);
            
            if (positionCircle != null) {
                positionCircle.setRadius(pos.coords.accuracy);
            }
            
            if (pos.coords.accuracy < positionAccuracy) {
                positionAccuracy = pos.coords.accuracy;
                
                alert("better accuracy: " + positionAccuracy);
            }
            else {
                clearPositionWatch();
            }
        }
        else {
            clearPositionWatch();
        }
    }
    
    // private
    function clearPositionWatch(){
        navigator.geolocation.clearWatch(positionWatchId);
        positionWatchId = null;
        
        alert("position watch cleared: " + positionAccuracy);
    }
    
    // private
    function clearCurrentPosition(){
        if (positionMarker) {
            positionMarker.setMap(null);
            positionMarker = null;
            
            if (positionCircle) {
                positionCircle.setMap(null);
                positionCircle = null;
            }
        }
        
        positionAccuracy = -1;
    }
    
    // private
    function atGeocoderResultPrivate(result){
    
        closeInfoWindow();
        
        if (geocoderMarker) {
            geocoderMarker.setMap(null);
        }
        map.panTo(result.geometry.location);
        map.setZoom(DEFAULT_ZOOM);
        geocoderMarker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,
            position: result.geometry.location
        });
        var imageOptions = getStyleProperty("geocoderMarker", "markerimage");
        if (imageOptions != null) {
            geocoderMarker.setIcon(createMarkerImage(imageOptions));
        }
        imageOptions = getStyleProperty("geocoderMarker", "ShadowImage");
        if (imageOptions != null) {
            geocoderMarker.setShadow(createMarkerImage(imageOptions));
        }
    }
    
    // private
    function lazyShowEvents(){
    
        if (eventMinimumZoom != null && map.getZoom() < eventMinimumZoom) {
            // Hide everything
            
            for (var i = 0; i < circleCache.length; i++) {
                circleCache[i].setMap(null);
            }
            for (var i = 0; i < markerCache.length; i++) {
                markerCache[i].setMap(null);
            }
            for (var i = 0; i < polygonCache.length; i++) {
                polygonCache[i].setMap(null);
            }
            for (var i = 0; i < polylineCache.length; i++) {
                polylineCache[i].setMap(null);
            }
            
            return;
        }
        
        var viewport = map.getBounds();
        
        if (viewport == null) {
            return;
        }
        
        for (var i = 0; i < circleCache.length; i++) {
            if (circleCache[i].getMap(map) == null && viewport.intersects(circleCache[i].getBounds())) {
                circleCache[i].setMap(map);
            }
        }
        for (var i = 0; i < markerCache.length; i++) {
            if (markerCache[i].getMap() == null && viewport.contains(markerCache[i].getPosition())) {
                markerCache[i].setMap(map);
            }
        }
        for (var i = 0; i < polygonCache.length; i++) {
            if (polygonCache[i].getMap() == null) {
                var path = polygonCache[i].getPath();
                for (var j = 0; j < path.getLength(); j++) {
                    if (viewport.contains(path.getAt(j))) {
                        polygonCache[i].setMap(map);
                        break;
                    }
                }
            }
        }
        for (var i = 0; i < polylineCache.length; i++) {
            if (polylineCache[i].getMap() == null) {
                var path = polylineCache[i].getPath();
                for (var j = 0; j < path.getLength(); j++) {
                    if (viewport.contains(path.getAt(j))) {
                        polylineCache[i].setMap(map);
                        break;
                    }
                }
            }
        }
    }
    
    // private
    function parseEvents(events){
        for (var i = 0; i < events.length; i++) {

            if (events[i].geometria.tipo == 'Point' || events[i].geometria.tipo == 'Circle') {
            	createMarker(events[i]);
            }
            else if (events[i].geometria.tipo == 'Polygon') {
                createPolygon(events[i]);
            }
            else if (events[i].geometria.tipo == 'Polyline') {
                createPolyline(events[i]);
            }
            else {
                console.log("GeoViewer: unrecognized geometry:\n" + geometry.tipo);
            }
        }    	

    }
    
    // private
    function createMarkerImage(markerImageOptions){
        ensureMarkerImageOptions(markerImageOptions);
        
        var markerImage = new google.maps.MarkerImage(
        	markerImageOptions.url, 
        	new google.maps.Size(parseInt(markerImageOptions.size.split(',')[0]),parseInt(markerImageOptions.size.split(',')[1])),
        	new google.maps.Point(parseInt(markerImageOptions.origin.split(',')[0]),parseInt(markerImageOptions.origin.split(',')[1])),
        	new google.maps.Point(parseInt(markerImageOptions.anchor.split(',')[0]),parseInt(markerImageOptions.anchor.split(',')[1])),
        	new google.maps.Size(parseInt(markerImageOptions.size.split(',')[0]),parseInt(markerImageOptions.size.split(',')[1]))
        );

        return markerImage;
    }
    
    // private
    function createMarker(event){
        var type = event.type;
        
        var path = GeoViewer.parsePath(event.geometria.valore);
        if (path.length < 1) {
            return;
        }
        
        var marker = provideMarker(event, path[0]);
        
        if (event.geometria.tipo == 'Circle') {
            var radius = parseFloat(event.geometria.radius);
            var circleOptions = getStyleProperty(type, "circle");
            if (circleOptions == null) {
                circleOptions = {};
            }
            if (!eventLazyShowMode) {
                circleOptions.map = map;
            }
            circleOptions.radius = radius;
            
            var circle = new google.maps.Circle(circleOptions);
            circle.bindTo('center', marker, 'position');
            circleCache.push(circle);
            
            provideEventInfo(circle, event);
        }
    }
    
    // private
    function createPolygon(event){
        var type = event.type;
        
        var path = GeoViewer.parsePath(event.geometria.valore);
        if (path.length < 1) {
            return;
        }
        var polygonStyle = getStyleProperty(type, "polygon");
        if (polygonStyle == null) {
            polygonStyle = {};
        }
        
        var polygon = new google.maps.Polygon(polygonStyle);
        polygon.setPaths([path]);
        if (!eventLazyShowMode) {
            polygon.setMap(map);
        }
        polygonCache.push(polygon);
        
        provideEventInfo(polygon, event);
        
        polygonStyle = (polygonStyle["addMarker"] || null);
        if (polygonStyle == "first") {
            provideMarker(event, path[0]);
        }
        else if (polygonStyle == "last") {
            provideMarker(event, path[path.length - 1]);
        }
        else if (polygonStyle == "center") {
        	provideMarker(event, centroidOfPoints(path));
            
        }
    }
    
    // private
    function createPolyline(event){
        var type = event.type;

        var path = GeoViewer.parsePath(event.geometria.valore);
        if (path.length < 1) {
            return;
        }
        
        var polylineStyle = getStyleProperty(type, "polyline");
        if (polylineStyle == null) {
            polylineStyle = {};
        }
        var polyline = new google.maps.Polyline(polylineStyle);
        // Don't know why a path must be enclosed in yet another
        // array, but this is so 
        polyline.setPath([path]);
        if (!eventLazyShowMode) {
            polyline.setMap(map);
        }
        
        polylineCache.push(polyline);
        
        provideEventInfo(polyline, event);
        
        polylineStyle = (polylineStyle["addMarker"] || null);
        if (polylineStyle == "first") {
            provideMarker(event, path[0]);
        }
        else if (polylineStyle == "last") {
            provideMarker(event, path[path.length - 1]);
        }
        else if (polylineStyle == "center") {
            provideMarker(event, midpointOnPath(path));
        }
    }
    
    
    // private
    function provideMarker(event, position){
        var title = event.title;
        var type = event.type;
        var id = event.id;

        var markerOptions = getStyleProperty(type, "marker");
        if (markerOptions == null) {
            markerOptions = {};
        }
        
        markerOptions.position = position;
        if (!eventLazyShowMode) {
            markerOptions.map = map;
        }
        markerOptions.title = title;
        markerOptions.id = id;
        
        
        var markerImageOptions = getStyleProperty(type, "markerimage");

        if (markerImageOptions != null) {
            markerOptions.icon = createMarkerImage(markerImageOptions);
            markerOptions.optimized = iconOptimized;
        }
        var marker = new google.maps.Marker(markerOptions);
        
        if (eventInfoHandler.isBlip(event)) {
            blipCache.push(marker);
        }
        else {
            markerCache.push(marker);
        }
        
        
        provideEventInfo(marker, event);
        
        return marker;
    }
    
    // private
    function provideEventInfo(gObject, event){
        google.maps.event.addListener(gObject, eventInfoOn, function(e){
            closeInfoWindow();
            openInfoWindow = eventInfoHandler.openInfoWindow(gObject, event, e.latLng, map);
            currentEvent = event;
        });
    }
    
    function provideGeocoderBounds(){
        var boundsOptions = getStyleProperty("geocoderRequest", "GeocoderBounds");
        
        if (boundsOptions != null) {
            var sw = new google.maps.LatLng(boundsOptions["sw"][0], boundsOptions["sw"][1]);
            var ne = new google.maps.LatLng(boundsOptions["ne"][0], boundsOptions["ne"][1]);
            return new google.maps.LatLngBounds(sw, ne);
        }
        else {
            return null;
        }
    }
    
    // private
    function closeInfoWindow(){
        if (openInfoWindow != null) {
            eventInfoHandler.closeInfoWindow(openInfoWindow);
        }
        
        currentEvent = null;
    }
    
    // private
    function ensureStyles(){
        if (!styles) {
            console.log("GeoViewer: styles are undefined");
            return false;
        }
        
        return true;
    }
    
    // private
    function ensureLoadingOverlay(){
        if (loadingOverlay == null) {
            var img = getStyleProperty("loadingOverlay", "LoadingImage");
            if (img != null) {
                loadingOverlay = new GeoLoadingOverlay(img[0], map);
            }
        }
    }
    // private
    function ensureCrosshairsOverlay(){
        if (crosshairsOverlay == null) {
            var h = getStyleProperty("crosshairsOverlay", "CrosshairsHorizontal");
            var v = getStyleProperty("crosshairsOverlay", "CrosshairsVertical");
            crosshairsOverlay = new GeoCrosshairsOverlay(h[0], h[1], v[0], v[1], map);
        }
    }
    // private
    // This works for small distances only!
    function midpointOnPath(path){
        if (path.length < 1) {
            return null;
        }
        else if (path.length == 1) {
            return path[0];
        }
        
        var length = 0;
        for (var i = 0; i < path.length - 1; i++) {
            length += segLength(path[i + 1], path[i]);
        }
        
        length /= 2;
        
        var runLength = 0;
        for (var i = 0; i < path.length - 1; i++) {
            var segment = segLength(path[i + 1], path[i]);
            runLength += segment;
            if (runLength >= length) {
                segment /= segment - (runLength - length);
                return new google.maps.LatLng(path[i].lat() + (path[i + 1].lat() - path[i].lat()) / segment, path[i].lng() + (path[i + 1].lng() - path[i].lng()) / segment);
            }
        }
    }
    
    // private
    // This works for small distances only!
    function centroidOfPoints(path){
        if (path.length < 1) {
            return null;
        }
        else if (path.length == 1) {
            return path[0];
        }
        
        var lat = 0;
        var lng = 0;
        for (var i = 0; i < path.length; i++) {
            lat += path[i].lat();
            lng += path[i].lng();
        }
        
        return new google.maps.LatLng(lat / path.length, lng / path.length);
    }
    
    
    // private
    function segLength(latLng1, latLng2){
        return Math.sqrt(Math.pow(latLng2.lat() - latLng1.lat(), 2) + Math.pow(latLng2.lng() - latLng1.lng(), 2));
    }
    
    // private
    function ensureMarkerImageOptions(markerImageOptions){
        if (markerImageOptions.length > 1) {
            markerImageOptions[1] = ensureSize(markerImageOptions[1]);
        }
        if (markerImageOptions.length > 2) {
            markerImageOptions[2] = ensurePoint(markerImageOptions[2]);
        }
        if (markerImageOptions.length > 3) {
            markerImageOptions[3] = ensurePoint(markerImageOptions[3]);
        }
        if (markerImageOptions.length > 4) {
            markerImageOptions[4] = ensureSize(markerImageOptions[4]);
        }
    }
    
    // private
    function ensureSize(item){
        if (item instanceof google.maps.Size) {
            return item;
        }
        else {
            var size = new google.maps.Size();
            google.maps.Size.prototype.constructor.apply(size, item);
            return size;
        }
    }
    
    // private
    function ensurePoint(item){
        if (item instanceof google.maps.Point) {
            return item;
        }
        else {
            var point = new google.maps.Point();
            google.maps.Point.prototype.constructor.apply(point, item);
            return point;
        }
    }
    
    // private
    function getStyleProperty(type, entry){
        return (styles[type] && styles[type][entry]) || (styles["default"] && styles["default"][entry]) || null;
    }
    
    // private
    function doNothing(){
    }
}

/*
// static
TogoViewer.parseXML = function(text){
    if (window.ActiveXObject) {
        var doc = new ActiveXObject('Microsoft.XMLDOM');
        doc.loadXML(text);
        return doc;
    }
    else if (window.DOMParser) {
        return (new DOMParser).parseFromString(text, 'text/xml');
    }
}
*/

// static
GeoViewer.parsePath = function(coords){
    // Trim
    coords = coords.replace(/^\s+|\s+$/g, '');
    // Only single spaces or comma as separator
    coords = coords.replace(/\s+/g, ' ').replace(/, /g, ',');
    var lines = coords.split(' ');
    
    var path = new Array();
    for (var i = 0; i < lines.length; i++) {
        var point = lines[i].split(',');
        var latLng = new google.maps.LatLng(point[0], point[1]);
        path.push(latLng);
    }
    
    return path;
}

// static
GeoViewer.nodeValue = function(node){
    if (!node) {
        return '';
    }
    else {
        return (node.innerText || node.text || node.textContent);
    }
}


function GeoDefaultEventInfo(){

    // public
    this.closeInfoWindow = function(){
        infoWindow.close();
    }
    
    // public
    this.openInfoWindow = function(gObject, event, latLng, map){
        var href = event.getAttribute("href");
        
        if (href != null) {
            var id = event.getAttribute("id");
            var href = event.getAttribute("href");
            
            return window.open(href + "?id=" + id);
        }
        else {
            var infoWindow = new google.maps.InfoWindow();
            var description = GeoViewer.nodeValue(event.getElementsByTagName('Description')[0]);
            
            infoWindow.setContent(description);
            if (gObject instanceof google.maps.Marker) {
                infoWindow.open(map, gObject);
            }
            else {
                infoWindow.setPosition(latLng);
                infoWindow.open(map);
            }
            
            return infoWindow;
        }
    }
    
    // public
    this.isBlip = function(event){
        return false;
    }
}

// class
function GeoLoadingOverlay(image, map){
    var div = map.getDiv();
    var loading = document.createElement("img");
    
    loading.src = image;
    loading.style.visibility = "hidden";
    div.appendChild(loading);
    
    this.show = function(){
        pack();
        
        loading.style.visibility = "visible";
    }
    
    this.hide = function(){
        loading.style.visibility = "hidden";
    }
    
    // Private
    function pack(){
        var size = div.clientHeight * 0.2;
        
        loading.style.width = size + 'px';
        loading.style.height = size + 'px';
        loading.style.border = '0';
        loading.style.position = 'absolute';
        loading.style.top = ((div.clientHeight - size) / 2) + 'px';
        loading.style.left = ((div.clientWidth - size) / 2) + 'px'
        loading.style.zIndex = '500'; // Make sure it is on top		
    }
};

// class
function GeoCrosshairsOverlay(hImage, hImageSize, vImage, vImageSize, map){
    var div = map.getDiv();
    var hSize = hImageSize;
    var vSize = vImageSize;
    var hCrosshairs = document.createElement("img");
    var vCrosshairs = document.createElement("img");
    
    hCrosshairs.src = hImage;
    hCrosshairs.style.visibility = "hidden";
    div.appendChild(hCrosshairs);
    
    vCrosshairs.src = vImage;
    vCrosshairs.style.visibility = "hidden";
    div.appendChild(vCrosshairs);
    
    this.show = function(){
        pack();
        
        hCrosshairs.style.visibility = "visible";
        vCrosshairs.style.visibility = "visible";
    }
    
    this.hide = function(){
        hCrosshairs.style.visibility = "hidden";
        vCrosshairs.style.visibility = "hidden";
    }
    
    // Private
    function pack(){
        hCrosshairs.style.width = hSize[0] + 'px';
        hCrosshairs.style.height = hSize[1] + 'px';
        hCrosshairs.style.border = '0';
        hCrosshairs.style.position = 'absolute';
        hCrosshairs.style.left = ((div.clientWidth - hSize[0]) / 2) + 'px'
        hCrosshairs.style.top = ((div.clientHeight - hSize[1]) / 2) + 'px';
        hCrosshairs.style.zIndex = '500'; // Make sure it is on top
        vCrosshairs.style.width = vSize[0] + 'px';
        vCrosshairs.style.height = vSize[1] + 'px';
        vCrosshairs.style.border = '0';
        vCrosshairs.style.position = 'absolute';
        vCrosshairs.style.left = ((div.clientWidth - vSize[0]) / 2) + 'px'
        vCrosshairs.style.top = ((div.clientHeight - vSize[1]) / 2) + 'px';
        vCrosshairs.style.zIndex = '500'; // Make sure it is on top		
    }
    
};
