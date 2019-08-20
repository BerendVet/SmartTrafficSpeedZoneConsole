
// Initialize Firebase
var config = {
  apiKey: "AIzaSyDK8dPiuMo8oulQktcxcIIdwQeofSCI980",
  authDomain: "smarttraffic-1c4e5.firebaseapp.com",
  databaseURL: "https://smarttraffic-1c4e5.firebaseio.com",
  projectId: "smarttraffic-1c4e5",
  storageBucket: "smarttraffic-1c4e5.appspot.com",
  messagingSenderId: "61696504385"
};
firebase.initializeApp(config);

const dbRefObject = firebase.database().ref().child('SpeedZones');

window.onscroll = function() {onScrolling()};

dbRefObject.on('value', snap => {
  data = snap.val();
  setUpZones();
});

var holdingZone;

// raw data
let data;

// zones
let zones = [];

// map
var map;

// zones that have to be deleted on save
let zonesToDelete = [];

// function that uses raw data from database to add the zones to the map and the sidebar
function setUpZones() {
  // remove zones from map
  removeZonesFromMap();

  // remove all sidebar zone items
  $(".sidebarItem").remove();

  var addListenersOnPolygon = function(polygon) {
    // rightclick event
    google.maps.event.addListener(polygon, 'rightclick', function(e) {
      // Check if click was on a vertex control point
      if (e.vertex == undefined) {
        return;
      }
      deleteMenu.open(map, zones[polygon.name].getPath(), e.vertex);
    });
  }

  for(var property in data) {

    // Polygon Coordinates
    var triangleCoords = [];
    for(var coord in data[property]["polygon"]) {
      triangleCoords.push(new google.maps.LatLng(data[property]["polygon"][coord]["lat"], data[property]["polygon"][coord]["lng"]));
    }

    // Styling & Controls
    myPolygon = new google.maps.Polygon({
      paths: triangleCoords,
      draggable: true,
      editable: true,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      name: property
    });
  
    // add polygon to the map
    myPolygon.setMap(map);

    addListenersOnPolygon(myPolygon);

    // save polygon in object to access it later
    zones[property] = myPolygon;

    var deleteMenu = new DeleteMenu();  

    // add sidebar item
    addSidebarItem(property);
  }    
}

function addSidebarItem(zoneName) {
 $("#mySidepanel").append(`
 <div class="sidebarItem" id="${zoneName}">
 <a href="#" class="zoneItem" onclick="onSideBarZoneClick('${zoneName}')">${zoneName}</a>
 <div class="zoneeditpnl">
  <a href="#" class="deletebtn" onclick="deleteZone('${zoneName}')">&times;</a>
  <a href="#" class="editbtn" onclick="renameZone('${zoneName}')">&#10000</a>
 </div>
 </div> `);
}

function onSideBarZoneClick(property) {
  var center = zones[property].getPath().getAt(0); // todo: take average of all coords
  map.panTo(center);
}


function removeZonesFromMap() {
  for(var zone in zones) {
    if(zones[zone] != null) 
      zones[zone].setMap(null);
  }
  zones = [];
}

function initialize() {
  // Map Center
  var myLatLng = new google.maps.LatLng(51.53395,5.05228); // initial center to nederland
  // General Options
  var mapOptions = {
    zoom: 12,
    center: myLatLng,
    mapTypeId: google.maps.MapTypeId.RoadMap
  };

  // goolge map
  map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);
}

function getPolygonCoords(zoneName) {
  var len = zones[zoneName].getPath().getLength();

  var zone = {
    isLimited: true,
    polygon: [ ]
  }

  for (var i = 0; i < len; i++) {
    zone.polygon.push({
      lat: zones[zoneName].getPath().getAt(i).toUrlValue(5).split(',')[0],
      lng: zones[zoneName].getPath().getAt(i).toUrlValue(5).split(',')[1]
    });
  }

  return zone;
}

function renameZone(zone) {

  var newZoneName = prompt("Please enter a new name for this zone:");
  if (newZoneName == null || newZoneName == "") {
    return;
  } else if(data[newZoneName] != null) {
    alert("Name is taken");
  } else if(!zone.match(/^[0-9a-zA-Z_ ]{1,32}$/)){
    alert("You can only use letters and numbers");
  } else {
    // delete old reference in database
    zonesToDelete.push(zone);

    // change the entry in the zones object
    zones[newZoneName] = zones[zone];
    zones[zone] = null;

    // delete old sidebar item
    document.getElementById(zone).remove();

    // create new sidebar item
    addSidebarItem(newZoneName);
  }
}

function deleteZone(zone) {
  if (confirm("Are you sure you want to delete this zone")) {
    //signify that this zone has to be deleted
    zonesToDelete.push(zone);
    // remove sidebar item
    document.getElementById(zone).remove();
    // remove zone from map
    if(zones[zone] != null) 
      zones[zone].setMap(null);
  }
  
}

function cancelZoneChanges() {
  // cancel deletion
  zonesToDelete = [];
  // reload zones from firebase data
  setUpZones();
}

function saveZones() {
  // save/update
  for(let zone in zones) {
    if(zones[zone] != null) 
      dbRefObject.child(zone).update(getPolygonCoords(zone));
  }
  // delete
  for(let zone in zonesToDelete) {
    dbRefObject.child(zonesToDelete[zone]).remove();
  }
  zonesToDelete = [];
}

function addZone() {
  var zone = prompt("Please enter a name for the new zone:");
  if (zone == null || zone == "") {
    return;
  } else if(data[zone] != null) {
    alert("Name is taken");
  } else if(!zone.match(/^[0-9a-zA-Z_ ]{1,32}$/)){
    alert("You can only use letters and numbers");
  } else {
    createZone(zone);
    // dbRefObject.child(zone).update(getPolygonCoords(zone));
  }
}

function createZone(zone) {
  // Polygon Coordinates
  var triangleCoords = [];
  triangleCoords.push(new google.maps.LatLng(map.getCenter().lat() + 0.01, map.getCenter().lng() - 0.01));
  triangleCoords.push(new google.maps.LatLng(map.getCenter().lat() + 0.01, map.getCenter().lng() + 0.01));
  triangleCoords.push(new google.maps.LatLng(map.getCenter().lat() - 0.01, map.getCenter().lng() + 0.01));
  triangleCoords.push(new google.maps.LatLng(map.getCenter().lat() - 0.01, map.getCenter().lng() - 0.01));

  // Styling & Controls
  myPolygon = new google.maps.Polygon({
    paths: triangleCoords,
    draggable: true,
    editable: true,
    strokeColor: '#FF0000',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#FF0000',
    fillOpacity: 0.35
  });

  // add polygon to the map
  myPolygon.setMap(map);

  // save polygon in object to access it later
  zones[zone] = myPolygon;

  // add sidebar item
  addSidebarItem(zone);
}

/* Set the width of the sidebar to 250px (show it) */
function openNav() {
  document.getElementById("mySidepanel").style.width = "310px";
}

/* Set the width of the sidebar to 0 (hide it) */
function closeNav() {
  document.getElementById("mySidepanel").style.width = "0";
}

function straight_skeleton(poly, spacing)
{
	// http://stackoverflow.com/a/11970006/796832
  // Accompanying Fiddle: http://jsfiddle.net/vqKvM/35/
  
  console.log(poly);

	var resulting_path = [];
	var N = poly.length;
	var mi, mi1, li, li1, ri, ri1, si, si1, Xi1, Yi1;
	for(var i = 0; i < N; i++)
	{
    mi = (poly.getAt((i+1) % N).lng() - poly.getAt(i).lng())/(poly.getAt((i+1) % N).lat() - poly.getAt(i).lat());
    mi1 = (poly.getAt((i+2) % N).lng() - poly.getAt((i+1) % N).lng())/(poly.getAt((i+2) % N).lat() - poly.getAt((i+1) % N).lat());
    li = Math.sqrt((poly.getAt((i+1) % N).lat() - poly.getAt(i).lat())*(poly.getAt((i+1) % N).lat() - poly.getAt(i).lat())+(poly.getAt((i+1) % N).lng() - poly.getAt(i).lng())*(poly.getAt((i+1) % N).lng() - poly.getAt(i).lng()));
    li1 = Math.sqrt((poly.getAt((i+2) % N).lat() - poly.getAt((i+1) % N).lat())*(poly.getAt((i+2) % N).lat() - poly.getAt((i+1) % N).lat())+(poly.getAt((i+2) % N).lng() - poly.getAt((i+1) % N).lng())*(poly.getAt((i+2) % N).lng() - poly.getAt((i+1) % N).lng()));
    ri = poly.getAt(i).lat()+spacing*(poly.getAt((i+1) % N).lng() - poly.getAt(i).lng())/li;
    ri1 = poly.getAt((i+1) % N).lat()+spacing*(poly.getAt((i+2) % N).lng() - poly.getAt((i+1) % N).lng())/li1;
    si = poly.getAt(i).lng()-spacing*(poly.getAt((i+1) % N).lat() - poly.getAt(i).lat())/li;
    si1 = poly.getAt((i+1) % N).lng()-spacing*(poly.getAt((i+2) % N).lat() - poly.getAt((i+1) % N).lat())/li1;
    Xi1 = (mi1*ri1-mi*ri+si-si1)/(mi1-mi);
    Yi1 = (mi*mi1*(ri1-ri)+mi1*si-mi*si1)/(mi1-mi);
    // Correction for vertical lines
    if(poly.getAt((i+1) % N).lat() - poly.getAt(i % N).lat()==0)
    {
        Xi1 = poly.getAt((i+1) % N).lat() + spacing*(poly.getAt((i+1) % N).lng() - poly.getAt(i % N).lng())/Math.abs(poly.getAt((i+1) % N).lng() - poly.getAt(i % N).lng());
        Yi1 = mi1*Xi1 - mi1*ri1 + si1;
    }
    if(poly.getAt((i+2) % N).lat() - poly.getAt((i+1) % N).lat()==0 )
    {
        Xi1 = poly.getAt((i+2) % N).lat() + spacing*(poly.getAt((i+2) % N).lng() - poly.getAt((i+1) % N).lng())/Math.abs(poly.getAt((i+2) % N).lng() - poly.getAt((i+1) % N).lng());
        Yi1 = mi*Xi1 - mi*ri + si;
    }
    
    //console.log("mi:", mi, "mi1:", mi1, "li:", li, "li1:", li1);
    //console.log("ri:", ri, "ri1:", ri1, "si:", si, "si1:", si1, "Xi1:", Xi1, "Yi1:", Yi1);
    resulting_path.push(new google.maps.LatLng(Xi1, Yi1));

  }
  
  console.log(resulting_path);

	return resulting_path;
}

function updatePolygonPath() {
  
}

/**
 * A menu that lets a user delete a selected vertex of a path.
 * @constructor
 */
function DeleteMenu() {
  this.div_ = document.createElement('div');
  this.div_.className = 'delete-menu';
  this.div_.innerHTML = 'Delete';

  var menu = this;
  google.maps.event.addDomListener(this.div_, 'click', function() {
    menu.removeVertex();
  });
}
DeleteMenu.prototype = new google.maps.OverlayView();

DeleteMenu.prototype.onAdd = function() {
  var deleteMenu = this;
  var map = this.getMap();
  this.getPanes().floatPane.appendChild(this.div_);

  // mousedown anywhere on the map except on the menu div will close the
  // menu.
  this.divListener_ = google.maps.event.addDomListener(map.getDiv(), 'mousedown', function(e) {
    if (e.target != deleteMenu.div_) {
      deleteMenu.close();
    }
  }, true);
};

DeleteMenu.prototype.onRemove = function() {
  google.maps.event.removeListener(this.divListener_);
  this.div_.parentNode.removeChild(this.div_);

  // clean up
  this.set('position');
  this.set('path');
  this.set('vertex');
};

DeleteMenu.prototype.close = function() {
  this.setMap(null);
};

DeleteMenu.prototype.draw = function() {
  var position = this.get('position');
  var projection = this.getProjection();

  if (!position || !projection) {
    return;
  }

  var point = projection.fromLatLngToDivPixel(position);
  this.div_.style.top = point.y + 'px';
  this.div_.style.left = point.x + 'px';
};

/**
 * Opens the menu at a vertex of a given path.
 */
DeleteMenu.prototype.open = function(map, path, vertex) {
  this.set('position', path.getAt(vertex));
  this.set('path', path);
  this.set('vertex', vertex);
  this.setMap(map);
  this.draw();
};

/**
 * Deletes the vertex from the path.
 */
DeleteMenu.prototype.removeVertex = function() {
  var path = this.get('path');
  var vertex = this.get('vertex');

  if (!path || vertex == undefined) {
    this.close();
    return;
  }

  path.removeAt(vertex);
  this.close();
};