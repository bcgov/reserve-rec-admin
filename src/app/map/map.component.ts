import { AfterViewInit, Component, computed, effect, ElementRef, EventEmitter, Input, OnDestroy, Output, Signal, signal, ViewChild, WritableSignal } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { Map } from 'maplibre-gl';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLElement>;

  @Input() _markers = signal([]); // Signal to hold markers data
  @Input() _polygons = signal([]); // Signal to hold polygons data
  @Input() hideObjectsOutsideZoom = false; // Whether to hide objects outside the current zoom
  //level
  @Input() showGrips = true; // Whether to show grips for polygons

  @Output() markersChange = new EventEmitter<any[]>();
  @Output() gripsChange = new EventEmitter<any[]>();

  public map: Map | undefined;
  public markerArray: maplibregl.Marker[] = [];
  public polygonArray: any[] = []; // Array to hold polygon data
  public layerArray: any[] = []; // Array to hold layer data
  public isMapLoaded = false;

  constructor() {
    // Effect to watch for changes in markers signal
    effect(() => {
      if (this.isMapLoaded) {
        this.updateMap();
      }
    });
  }

  ngAfterViewInit(): void {
    this.createMap();

  }

  createMarker(coordinates: [number, number], options: any = {}) {
    if (!this.checkZoomLevelWithinObjectOptions(options)) {
      return {};
    }
    const marker = new maplibregl.Marker(options)
      .setLngLat(coordinates)
      .setPopup(new maplibregl.Popup().setHTML(`<strong>${options?.displayName}</strong>`)); // Optional popup
    this.markerArray.push(marker);
    marker.addTo(this.map!); // Add marker to the map
    marker.on('dragend', () => {
      const newCoordinates = marker.getLngLat();
      // Update the marker data in the signal
      const updatedMarkers = this._markers().map(m => {
        if (m.coordinates[0] === coordinates[0] && m.coordinates[1] === coordinates[1]) {
          return { ...m, coordinates: [newCoordinates.lng, newCoordinates.lat] };
        }
        return m;
      });
      this.markersChange.emit(updatedMarkers);
      this.updateMap();
    });
    return marker;
  }

  checkZoomLevelWithinObjectOptions(options) {
    if (!this.hideObjectsOutsideZoom) {
      return true;
    }
    if (options?.minZoom && this.map?.getZoom() < options.minZoom) {
      return false;
    }
    if (options?.maxZoom && this.map?.getZoom() > options.maxZoom) {
      return false;
    }
    return true;
  }

  createPolyGrip(coordinates: [number, number], options: any = {}) {
    if (!this.checkZoomLevelWithinObjectOptions(options)) {
      return {};
    }
    const grip = new maplibregl.Marker(options)
      .setLngLat(coordinates);
    grip.addTo(this.map!); // Add grip to the map
    grip.on('dragend', () => {
      const newCoordinates = grip.getLngLat();
      // Update the polygon data in the signal
      const updatedPolygons = this._polygons().map(p => {
        if (p.coordinates.includes(coordinates)) {
          return { ...p, coordinates: p.coordinates.map(coord => coord[0] === coordinates[0] && coord[1] === coordinates[1] ? [newCoordinates.lng, newCoordinates.lat] : coord) };
        }
        return p;
      });
      this.gripsChange.emit(updatedPolygons);
      this.updateMap();
    });
    return grip;
  }

  createPolygon(coordinates: [number, number][], options: any = {}) {
    if (!this.checkZoomLevelWithinObjectOptions(options)) {
      return {};
    }
    const grips = [];
    if (this.showGrips) {
      grips.push(this.createPolyGrip(coordinates[2], options?.gripAOptions));
      grips.push(this.createPolyGrip(coordinates[0], options?.gripBOptions));
    }
    const polygonId = `polygon-${Date.now()}`;
    this.map.addSource(polygonId, {
      'type': 'geojson',
      'data': {
        'type': 'Feature',
        'geometry': {
          'type': 'Polygon',
          'coordinates': [coordinates]
        },
        'properties': options // Optional properties for the polygon
      }
    });
    this.map.addLayer({
      'id': polygonId,
      'type': 'fill',
      'source': polygonId,
      'paint': {
        'fill-color': options?.fillColor || '#888888',
        'fill-opacity': options?.fillOpacity || 0.5, // Default opacity if not provided
      },
    });
    this.polygonArray.push({ id: polygonId, grips: grips });
    return polygonId;
  }

  updateMap() {
    this.markerArray.forEach(marker => marker.remove());
    this.polygonArray.forEach(polygon => {
      this.map.removeLayer(polygon?.id);
      if (polygon?.grips) {
        for (const grip of polygon.grips) {
          grip.remove();
        }
      }
    });
    this.polygonArray = [];
    this.markerArray = [];

    // Add markers from the signal
    this._markers().forEach(markerData => {
      if (markerData?.coordinates) {
        this.createMarker(markerData.coordinates, markerData.options);
      }
    });
    this._polygons().forEach(polygonData => {
      if (polygonData?.coordinates) {
        this.createPolygon(polygonData.coordinates, polygonData.options);
      }
    });
  }

  createMap() {
    if (this.mapContainer) {
      this.map = new Map({
        container: this.mapContainer?.nativeElement,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center: [-123.19, 48.24],
        zoom: 5,
        maxBounds: [
          [-141.06, 46.30], // Southwest coordinates of BC (approximate)
          [-112.03, 62.00]  // Northeast coordinates of BC (approximate)
        ],
        attributionControl: false
      });
      this.map.addControl(new maplibregl.NavigationControl());
    }
    this.map.on('load', () => {
      this.isMapLoaded = true;
      this.updateMap();
    });
  }

  test() {
    this.updateMap();
  }

  ngOnDestroy() {
    this.markerArray.forEach(marker => marker.remove());
    this.map?.remove();
  }

}
