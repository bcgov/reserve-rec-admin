export class Constants {
  public static readonly dataIds = {
    SEARCH_RESULTS: 'searchResults',
    PASSIVE_SEARCH_RESULTS: 'passiveSearchResults',
    GEOZONE_RESULT: 'geozoneResult',
    GEOZONES_RESULT: 'geozonesResult',
    ACTIVITY_RESULT: 'activityResult',
    ACTIVITIES_RESULT: 'activitiesResult',
    EDIT_ACTIVITY: 'editActivity',
    FACILITY_RESULT: 'facilityResult',
    FACILITIES_RESULT: 'facilitiesResult',
    PROTECTED_AREA_RESULT: 'protectedAreaResult',
    PROTECTED_AREAS_RESULT: 'protectedAreasResult',
  };

  public static readonly timeZoneIANA = 'America/Vancouver';

  public static readonly facilityTypes = {
    noType: {
      display: 'No Type',
      value: 'noType',
      iconClass: 'fa-solid fa-location-dot',
      subTypes: {}
    },
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

  public static readonly activityTypes = {
    noType: {
      display: 'No Type',
      value: 'noType',
      iconClass: 'fa-solid fa-campground',
      subTypes: {}
    },
    frontcountryCamp: {
      display: 'Frontcountry Camping',
      value: 'frontcountryCamp',
      iconClass: 'fa-solid fa-campground',
      subTypes: {
        campsite: { display: 'Campsite', value: 'campsite', iconClass: 'fa-solid fa-campground' },
        walkin: { display: 'Walk-in Campsite', value: 'walkin', iconClass: 'fa-solid fa-walking' },
        rv: { display: 'RV Campsite', value: 'rv', iconClass: 'fa-solid fa-caravan' }
      }
    },
    backcountryCamp: {
      display: 'Backcountry Camping',
      value: 'backcountryCamp',
      iconClass: 'fa-solid fa-mountain',
      subTypes: {
        reservation: { display: 'Reservation', value: 'reservation', iconClass: 'fa-solid fa-calendar-check' },
        passport: { display: 'Passport', value: 'passport', iconClass: 'fa-solid fa-passport' },
      }
    },
    groupCamp: {
      display: 'Group Camping',
      value: 'groupCamp',
      iconClass: 'fa-solid fa-users',
      subTypes: {}
    },
    dayuse: {
      display: 'Day Use',
      value: 'dayuse',
      iconClass: 'fa-solid fa-tree',
      subTypes: {
        vehicleParking: { display: 'Vehicle Parking', value: 'vehicleParking', iconClass: 'fa-solid fa-parking' },
        trailUse: { display: 'Trail Use', value: 'trailUse', iconClass: 'fa-solid fa-hiking' },
        shelterUse: { display: 'Shelter Use', value: 'shelterUse', iconClass: 'fa-solid fa-shelter' },
        saniUse: { display: 'Sani Use', value: 'saniUse', iconClass: 'fa-solid fa-toilet-paper' },
        showerUse: { display: 'Shower Use', value: 'showerUse', iconClass: 'fa-solid fa-shower' },
        electricUse: { display: 'Electric Use', value: 'electricUse', iconClass: 'fa-solid fa-bolt' }
      }
    },
    boating: {
      display: 'Boating',
      value: 'boating',
      iconClass: 'fa-solid fa-boat',
      subTypes: {
        dockMooring: { display: 'Dock Mooring', value: 'dockMooring', iconClass: 'fa-solid fa-anchor' },
        buoyMooring: { display: 'Buoy Mooring', value: 'buoyMooring', iconClass: 'fa-solid fa-anchor' }
      }
    },
    cabinStay: {
      display: 'Cabin Stay',
      value: 'cabinStay',
      iconClass: 'fa-solid fa-house',
      subTypes: {
        frontcountry: { display: 'Frontcountry Cabin', value: 'frontcountry', iconClass: 'fa-solid fa-house' },
        backcountry: { display: 'Backcountry Cabin', value: 'backcountry', iconClass: 'fa-solid fa-mountain' }
      }
    },
    canoe: {
      display: 'Canoe',
      value: 'canoe',
      iconClass: 'fa-solid fa-water',
      subTypes: {
        portionCircuit: { display: 'Portion Circuit', value: 'portionCircuit', iconClass: 'fa-solid fa-water' },
        fullCircuit: { display: 'Full Circuit', value: 'fullCircuit', iconClass: 'fa-solid fa-water' }
      }
    }
  };

  public static readonly timezones = [
    { value: 'America/Vancouver', display: 'America/Vancouver (Pacific Time, PST/PDT)' },
    { value: 'America/Edmonton', display: 'America/Edmonton (Mountain Time, MST/MDT)' },
    { value: 'America/Fort_Nelson', display: 'America/Fort_Nelson (Mountain Time, MST)' }
  ];
}
