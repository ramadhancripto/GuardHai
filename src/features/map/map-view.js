/* ==========================================================================
   GuardHai · features/map/map-view.js
   Map screen: Leaflet initialisation and the safety-pins layer.
   ========================================================================== */

let mainMapInstance = null;
function initMainMap() {
   if (mainMapInstance) {
   mainMapInstance.invalidateSize();
   return;
    }

    mainMapInstance = L.map('mainMap', { zoomControl: false }).setView([-6.8184, 39.2790], 16);

    // REALISTIC HYBRID SATELLITE LAYER (Google Maps Hybrid)
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '© Google Maps Satellite View'
    }).addTo(mainMapInstance);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            mainMapInstance.setView([pos.coords.latitude, pos.coords.longitude], 17);
            L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(mainMapInstance).bindPopup("<b>Real Satellite GPS Location</b>").openPopup();
        });
    }
}

// DOM INITIALIZATION

window.mainMapInstance = mainMapInstance;
window.initMainMap = initMainMap;
export { mainMapInstance, initMainMap };
