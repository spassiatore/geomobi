//<debug>
Ext.Loader.setPath({
    'Ext': 'touch/src',
    'geomobi': 'app'
});
//</debug>

Ext.require('Ext.device.Geolocation');
Ext.require('Ext.device.Connection');

Ext.application({
    name: 'geomobi',

    requires: [
        'Ext.Panel',
		'Ext.Map'        
    ],

    views: ['Offline','Main','Evento','Info','AroundMe'],
    stores: ['Events'],
    models: ['Event'],

    controllers: ['Main','Evento','Facebook'],
    icon: {
        '57': 'resources/icons/Icon.png',
        '72': 'resources/icons/Icon~ipad.png',
        '114': 'resources/icons/Icon@2x.png',
        '144': 'resources/icons/Icon~ipad@2x.png'
    },

    isIconPrecomposed: true,

    startupImage: {
        '320x460': 'resources/startup/320x460.jpg',
        '640x920': 'resources/startup/640x920.png',
        '768x1004': 'resources/startup/768x1004.png',
        '748x1024': 'resources/startup/748x1024.png',
        '1536x2008': 'resources/startup/1536x2008.png',
        '1496x2048': 'resources/startup/1496x2048.png'
    },
    
    config: {
	    baseUrl: 'http://geomobi.055055.it',
	    //baseUrl: 'http://localhost/geomobi-server',
        appId: 1,
    	lsLastMapCenter: 'GEOmobi.LMC',
	    lsLastMapZoom: 'GEOmobi.LZ',
	    useComments: false,
	    useFacebook: true,
	    defaultLang: 'it',
	    analyticsCode: 'UA-35239897-1',
	    facebookAppId: '302909829807855',
	    lang:{
	    	it:{
	    		locate: 'Mia posizione',
	    		offlineTitle:'Ops...',
	    		offlineMsg: 'Sembra che non sia disponibile una connessione ad internet. L\'app si riattiver&agrave; non appena possibile...',
				defaultLoadingMsg: 'Caricamento...',
	    		mapTabTitle: 'Mappa',
	    		genericErrorTitle: 'Errore',
	    		infoText: '<div style="text-align: center; margin: 0 auto;"><div style="margin-bottom: 10px;">un progetto di</div><img src="resources/images/logo_lc_rilievo.png" style="width: 200px" /><div> </div></div>',
				eventsLoadingMsg: 'Carico eventi...',
				reloadEvents: '<strong>%1</strong> secondi all\'aggiornamento degli eventi<br />Clicca qui per interrompere.',
				getPosition: 'Attendo dati da GPS...',
				geolocalizationError: 'Informazione non disponibile. Assicurarsi di aver abilitato l\'applicazione ad utilizzare i dati del GPS!',
				close: 'Chiudi'
	    	}
	    }
    },

    listeners: {
    	onlinechange: function(oldOnline, newOnline){
    		switch(newOnline){
    			case true:
    				if(oldOnline == false){
						this.showOfflinePanel(false);
						//Restarto l'applicazione
						window.location.assign("index.html");
    				}
    				break;
    			case false:
					if(oldOnline != false) this.showOfflinePanel(true);
    				break;
    		}
    	}
    },

	setOnLine: function(){
		var ret;

		if(Ext.os.is.Android){
			if(Ext.device.Connection.isOnline()) ret = true;
			else ret = false;
		}
		else{
			if(window.navigator.onLine) ret = true;
			else ret = false;
		}
		
		if(this.isOnLine != ret) this.fireEvent('onlinechange', this.isOnLine, ret);
		this.isOnLine = ret;

		//Imposto il controllo automatico
		if(!this.onLineInterval){

			var me = this;
			var interval = 3000;

			this.onLineInterval = setInterval(
				function(){me.setOnLine();},
			interval);
		}
	},
	
	showOfflinePanel: function(visible){
		if(visible){
	        if (!this.offlinepanel) this.offlinepanel = Ext.Viewport.add({xtype: 'offline'});
	        this.offlinepanel.show();
		}
		else {
	        if (this.offlinepanel) this.offlinepanel.hide(); 
		}
	},
	
	loadExtraFiles: function(){
		var me = this;
		me.loadAnalyticsCode();
		
		me.loadJsFile("https://www.google.com/jsapi", function(){
			
			google.load('maps', 3, {
            	callback: function(){
					me.loadJsFile("app/other/infobox.js", function(){
						me.loadJsFile("app/other/GeoViewer.js", function(){
							me.loadJsFile("app/other/GeoViewerCallbackEventInfo.js", function(){
								me.mainLaunch();
							});
						});
					});				},
            	other_params: 'sensor=true&language=it'}
			)
		});
		
	},

	loadAnalyticsCode: function(cb){
		var _gaq = _gaq || [];
		_gaq.push(['_setAccount', this.config.analyticsCode]);
		_gaq.push(['_trackPageview']);

		var ga = document.createElement('script'); 
		ga.type = 'text/javascript'; 
		ga.async = true;
		ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
		var s = document.getElementsByTagName('script')[0]; 
		s.parentNode.insertBefore(ga, s);
	},
	
	loadJsFile: function(src, callback){
		var first_js = document.getElementsByTagName('script')[0];
		var js = document.createElement('script');
		js.src = src;

		if (js.addEventListener) { 
		  	js.addEventListener('load', function(){
				callback();
			}, false);
		} else {
		  	js.onreadystatechange = function() {
		    	if (js.readyState in {loaded: 1, complete: 1}) {
		     		 js.onreadystatechange = null;
		      		callback();
		    	}
		  	};
		}
		
		first_js.parentNode.insertBefore(js, first_js);
	},

	mainLaunch: function(){
    	
    	var mainController = geomobi.app.getController('Main');

        // Distruggo il loader
        //Ext.fly('logosplash').destroy();
	
		//Mostro il loader
		this.showLoader(geomobi.app.cl.defaultLoadingMsg);

		//Recupero le impostazioni dell'applicazione
		mainController.loadSettings(function(){
			
			//Deve determinare la posizione iniziale per la mappa
			mainController.setInitPosition(function(){
				
		        //Creo il main
		        var map = Ext.create('Ext.Map', {
        	    	title: geomobi.app.cl.mapTabTitle,
				    iconCls: 'maps',
				    id: 'map',
		            mapOptions : {
		                center : new google.maps.LatLng(
							mainController.getInitMap().initLat,
							mainController.getInitMap().initLng
		                ),
		                zoom : mainController.getInitZoom(),
		                mapTypeId : google.maps.MapTypeId.ROADMAP,
		                navigationControl: true,
		                navigationControlOptions: {
		                    position: google.maps.NavigationControlStyle.DEFAULT
		                },
		                streetViewControlOptions: {
		                	position: google.maps.ControlPosition.LEFT_CENTER
		                }
		            },
            	    listeners: {
						maprender: function(comp, gmap){
							//Inizializzo la mappa
							mainController.initMap(comp);
			
							mainController.placeNavMenu(comp, main);

							//mainController.placeLocate(comp, main);
				            mainController.defineGeolocation();
				            //Aggiungo il pannello del dettaglio dell'evento
							Ext.Viewport.add(Ext.create('geomobi.view.Evento'));
						}
					}
		        });


		        //Aggiungo la mainview al viewport
				var main = Ext.Viewport.add(Ext.create('geomobi.view.Main'));


				//Aggiungo la mappa alla mainView				
				main.add(map);

				if(Ext.isDefined(navigator.splashscreen)) navigator.splashscreen.hide();

				
				//Inserisco il pannello aroundme
				//main.add(Ext.create('geomobi.view.AroundMe'));

				//Inserisco il pannello delle info
				//main.add(Ext.create('geomobi.view.Info'));
	        });
		});		
	},

    launch: function() {
		//Inizializzo la lingua
		geomobi.lang = geomobi.app.setLocales('it');

		//Imposto il controllo della connessione internet		
		this.setOnLine();

    	this.loadExtraFiles();


		this.loadTemp();
		if((this.config.useFacebook) && (typeof FB != 'undefined')) {
			alert("init " + this.config.facebookAppId);
			FB.init({ appId: this.config.facebookAppId, nativeInterface: CDV.FB, useCachedDialogs: false });
		}
    },

	showLoader: function(msg){
		Ext.Viewport.setMasked({
		    xtype: 'loadmask',
		    cls: 'geoloader',
		    message: (Ext.isDefined(msg) ? msg : '') 
		});
	},
	
	hideLoader: function(){
		Ext.Viewport.setMasked(false);
	},

    onUpdated: function() {
        Ext.Msg.confirm(
            "Aggiornamento applicazione",
            "L'applicazione è stata aggiornata all'ultima versione. Rilanciarla?",
            function(buttonId) {
                if (buttonId === 'yes') {
                    window.location.reload();
                }
            }
        );
    },

    setLocales: function(language){
    	this.cl = geomobi.app.config.lang[language];
    },

    getLocales: function(){
    	return this.cl;
    },
	
	loadTemp: function(){
		if(Ext.browser.is.Chrome){
			//carico l'sdk di facebook
			
			var fbappid = this.config.facebookAppId;
			
			window.fbAsyncInit = function() {
			    FB.init({
			      appId      : fbappid, // App ID
			      status     : true, // check login status
			      cookie     : true, // enable cookies to allow the server to access the session
			      xfbml      : true  // parse XFBML
			    });
			    
    			FB.Event.subscribe('auth.statusChange', function(resp){
    				geomobi.app.getController('Facebook').setLogged(resp);
    			});
			};
		
			  // Load the SDK Asynchronously
			  (function(d){
			     var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
			     if (d.getElementById(id)) {return;}
			     js = d.createElement('script'); js.id = id; js.async = true;
			     js.src = "//connect.facebook.net/en_US/all.js";
			     ref.parentNode.insertBefore(js, ref);
			   }(document));

		}
	},

    existLocales: function(language){
    	return Ext.isDefined(geomobi.app.config.lang[language]);
    }
});
