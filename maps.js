// Real Google Maps for the map screens of the ParkGo web app.
// Needs window.PARKGO_CONFIG.googleMapsApiKey (config.js). Without a key the drawn maps stay.
(function () {
  var cfg = window.PARKGO_CONFIG || {};
  var KEY = (cfg.googleMapsApiKey || '').trim();
  if (!KEY) return;

  var ME = { lat: 25.1972, lng: 55.2744 }; // demo driver location: Downtown Dubai

  var DOWNTOWN = [
    { name: 'Boulevard P1', full: 'Downtown Boulevard P1', lat: 25.1950, lng: 55.2780, spaces: 128, type: 'paid' },
    { name: 'Burj Park', lat: 25.1925, lng: 55.2735, spaces: 42, type: 'free' },
    { name: 'Dubai Opera', lat: 25.1956, lng: 55.2712, spaces: 17, type: 'paid' },
    { name: 'Souk Al Bahar', lat: 25.1937, lng: 55.2768, spaces: 0, type: 'full' },
    { name: 'Old Town', lat: 25.1912, lng: 55.2797, spaces: 9, type: 'free' }
  ];
  var MARINA = [
    { name: 'Marina Walk', lat: 25.0790, lng: 55.1385, spaces: 36, type: 'free' },
    { name: 'Marina Mall', lat: 25.0767, lng: 55.1406, spaces: 58, type: 'paid' },
    { name: 'Marina Gate', lat: 25.0853, lng: 55.1470, spaces: 12, type: 'paid' },
    { name: 'Pier 7', lat: 25.0745, lng: 55.1376, spaces: 0, type: 'full' },
    { name: 'JBR Beach', lat: 25.0780, lng: 55.1330, spaces: 21, type: 'free' }
  ];

  var SCREENS = {
    home:      { center: { lat: 25.1945, lng: 55.2755 }, zoom: 16, sites: DOWNTOWN, me: true, padTop: 110, padBottom: 70 },
    homeback:  { center: { lat: 25.1950, lng: 55.2770 }, zoom: 16, sites: DOWNTOWN, me: true, selected: 'Boulevard P1', padTop: 110, padBottom: 190 },
    searchmap: { center: { lat: 25.0795, lng: 55.1400 }, zoom: 15, sites: MARINA, place: { lat: 25.0805, lng: 55.1403, name: 'Dubai Marina' }, padTop: 110, padBottom: 110 },
    route:     { route: true, padTop: 110, padBottom: 250 }
  };

  var ready = false, failed = false, pending = null, maps = {};

  function zoomFactor() {
    var d = document.querySelector('.device');
    var m = d && /scale\(([\d.]+)\)/.exec(d.style.transform);
    return m ? parseFloat(m[1]) : 1;
  }

  // The phone frame is CSS-scaled; render the map at native resolution inside it.
  function sizeContainer(div) {
    var z = zoomFactor();
    div.style.width = (100 * z) + '%';
    div.style.height = (100 * z) + '%';
    div.style.transform = 'scale(' + (1 / z) + ')';
    div.style.setProperty('--z', z);
  }

  function pinEl(site, selected) {
    var el = document.createElement('div');
    el.className = 'spin gpin' + (site.type === 'paid' ? ' paid' : site.type === 'full' ? ' full' : '') + (selected ? ' sel' : '');
    var label = site.type === 'full' ? 'Full' : site.spaces + ' · ' + (site.type === 'free' ? 'Free' : 'Paid');
    el.innerHTML = '<span class="p">P</span><span class="t"><b>' + site.name + '</b>' + label + '</span>';
    return el;
  }
  function dotEl(cls) { var el = document.createElement('div'); el.className = cls; return el; }
  function placeEl(name) {
    var el = document.createElement('div');
    el.className = 'gplace';
    el.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M12 23s8-7 8-13.5a8 8 0 1 0-16 0C4 16 12 23 12 23z" fill="#e5484d"/><circle cx="12" cy="9.5" r="3" fill="#fff"/></svg><span>' + name + '</span>';
    return el;
  }

  function create(id) {
    var conf = SCREENS[id];
    var view = document.getElementById('v-' + id);
    if (!conf || !view) return;
    var div = document.createElement('div');
    div.className = 'gmap';
    view.insertBefore(div, view.firstChild);
    sizeContainer(div);
    view.classList.add('has-gmap');

    var map = new google.maps.Map(div, {
      center: conf.center || ME, zoom: conf.zoom || 15, mapId: cfg.googleMapId || 'DEMO_MAP_ID',
      disableDefaultUI: true, clickableIcons: false, gestureHandling: 'greedy'
    });
    maps[id] = { map: map, div: div };
    var Adv = google.maps.marker.AdvancedMarkerElement;

    if (conf.me) new Adv({ map: map, position: ME, content: dotEl('me gme'), zIndex: 1 });
    if (conf.place) {
      new Adv({ map: map, position: conf.place, content: placeEl(conf.place.name), zIndex: 2 });
      new google.maps.Circle({ map: map, center: conf.place, radius: 650, strokeColor: '#1e9e5a', strokeOpacity: .8, strokeWeight: 1.5, fillColor: '#1e9e5a', fillOpacity: .08, clickable: false });
    }
    (conf.sites || []).forEach(function (s) {
      var m = new Adv({ map: map, position: s, content: pinEl(s, s.name === conf.selected), zIndex: 3, gmpClickable: true });
      m.addListener('click', function () { if (s.type !== 'full' && window.__parkgoGo) window.__parkgoGo('detail'); });
    });

    if (conf.route) drawRoute(map);
  }

  function drawRoute(map) {
    var dest = DOWNTOWN[0];
    var Adv = google.maps.marker.AdvancedMarkerElement;
    new Adv({ map: map, position: ME, content: dotEl('me gme') });
    new Adv({ map: map, position: dest, content: pinEl(dest, true) });
    var bounds = new google.maps.LatLngBounds(); bounds.extend(ME); bounds.extend(dest);
    var pad = { top: 120, bottom: 250, left: 40, right: 40 };
    var line = function (path) {
      new google.maps.Polyline({ map: map, path: path, strokeColor: '#1e9e5a', strokeWeight: 6, strokeOpacity: .95 });
      path.forEach(function (p) { bounds.extend(p); });
      map.fitBounds(bounds, pad);
    };
    try {
      new google.maps.DirectionsService().route({ origin: ME, destination: dest, travelMode: 'DRIVING' }, function (res, status) {
        if (status === 'OK') line(res.routes[0].overview_path);
        else line([ME, dest]); // Directions not enabled for this key: straight line
      });
    } catch (e) { line([ME, dest]); }
  }

  function onShow(id) {
    if (!SCREENS[id] || failed) return;
    if (!ready) { pending = id; return; }
    if (!maps[id]) create(id);
    else { sizeContainer(maps[id].div); google.maps.event.trigger(maps[id].map, 'resize'); }
  }
  window.ParkMaps = { onShow: onShow };

  window.gm_authFailure = function () {
    failed = true;
    document.querySelectorAll('.has-gmap').forEach(function (v) { v.classList.remove('has-gmap'); });
    document.querySelectorAll('.gmap').forEach(function (d) { d.remove(); });
    console.warn('ParkGo: Google Maps rejected the API key — check that Maps JavaScript API is enabled and this site is allowed.');
  };
  window.__parkgoMapsReady = function () {
    ready = true;
    var cur = document.querySelector('.view.on');
    onShow(pending || (cur && cur.id.slice(2)));
  };
  addEventListener('resize', function () { Object.keys(maps).forEach(function (k) { sizeContainer(maps[k].div); }); });

  var s = document.createElement('script');
  s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(KEY) + '&v=weekly&libraries=marker&loading=async&callback=__parkgoMapsReady';
  s.async = true;
  document.head.appendChild(s);
})();
