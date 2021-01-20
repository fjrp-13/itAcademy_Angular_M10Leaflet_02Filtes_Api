const APP_CONFIG = {
	apiRestaurants: "./api/apiRestaurants.php",
	defaultLocation: {
		lat: 41.400,
		lng: 2.206
	},
	defaultMapZoom: 14,
	mapTileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
};

const MARKER_RESTAURANT_TEMPLATE = [
	'<div class="rest-marker">',
		'<div class="rest-marker-name">{{NAME}}</div>',
		'{{PHOTO}}',
		'<div class="rest-marker-address">{{ADDRESS}}</div>',
		'{{COORDINATES}}',
		'<div class="rest-marker-kind_food">{{KIND_FOOD}}</div>',
	'</div>'
].join('');

const MARKER_RESTAURANT_PHOTO_TEMPLATE = [
	'<div class="rest-marker-photo">',
		'<img src="img/{{IMG_NAME}}">',
	'</div>'
].join('');

const MARKER_RESTAURANT_COORDINATES_TEMPLATE = [
	'<div class="rest-marker-location">',
		'Latitud: {{LAT}} | Longitud: {{LNG}}',
	'</div>',
].join('');

var map;
var tiles;
//en el clusters almaceno todos los markers
var markers = L.markerClusterGroup();
var data_markers = [];

// jqReady
$(function() {
	// Control de la geolocation
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(setupMap, geolocationError);
	} else {
		setupMap();
	}

	// Change del selector
	$('#kind_food_selector').on('change', function() {
		render_to_map(data_markers, this.value);
	});
});

/* Control de error en la geolocalización (usuario deniega acceso, timeout, ...) */
function geolocationError(error) {
	setupMap();
}

function setupMap(position) {
	var latlng;
	if (position == null || position == undefined) {
		latlng = new L.LatLng(APP_CONFIG.defaultLocation.lat, APP_CONFIG.defaultLocation.lng);
	} else {
		latlng = new L.LatLng(position.coords.latitude, position.coords.longitude);
	}
	map = L.map('mapid').on('load', onMapLoad).setView(latlng, APP_CONFIG.defaultMapZoom);
	// tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);
	tiles = L.tileLayer(APP_CONFIG.mapTileLayer, {}).addTo(map);
}

function onMapLoad() {
	loadRestaurants();
}

function render_to_map(data_markers,filter){
	var marker;
	markers.clearLayers(); // Limpiar los marcadores
	if (filter === undefined || filter === null) {
		filter = '';
	}

	$.each(data_markers, function(index, item) {
		if (showThisRestaurant(item, filter)) { // Filtrar los restaurantes
			marker = L.marker([item.lat, item.lng]);
			marker.bindPopup(setRestaurantMarkerContent(item, MARKER_RESTAURANT_TEMPLATE));
			markers.addLayer(marker);
		}
	});
	map.addLayer(markers);
}

/* Crea el contenido "coordenadas" del marker
	@Params:
		- lat: latitud
		- lng: longitud
		- template: template a utilizar
	@Return:
		- string con el contenido "coordenadas"
 */
function formatLocationForMarker(lat, lng, template) {
	var coord = '';
	lat = lat || '';
	lng = lng || '';

	if ((lat+lng).trim().length > 0) {
		coord = template.replaceAll('{{LAT}}', lat).replaceAll('{{LNG}}', lng);
	}
	return coord;
}

/* Crea el contenido "imagen" del marker
	@Params:
		- photo: nombre de la foto
		- template: template a utilizar
	@Return:
		- string con el contenido "imagen"
 */
function formatPhotoForMarker(photo, template) {
	var img = '';
	if ((photo || '').trim().length > 0) {
		img = template.replaceAll('{{IMG_NAME}}', photo)
	}
	return img;
}

/* Crea el contenido del marker
	@Params:
		- restaurant: json con los datos del restaurante
		- template: template a utilizar
	@Return:
		- string con el contenido a mostrar por el marker
 */
function setRestaurantMarkerContent(restaurant, template) {
	var content = template
	.replaceAll('{{NAME}}', restaurant.name || '')
	.replaceAll('{{PHOTO}}', formatPhotoForMarker(restaurant.photo, MARKER_RESTAURANT_PHOTO_TEMPLATE))
	.replaceAll('{{ADDRESS}}', restaurant.address || '')
	.replaceAll('{{COORDINATES}}', formatLocationForMarker(restaurant.lat, restaurant.lng, MARKER_RESTAURANT_COORDINATES_TEMPLATE))
    .replaceAll('{{KIND_FOOD}}', restaurant.kind_food || '');

    return content;
}

/* Llama a la API para obtener el json de Restaurantes y los configura (selector y markers) */
function loadRestaurants() {
    $.ajax({
        url: APP_CONFIG.apiRestaurants,
        dataType: 'json'
    }).done(function( data, textStatus, jqXHR ) {
		setupRestaurants(data);
    });
}
/* Configura los restaurantes.
	@Params:
		- data: restaurantes a configurar (formato array json)

*/
function setupRestaurants(data) {
	// Array con los valores del Selector
	var arrKindFood = [];

	$.each(data, function (index, item) { 
		updateKindFood(arrKindFood, item.kind_food);
		updateMarkers(item);
	});
	// inicializa el selector
	initKindFoodSelector(arrKindFood);
	// Añadir los marcadores al mapa (sin ningún filtro)
	render_to_map(data_markers,'');
}


/* Actualiza el array con los valores para el selector.
	@Params:
		- arrKindFood: array con los valores ya añadidos
		- kindFood: nuevos valores para el array (formato csv)
 */
function updateKindFood(arrKindFood, kindFood) {
	if (kindFood != null) {
		var _arr = kindFood.split(',');
		$.each(_arr, function(index, value) {
			if (!arrKindFood.includes(value)) {
				arrKindFood.push(value); // añadir el nuevo valor
			}
		});
	}
}

/* Inicializa el selector de tipos de comida.
	@Params:
		- arrKindFood: array con los valores ya añadidos
 */
function initKindFoodSelector(arrKindFood) {
	var $kfSelector = $('#kind_food_selector').empty().append($('<option>').val("").text("Todos"));
	$.each(arrKindFood.sort(), function(index, item) {
		$kfSelector.append($('<option>').val(item).text(item));
	});
}

/* Actualiza el array con los markers.
	@Params:
		- item: json del restaurante
 */
function updateMarkers(item) {
	if (item.kind_food === null) {
		item.kind_food = '';
	}
	data_markers.push(item);
}

/* Filtra si el restaurante se debe mostrar en el mapa
	@Params:
		- item: json del restaurante
		- filter: filtro a utilizar
	@Return:
		- true: si el restaurante cumple con el filtro
		- false: si el restaurante NO cumple con el filtro
 */
function showThisRestaurant(item, filter){
	if (filter.trim().length == 0) {
		return true;
	}

	if (!item.kind_food) {
		return false;
	}
	return item.kind_food.split(',').includes(filter);
}
