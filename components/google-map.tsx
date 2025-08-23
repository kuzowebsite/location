"use client"

import { useEffect, useRef, useState } from "react"

interface GoogleMapProps {
  latitude: number
  longitude: number
  accuracy?: number
  className?: string
  interactive?: boolean
  onLocationSelect?: (location: { lat: number; lng: number }) => void
  showDirections?: boolean
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export default function GoogleMap({
  latitude,
  longitude,
  accuracy,
  className = "",
  interactive = false,
  onLocationSelect,
  showDirections = false,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [interactiveMarker, setInteractiveMarker] = useState<any>(null)
  const [directionsService, setDirectionsService] = useState<any>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null)

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap()
        return
      }

      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB0IqCku-K4CH0KPlQVJa0b71RpFJ3tlj8&callback=initMap`
        script.async = true
        script.defer = true

        window.initMap = initializeMap
        document.head.appendChild(script)
      } else {
        const checkGoogle = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkGoogle)
            initializeMap()
          }
        }, 100)
      }
    }

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: latitude, lng: longitude },
        zoom: 15,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      })

      mapInstanceRef.current = map

      const dirService = new window.google.maps.DirectionsService()
      const dirRenderer = new window.google.maps.DirectionsRenderer({
        draggable: false,
        suppressMarkers: false,
      })

      setDirectionsService(dirService)
      setDirectionsRenderer(dirRenderer)

      if (!interactive) {
        const marker = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: map,
          title: `Байршил: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#dc2626"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(24, 24),
          },
        })

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Байршлын мэдээлэл</h3>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Өргөрөг:</strong> ${latitude.toFixed(6)}</p>
              <p style="margin: 4px 0; font-size: 12px;"><strong>Уртраг:</strong> ${longitude.toFixed(6)}</p>
              ${accuracy ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Нарийвчлал:</strong> ±${Math.round(accuracy)}м</p>` : ""}
            </div>
          `,
        })

        marker.addListener("click", () => {
          infoWindow.open(map, marker)
        })
      } else {
        map.addListener("click", (event: any) => {
          const clickedLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          }

          if (interactiveMarker) {
            interactiveMarker.setMap(null)
          }

          const newMarker = new window.google.maps.Marker({
            position: clickedLocation,
            map: map,
            title: `Сонгосон байршил: ${clickedLocation.lat.toFixed(6)}, ${clickedLocation.lng.toFixed(6)}`,
            icon: {
              url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#16a34a"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24),
            },
          })

          setInteractiveMarker(newMarker)

          if (onLocationSelect) {
            onLocationSelect(clickedLocation)
          }
        })
      }

      if (accuracy && !interactive) {
        const accuracyCircle = new window.google.maps.Circle({
          strokeColor: "#3b82f6",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
          map: map,
          center: { lat: latitude, lng: longitude },
          radius: accuracy,
        })
      }
    }

    loadGoogleMaps()
  }, [latitude, longitude, accuracy, interactive, onLocationSelect])

  useEffect(() => {
    if (showDirections && directionsService && directionsRenderer && mapInstanceRef.current) {
      // Get user's current location for directions
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }

            const request = {
              origin: userLocation,
              destination: { lat: latitude, lng: longitude },
              travelMode: window.google.maps.TravelMode.DRIVING,
            }

            directionsService.route(request, (result: any, status: any) => {
              if (status === "OK") {
                directionsRenderer.setDirections(result)
                directionsRenderer.setMap(mapInstanceRef.current)
              }
            })
          },
          () => {
            // If geolocation fails, show directions from a default location (Ulaanbaatar center)
            const defaultLocation = { lat: 47.9184, lng: 106.9177 }

            const request = {
              origin: defaultLocation,
              destination: { lat: latitude, lng: longitude },
              travelMode: window.google.maps.TravelMode.DRIVING,
            }

            directionsService.route(request, (result: any, status: any) => {
              if (status === "OK") {
                directionsRenderer.setDirections(result)
                directionsRenderer.setMap(mapInstanceRef.current)
              }
            })
          },
        )
      }
    } else if (directionsRenderer) {
      // Clear directions when showDirections is false
      directionsRenderer.setMap(null)
    }
  }, [showDirections, directionsService, directionsRenderer, latitude, longitude])

  return (
    <div className="space-y-2">
      {interactive && (
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">Газрын зураг дээр дарж байршил сонгоно уу</div>
      )}

      <div ref={mapRef} className={`w-full h-64 rounded-lg border ${className}`} style={{ minHeight: "256px" }} />
    </div>
  )
}
