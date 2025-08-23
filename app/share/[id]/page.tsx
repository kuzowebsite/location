"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Loader2, CheckCircle, AlertCircle, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import GoogleMap from "@/components/google-map"
import { database } from "@/lib/firebase"
import { ref, set, get, remove, push } from "firebase/database"

interface LocationData {
  latitude: number
  longitude: number
  timestamp: string
  accuracy?: number
  adminId?: string
  address?: string
}

interface PlaceSuggestion {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export default function LocationSharingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [locationSent, setLocationSent] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [searchAddress, setSearchAddress] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isValidatingLink, setIsValidatingLink] = useState(true)
  const [isLinkValid, setIsLinkValid] = useState(false)
  const [userSessionId, setUserSessionId] = useState("")
  const [linkId, setLinkId] = useState<string | null>(null)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  const removeUsedLink = async (linkId: string) => {
    try {
      await remove(ref(database, `generatedLinks/${linkId}`))
      console.log("[v0] Removed used link:", linkId)
    } catch (error) {
      console.error("[v0] Error removing used link:", error)
    }
  }

  const validateAdminLink = async (adminId: string) => {
    try {
      const inactiveAdminsRef = ref(database, "inactiveAdmins")
      const snapshot = await get(inactiveAdminsRef)

      if (snapshot.exists()) {
        const inactiveAdmins = Object.values(snapshot.val()) as string[]
        if (inactiveAdmins.includes(adminId)) {
          return false
        }
      }

      return true
    } catch (error) {
      console.error("[v0] Error validating admin link:", error)
      return false
    }
  }

  const isUserBlocked = async (adminId: string, sessionId: string) => {
    try {
      const blockedUsersRef = ref(database, `blockedUsers/${adminId}`)
      const snapshot = await get(blockedUsersRef)

      if (!snapshot.exists()) {
        return false
      }

      const userLocationsRef = ref(database, `userLocations/${sessionId}`)
      const userSnapshot = await get(userLocationsRef)

      if (!userSnapshot.exists()) {
        return false
      }

      const blockedUsers = Object.values(snapshot.val()) as string[]
      const userLocations = Object.values(userSnapshot.val()) as LocationData[]

      for (const location of userLocations) {
        const userIdentifier = `${location.latitude}_${location.longitude}_${location.timestamp}`
        if (blockedUsers.includes(userIdentifier)) {
          return true
        }
      }

      return false
    } catch (error) {
      console.error("[v0] Error checking blocked users:", error)
      return false
    }
  }

  const storeUserLocationHistory = async (locationData: LocationData, sessionId: string) => {
    try {
      const userLocationsRef = ref(database, `userLocations/${sessionId}`)
      await push(userLocationsRef, locationData)
    } catch (error) {
      console.error("[v0] Error storing user location history:", error)
    }
  }

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      )
    })
  }

  const sendLocation = async () => {
    setIsLoading(true)

    try {
      const position = await getCurrentLocation()
      const adminId = searchParams.get("admin")

      if (adminId && !(await validateAdminLink(adminId))) {
        window.location.href = window.location.origin
        return
      }

      if (adminId && (await isUserBlocked(adminId, userSessionId))) {
        toast({
          title: "Хандалт хориглогдсон",
          description: "Таны хандалт хориглогдсон байна. Админтай холбогдоно уу.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString(),
        accuracy: position.coords.accuracy,
        ...(adminId && { adminId: adminId }),
      }

      if (adminId) {
        await storeUserLocationHistory(locationData, userSessionId)
      }

      const locationsRef = ref(database, "locations")
      await push(locationsRef, locationData)

      if (adminId) {
        const inactiveAdminsRef = ref(database, "inactiveAdmins")
        const snapshot = await get(inactiveAdminsRef)

        if (snapshot.exists()) {
          const inactiveAdmins = Object.values(snapshot.val()) as string[]
          const updatedInactiveAdmins = inactiveAdmins.filter((id: string) => id !== adminId)
          await set(inactiveAdminsRef, updatedInactiveAdmins)
        }
      }

      if (linkId) {
        await removeUsedLink(linkId)
      }

      console.log("[v0] Location data stored with admin ID:", locationData)

      setLocationSent(true)
      toast({
        title: "Байршил амжилттай илгээгдлээ",
        description: "Таны байршил админд хүргэгдлээ.",
      })
    } catch (error) {
      console.error("[v0] Location error:", error)

      let errorMessage = "Байршил авахад алдаа гарлаа"

      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Байршлын зөвшөөрөл татгалзагдсан"
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Байршлын мэдээлэл боломжгүй"
            break
          case error.TIMEOUT:
            errorMessage = "Байршил авах хугацаа дууссан"
            break
        }
      }

      toast({
        title: "Алдаа гарлаа",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    try {
      if (window.google && window.google.maps && window.google.maps.places) {
        const service = new window.google.maps.places.AutocompleteService()

        service.getPlacePredictions(
          {
            input: query,
            language: "mn",
          },
          (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              const formattedSuggestions = predictions.map((prediction) => ({
                place_id: prediction.place_id,
                description: prediction.description,
                structured_formatting: {
                  main_text: prediction.structured_formatting?.main_text || prediction.description,
                  secondary_text: prediction.structured_formatting?.secondary_text || "",
                },
              }))
              setSuggestions(formattedSuggestions)
              setShowSuggestions(true)
            } else {
              setSuggestions([])
              setShowSuggestions(false)
            }
            setIsSearching(false)
          },
        )
      } else {
        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB0IqCku-K4CH0KPlQVJa0b71RpFJ3tlj8&libraries=places&language=mn`
        script.async = true
        script.onload = () => {
          setTimeout(() => searchLocation(query), 100)
        }
        document.head.appendChild(script)
      }
    } catch (error) {
      console.error("[v0] Search error:", error)
      setSuggestions([])
      setShowSuggestions(false)
      setIsSearching(false)
    }
  }

  const selectPlace = async (placeId: string, description: string) => {
    setIsSearching(true)
    setShowSuggestions(false)
    setSearchAddress(description)

    try {
      if (window.google && window.google.maps && window.google.maps.places) {
        const map = new window.google.maps.Map(document.createElement("div"))
        const service = new window.google.maps.places.PlacesService(map)

        service.getDetails(
          {
            placeId: placeId,
            fields: ["geometry", "formatted_address"],
          },
          (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
              const location = place.geometry.location
              setSelectedLocation({
                lat: location.lat(),
                lng: location.lng(),
                address: place.formatted_address,
              })
              toast({
                title: "Байршил сонгогдлоо",
                description: place.formatted_address,
              })
            } else {
              toast({
                title: "Алдаа гарлаа",
                description: "Байршил авахад алдаа гарлаа",
                variant: "destructive",
              })
            }
            setIsSearching(false)
          },
        )
      } else {
        throw new Error("Google Maps API not loaded")
      }
    } catch (error) {
      console.error("[v0] Place details error:", error)
      toast({
        title: "Алдаа гарлаа",
        description: "Байршил авахад алдаа гарлаа",
        variant: "destructive",
      })
      setIsSearching(false)
    }
  }

  const sendSelectedLocation = async () => {
    if (!selectedLocation) return

    setIsLoading(true)
    try {
      const adminId = searchParams.get("admin")

      if (adminId && !(await validateAdminLink(adminId))) {
        window.location.href = window.location.origin
        return
      }

      if (adminId && (await isUserBlocked(adminId, userSessionId))) {
        toast({
          title: "Хандалт хориглогдсон",
          description: "Таны хандалт хориглогдсон байна. Админтай холбогдоно уу.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const locationData: LocationData = {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        timestamp: new Date().toISOString(),
        address: selectedLocation.address,
        ...(adminId && { adminId: adminId }),
      }

      if (adminId) {
        await storeUserLocationHistory(locationData, userSessionId)
      }

      const locationsRef = ref(database, "locations")
      await push(locationsRef, locationData)

      if (adminId) {
        const inactiveAdminsRef = ref(database, "inactiveAdmins")
        const snapshot = await get(inactiveAdminsRef)

        if (snapshot.exists()) {
          const inactiveAdmins = Object.values(snapshot.val()) as string[]
          const updatedInactiveAdmins = inactiveAdmins.filter((id: string) => id !== adminId)
          await set(inactiveAdminsRef, updatedInactiveAdmins)
        }
      }

      if (linkId) {
        await removeUsedLink(linkId)
      }

      setLocationSent(true)
      toast({
        title: "Байршил амжилттай илгээгдлээ",
        description: "Сонгосон байршил админд хүргэгдлээ.",
      })
    } catch (error) {
      toast({
        title: "Алдаа гарлаа",
        description: "Байршил илгээхэд алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentLocationForDisplay = async () => {
    try {
      const position = await getCurrentLocation()
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
    } catch (error) {
      console.error("[v0] Failed to get current location for display:", error)
      setCurrentLocation({
        lat: 47.9184,
        lng: 106.9177,
      })
    }
  }

  const checkLinkValidity = async (linkId: string) => {
    try {
      // Check if link exists in invalidatedLinks
      const invalidatedLinksRef = ref(database, "invalidatedLinks")
      const invalidatedSnapshot = await get(invalidatedLinksRef)

      if (invalidatedSnapshot.exists()) {
        const invalidatedLinks = Object.keys(invalidatedSnapshot.val())
        if (invalidatedLinks.includes(linkId)) {
          return false
        }
      }

      // Check if link still exists in generatedLinks
      const generatedLinksRef = ref(database, "generatedLinks")
      const generatedSnapshot = await get(generatedLinksRef)

      if (!generatedSnapshot.exists()) {
        return false
      }

      const generatedLinks = Object.keys(generatedSnapshot.val())
      return generatedLinks.includes(linkId)
    } catch (error) {
      console.error("[v0] Error checking link validity:", error)
      return false
    }
  }

  useEffect(() => {
    const sessionId = localStorage.getItem("userSessionId") || Math.random().toString(36).substring(2, 15)
    localStorage.setItem("userSessionId", sessionId)
    setUserSessionId(sessionId)

    const pathParts = window.location.pathname.split("/")
    const currentLinkId = pathParts[pathParts.length - 1]
    setLinkId(currentLinkId)

    const adminId = searchParams.get("admin")

    if (!adminId) {
      setIsLinkValid(true)
      setIsValidatingLink(false)
      return
    }

    const validateLink = async () => {
      setIsValidatingLink(true)

      const isLinkValid = await checkLinkValidity(currentLinkId)
      if (!isLinkValid) {
        toast({
          title: "Линк хүчингүй",
          description: "Энэ линк хүчингүй болсон байна. Нүүр хуудас руу шилжүүлж байна...",
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = window.location.origin
        }, 3000)
        return
      }

      const isValid = await validateAdminLink(adminId)

      if (!isValid) {
        window.location.href = window.location.origin
        return
      }

      if (await isUserBlocked(adminId, sessionId)) {
        toast({
          title: "Хандалт хориглогдсон",
          description: "Таны хандалт хориглогдсон байна. Админтай холбогдоно уу.",
          variant: "destructive",
        })
        setTimeout(() => {
          window.location.href = window.location.origin
        }, 3000)
        return
      }

      setIsLinkValid(true)
      setIsValidatingLink(false)
      console.log("[v0] Accessed via valid admin link:", adminId)
    }

    validateLink()
  }, [searchParams])

  useEffect(() => {
    getCurrentLocationForDisplay()
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchAddress.trim()) {
        searchLocation(searchAddress)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchAddress])

  if (isValidatingLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Линк шалгаж байна...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isLinkValid) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Байршил хуваалцах</CardTitle>
          <CardDescription className="text-muted-foreground">Байршлаа сонгож админд илгээнэ үү</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!locationSent ? (
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">Одоогийн байршил</TabsTrigger>
                <TabsTrigger value="select">Байршил сонгох</TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="space-y-4">
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-foreground">
                        <p className="font-medium mb-1">Хэрхэн ашиглах:</p>
                        <p>
                          Доорх товчийг дарахад таны одоогийн байршлыг автоматаар авч админд илгээнэ. Байршлын зөвшөөрөл
                          өгөх шаардлагатай.
                        </p>
                      </div>
                    </div>
                  </div>

                  {currentLocation && (
                    <div className="h-64 rounded-lg overflow-hidden border">
                      <GoogleMap latitude={currentLocation.lat} longitude={currentLocation.lng} interactive={false} />
                    </div>
                  )}

                  <Button
                    onClick={sendLocation}
                    disabled={isLoading}
                    className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Байршил авч байна...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-5 h-5 mr-2" />
                        Одоогийн байршил илгээх
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="select" className="space-y-4">
                <div className="space-y-4">
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Search className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-foreground">
                        <p className="font-medium mb-1">Хэрхэн ашиглах:</p>
                        <p>
                          Хаяг бичиж хайх эсвэл газрын зураг дээр хүссэн цэг дээрээ дарж байршил сонгоно уу. Сонгосны
                          дараа "Илгээх" товчийг дарна уу.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-64 rounded-lg overflow-hidden border">
                    <GoogleMap
                      latitude={selectedLocation?.lat || 47.9184}
                      longitude={selectedLocation?.lng || 106.9177}
                      interactive={true}
                      onLocationSelect={(location) => {
                        setSelectedLocation({
                          lat: location.lat,
                          lng: location.lng,
                          address: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
                        })
                        setShowSuggestions(false)
                        toast({
                          title: "Байршил сонгогдлоо",
                          description: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
                        })
                      }}
                    />
                  </div>

                  <div className="relative">
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Хаяг хайх... (жишээ: Улаанбаатар, Сүхбаатарын талбай)"
                          value={searchAddress}
                          onChange={(e) => {
                            setSearchAddress(e.target.value)
                            if (!e.target.value.trim()) {
                              setShowSuggestions(false)
                              setSuggestions([])
                            }
                          }}
                          onFocus={() => {
                            if (suggestions.length > 0) {
                              setShowSuggestions(true)
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowSuggestions(false), 200)
                          }}
                        />
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {suggestions.map((suggestion) => (
                              <button
                                key={suggestion.place_id}
                                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700"
                                onClick={() => selectPlace(suggestion.place_id, suggestion.description)}
                              >
                                <div className="flex items-center space-x-3">
                                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {suggestion.structured_formatting.main_text}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {suggestion.structured_formatting.secondary_text}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => searchLocation(searchAddress)}
                        disabled={isSearching || !searchAddress.trim()}
                        variant="outline"
                      >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {selectedLocation && (
                    <div className="space-y-4">
                      <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                        <p className="text-sm font-medium text-foreground">Сонгогдсон байршил:</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedLocation.address || `${selectedLocation.lat}, ${selectedLocation.lng}`}
                        </p>
                      </div>

                      <Button
                        onClick={sendSelectedLocation}
                        disabled={isLoading}
                        className="w-full h-12 text-lg font-semibold bg-accent hover:bg-accent/90"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Илгээж байна...
                          </>
                        ) : (
                          <>
                            <MapPin className="w-5 h-5 mr-2" />
                            Сонгосон байршил илгээх
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-accent mb-2">Амжилттай илгээгдлээ!</h3>
                <p className="text-sm text-muted-foreground">Таны байршил админд хүргэгдлээ.</p>
              </div>
              <Button onClick={() => setLocationSent(false)} variant="outline" className="w-full">
                Дахин илгээх
              </Button>
            </div>
          )}

          <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">Заавар:</p>
                <p>Дээрх хоёр сонголтын аль нэгийг ашиглан байршлаа админд илгээнэ үү.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
