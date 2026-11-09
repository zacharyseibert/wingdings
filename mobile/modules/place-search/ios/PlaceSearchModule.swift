import CoreLocation
import ExpoModulesCore
import MapKit

public class PlaceSearchModule: Module {
  private static let foodCategories: [MKPointOfInterestCategory] = [
    .restaurant, .cafe, .bakery, .brewery, .winery, .foodMarket, .nightlife,
  ]
  private static let searchSpanMeters: CLLocationDistance = 100_000

  public func definition() -> ModuleDefinition {
    Name("PlaceSearch")

    AsyncFunction("nearby") { (lat: Double, lng: Double, radiusMeters: Double, promise: Promise) in
      let center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
      let request = MKLocalPointsOfInterestRequest(
        center: center,
        radius: min(radiusMeters, MKLocalPointsOfInterestRequest.maxRadius)
      )
      request.pointOfInterestFilter = MKPointOfInterestFilter(including: Self.foodCategories)
      Self.run(MKLocalSearch(request: request), origin: center, promise: promise)
    }.runOnQueue(.main)

    AsyncFunction("search") { (query: String, lat: Double?, lng: Double?, promise: Promise) in
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = query
      request.resultTypes = [.pointOfInterest, .address]

      var origin: CLLocationCoordinate2D?
      if let lat, let lng {
        let center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        origin = center
        request.region = MKCoordinateRegion(
          center: center,
          latitudinalMeters: Self.searchSpanMeters,
          longitudinalMeters: Self.searchSpanMeters
        )
      }
      Self.run(MKLocalSearch(request: request), origin: origin, promise: promise)
    }.runOnQueue(.main)
  }

  private static func run(_ search: MKLocalSearch, origin: CLLocationCoordinate2D?, promise: Promise) {
    search.start { response, error in
      if let error {
        // MapKit reports "no results" as an error.
        if (error as? MKError)?.code == .placemarkNotFound {
          promise.resolve([[String: Any?]]())
        } else {
          promise.reject("ERR_PLACE_SEARCH", error.localizedDescription)
        }
        return
      }
      let originLocation = origin.map { CLLocation(latitude: $0.latitude, longitude: $0.longitude) }
      let places = (response?.mapItems ?? []).map { serialize($0, from: originLocation) }
      promise.resolve(places)
    }
  }

  private static func serialize(_ item: MKMapItem, from origin: CLLocation?) -> [String: Any?] {
    let placemark = item.placemark
    let coordinate = placemark.coordinate
    let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
    return [
      "name": item.name ?? placemark.title ?? "Unknown place",
      "category": item.pointOfInterestCategory?.rawValue,
      "city": placemark.locality,
      "state": placemark.administrativeArea,
      "lat": coordinate.latitude,
      "lng": coordinate.longitude,
      "distance": origin.map { $0.distance(from: location) },
    ]
  }
}
