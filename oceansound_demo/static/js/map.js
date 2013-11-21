$(document).ready(function () {
    $(window).bind('resize', function() {
        $('#map').height($(window).height() - $('.navbar').height() - $('.footer').height());
    });
    $(window).resize();

    $('#help_modal').modal('show');
    $('#gotoexpl').click(function() {
      $('#helpTab a[href="#TabExpl"]').tab('show');
    });
    $('#gotocontrib').click(function() {
      $('#helpTab a[href="#TabContrib"]').tab('show');
    });

    OpenLayers.ImgPath = "/static/img/OpenLayers/dark/";

    var map = new OpenLayers.Map({
        div: 'map',
        theme: null,
        controls: [
            new OpenLayers.Control.TouchNavigation({
                dragPanOptions: {
                    enableKinetic: true
                }
            }),
            new OpenLayers.Control.Graticule({
                    layerName: 'Grid',
                    labelled: true,
                    lineSymbolizer: {
                        strokeColor: "#ffffff",
                        strokeWidth: 1,
                        strokeOpacity: 0.5
                    },
                    labelSymbolizer: {
                        fontColor: "#ffffff",
                        fontSize: "11px",
                        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
                    }
                }),
            new OpenLayers.Control.ZoomPanel()
        ],
        layers: [
            new OpenLayers.Layer.Google("Google Satellite",
                {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
            ),
            new OpenLayers.Layer.Google("Google Physical",
                {type: google.maps.MapTypeId.TERRAIN, numZoomLevels: 20}
            ),
            new OpenLayers.Layer.Google("Google Hybrid",
                {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20}
            ),
            new OpenLayers.Layer.Google("Google Streets",
                {numZoomLevels: 20}
            )
        ]
    });

    OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
        defaultHandlerOptions: {
            'single': true,
            'double': false,
            'pixelTolerance': 0,
            'stopSingle': false,
            'stopDouble': false
        },

        initialize: function(options) {
            this.handlerOptions = OpenLayers.Util.extend(
                {}, this.defaultHandlerOptions
            );
            OpenLayers.Control.prototype.initialize.apply(
                this, arguments
            );
            this.handler = new OpenLayers.Handler.Click(
                this, {
                    'click': this.trigger
                }, this.handlerOptions
            );
        },
    });

    MIDI.loadPlugin({
      soundfontUrl: "/static/soundfont/",
      instrument: "acoustic_grand_piano",
      callback: function () {},
    });


    var pausePlayStop = function(stop) {
        var d = document.getElementById("pausePlay");
        if (stop) {
            MIDI.Player.stop();
            d.src = "/static/img/MIDI/play.png";
        } else if (MIDI.Player.playing) {
            d.src = "/static/img/MIDI/play.png";
            MIDI.Player.pause(true);
        } else {
            d.src = "/static/img/MIDI/pause.png";
            MIDI.Player.resume();
        }
    };


    var MIDIPlayerPercentage = function(player) {
        // update the timestamp
        var time1 = document.getElementById("time1");
        var time2 = document.getElementById("time2");
        var capsule = document.getElementById("capsule");
        var timeCursor = document.getElementById("cursor");
        //
        Event.add(capsule, "drag", function (event, self) {
            Event.cancel(event);
            player.currentTime = (self.x) / $("#capsule").height() * player.endTime;
            if (player.currentTime < 0) player.currentTime = 0;
            if (player.currentTime > player.endTime) player.currentTime = player.endTime;
            if (self.state === "down") {
                player.pause(true);
            } else if (self.state === "up") {
                player.resume();
            }
        });
        //
        function timeFormatting(n) {
            var minutes = n / 60 >> 0;
            var seconds = String(n - (minutes * 60) >> 0);
            if (seconds.length == 1) seconds = "0" + seconds;
            return minutes + ":" + seconds;
        };
        player.setAnimation(function(data, element) {
            var percent = data.now / data.end;
            var now = data.now >> 0; // where we are now
            var end = data.end >> 0; // end of song
            // display the information to the user
            timeCursor.style.width = (percent * 100) + "%";
            time1.innerHTML = timeFormatting(now);
            time2.innerHTML = "-" + timeFormatting(end - now);
        });
    };

    $("#pausePlay").click(function () {
      pausePlayStop();
    });

    $("#stopPlay").click(function () {
      pausePlayStop(true);
    });

    var clickControl = new OpenLayers.Control.Click( {
          trigger: function(e) {
            var lonlat = map.getLonLatFromPixel(e.xy);
            var proj = new OpenLayers.Projection("EPSG:4326");
            lonlat.transform(map.getProjectionObject(), proj);

          $.ajax({
            url: '/music',
            dataType: 'json',
            data: {
              'lat': lonlat.lat,
              'lon': lonlat.lon
            },
            success: function( data ) {
                MIDI.Player.timeWarp = 1;
                MIDI.Player.loadFile(
                  "data:audio/midi;base64," + data.music,
                  MIDI.Player.start);
                MIDIPlayerPercentage(MIDI.Player);

                var d1 = [];
                for (var i = 0; i < data.series.length; i++) {
                    d1.push([i, data.series[i]]);
                }

                plt = $.plot("#placeholder", [d1], {
                  'grid': {
                    'backgroundColor': 'white',
                  },
                });
                MIDI.Player.removeListener()
                MIDI.Player.addListener(function(music) {
                  plt.unhighlight();
                  plt.highlight(0, music.now / music.end * data.series.length);
                });
            },
            error: function( data ) {
              alert("ERROR in the backend");
            }
          });

        }
    });

    map.addControl(clickControl);
    clickControl.activate();

    // add event listener for base layers
    $('#layers').on('click', '.base-layer', function (event) {
        // activate layer
        var name = $(this).text();
        for (var i=0; i<map.layers.length; i++) {
            if (map.layers[i].name == name) {
                map.setBaseLayer(map.layers[i]);
            }
        }
        $('.base-layer').each(function(index, element) {
            if ($(element).text() == name) {
                $(element).addClass('active-layer');
            } else {
                $(element).removeClass('active-layer');
            }
        });
    });

    // add event listener for overlays
    $('#layers').on('click', '.overlay', function (event) {
        // activate layer
        var name = $(this).text();
        for (var i=0; i<map.layers.length; i++) {
            if (map.layers[i].name == name) {
                map.layers[i].setVisibility(!map.layers[i].visibility);
            }
        }
        $('.overlay').each(function(index, element) {
            if ($(element).text() == name) {
                $(element).toggleClass('active-layer');
            }
        });
    });

    // add layers to "Layers" menu
    for (var i=0; i<map.layers.length; i++) {
        var layer = map.layers[i];
        if (layer.isBaseLayer) {
            if (layer.getVisibility()) {
                $('#layers .divider').before('<li><a href="#" class="base-layer active-layer">' + layer.name + '</a></li>');
            } else {
                $('#layers .divider').before('<li><a href="#" class="base-layer">' + layer.name + '</a></li>');
            }
        } else {
            if (layer.getVisibility()) {
                $('#layers .divider').after('<li><a href="#" class="overlay active-layer">' + layer.name + '</a></li>');
            } else {
                $('#layers .divider').after('<li><a href="#" class="overlay">' + layer.name + '</a></li>');
            }
        }
    }

    // find user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var point = new OpenLayers.LonLat(position.coords.longitude, position.coords.latitude);
            var proj = new OpenLayers.Projection("EPSG:4326");
            point.transform(proj, map.getProjectionObject());
            map.setCenter(point, 5);
        });
    } else {
        map.setCenter(new OpenLayers.LonLat(0, 0), 2);
    }

    $('#fullscreen').click(function() {
        BigScreen.toggle();
        return false;
    });
});
