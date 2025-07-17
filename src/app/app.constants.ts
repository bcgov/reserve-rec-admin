export class Constants {
  public static readonly dataIds = {
    SEARCH_RESULTS: 'searchResults',
    PASSIVE_SEARCH_RESULTS: 'passiveSearchResults',
    GEOZONE_RESULT: 'geozoneResult',
    FACILITY_RESULT: 'facilityResult',
    CURRENT_PROTECTED_AREA: 'currentProtectedArea',
    PROTECTED_AREAS_RESULTS: 'protectedAreasResults',
    PROTECTED_AREAS_LIST: 'protectedAreasList',
    LOADING_PROTECTED_AREA_UPDATE: 'loadingProtectedAreaUpdate',
  };

  public static readonly timeZoneIANA = 'America/Vancouver';

  public static facilityTypes = {
    campground: {
      display: 'Campground',
      value: 'campground',
      iconClass: 'fa-solid fa-campground',
      subTypes: {}
    },
    naturalFeature: {
      display: 'Natural Feature',
      value: 'naturalFeature',
      iconClass: 'fa-solid fa-mountain',
      subTypes: {
        waterfall: { display: 'Waterfall', value: 'waterfall', iconClass: 'fa-solid fa-water' },
        lake: { display: 'Lake', value: 'lake', iconClass: 'fa-solid fa-water' },
        river: { display: 'River', value: 'river', iconClass: 'fa-solid fa-water' },
        summit: { display: 'Summit', value: 'summit', iconClass: 'fa-solid fa-mountain' },
        bay: { display: 'Bay', value: 'bay', iconClass: 'fa-solid fa-water' },
        pointofInterest: { display: 'Point of Interest', value: 'pointofInterest', iconClass: 'fa-solid fa-map-marker-alt' },
      }
    },
    accessPoint: {
      display: 'Access Point',
      value: 'accessPoint',
      iconClass: 'fa-solid fa-signs-post',
      subTypes: {}
    },
    structure: {
      display: 'Structure',
      value: 'structure',
      iconClass: 'fa-solid fa-building',
      subTypes: {
        bridge: { display: 'Building', value: 'building', iconClass: 'fa-solid fa-building' },
        parkingLot: { display: 'Parking Lot', value: 'parkingLot', iconClass: 'fa-solid fa-square-parking' },
        boatLaunch: { display: 'Boat Launch', value: 'boatLaunch', iconClass: 'fa-solid fa-sailboat' },
        yurt: { display: 'Yurt', value: 'yurt', iconClass: 'fa-solid fa-tent' },
    }
  },
    trail: {
      display: 'Trail',
      value: 'trail',
      iconClass: 'fa-solid fa-hiking',
      subTypes: {}
    }
  };
}
