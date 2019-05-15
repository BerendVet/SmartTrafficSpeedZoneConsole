
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

dbRefObject.on('value', snap => {
  data = snap.val();
  setUpZones();
});

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
      fillOpacity: 0.35
    });
  
    // add polygon to the map
    myPolygon.setMap(map);

    // save polygon in object to access it later
    zones[property] = myPolygon;

    // rightclick event
    google.maps.event.addListener(zones[property], 'rightclick', function(event) {
      console.log(event);
      console.log('right-click');
    });

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

//var myPolygon;
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
  } else if(!newZoneName.match(/^[0-9a-zA-Z]{1,16}$/)){
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
  } else if(!zone.match(/^[0-9a-zA-Z]{1,16}$/)){
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
  document.getElementById("mySidepanel").style.width = "300px";
}

/* Set the width of the sidebar to 0 (hide it) */
function closeNav() {
  document.getElementById("mySidepanel").style.width = "0";
}