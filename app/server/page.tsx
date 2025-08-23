"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MapPin,
  Clock,
  Target,
  Trash2,
  RefreshCw,
  Link,
  Copy,
  Map,
  ChevronUp,
  LogOut,
  Eye,
  EyeOff,
  User,
  Shield,
  Check,
  Navigation,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import GoogleMap from "@/components/google-map"
import { database } from "@/lib/firebase"
import { ref, set, get, remove, onValue } from "firebase/database"

interface LocationData {
  latitude: number
  longitude: number
  timestamp: string
  accuracy?: number
  adminId: string
}

interface ProfileData {
  name: string
  profileImage: string
}

interface GeneratedLink {
  id: string
  url: string
  createdAt: string
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<"server" | "manager">("server")
  const [userId, setUserId] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const [profileData, setProfileData] = useState<ProfileData>({ name: "Админ", profileImage: "/admin-profile.png" })
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isSecurityDialogOpen, setIsSecurityDialogOpen] = useState(false)
  const [tempProfileData, setTempProfileData] = useState<ProfileData>({ name: "", profileImage: "" })
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [locations, setLocations] = useState<LocationData[]>([])
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([])
  const [adminId, setAdminId] = useState("")
  const [visibleMaps, setVisibleMaps] = useState<Set<number>>(new Set())
  const [visibleDirections, setVisibleDirections] = useState<Set<number>>(new Set())
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const [adminPassword, setAdminPassword] = useState("admin123")
  const [password, setPassword] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateLink = async () => {
    const linkId = Math.random().toString(36).substring(2, 15)
    const newLink: GeneratedLink = {
      id: linkId,
      url: `${window.location.origin}/share/${linkId}`,
      createdAt: new Date().toISOString(),
    }

    try {
      await set(ref(database, `generatedLinks/${linkId}`), newLink)

      const updatedLinks = [...generatedLinks, newLink]
      setGeneratedLinks(updatedLinks)

      toast({
        title: "Шинэ линк үүсгэгдлээ",
        description: "Линкийг хуваалцаж байршил цуглуулна уу",
      })
    } catch (error) {
      console.error("Error generating link:", error)
      toast({
        title: "Алдаа",
        description: "Линк үүсгэхэд алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)

      setCopiedLinks((prev) => new Set(prev).add(url))

      setTimeout(() => {
        setCopiedLinks((prev) => {
          const newSet = new Set(prev)
          newSet.delete(url)
          return newSet
        })
      }, 6000)

      toast({
        title: "Хуулсан",
        description: "Линк амжилттай хуулагдлаа",
      })
    } catch (error) {
      toast({
        title: "Алдаа",
        description: "Линк хуулахад алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const deleteLocation = async (index: number) => {
    try {
      const locationToDelete = locations[index]

      const locationsRef = ref(database, "locations")
      const snapshot = await get(locationsRef)

      if (snapshot.exists()) {
        const data = snapshot.val()
        const locationKey = Object.keys(data).find((key) => {
          const loc = data[key]
          return (
            loc.latitude === locationToDelete.latitude &&
            loc.longitude === locationToDelete.longitude &&
            loc.timestamp === locationToDelete.timestamp
          )
        })

        if (locationKey) {
          await remove(ref(database, `locations/${locationKey}`))

          if (locationToDelete.adminId) {
            // Find the link that was used to generate this location
            const linksSnapshot = await get(ref(database, "generatedLinks"))
            if (linksSnapshot.exists()) {
              const linksData = linksSnapshot.val()

              // Find the link that matches this location's creation time (within 5 minutes)
              const locationTime = new Date(locationToDelete.timestamp).getTime()
              let linkToInvalidate: { id: string; data: GeneratedLink } | null = null

              for (const [linkId, linkData] of Object.entries(linksData)) {
                const linkTime = new Date((linkData as any).createdAt).getTime()
                const timeDiff = Math.abs(locationTime - linkTime)

                // If location was created within 5 minutes of link creation, assume this link generated it
                if (timeDiff <= 5 * 60 * 1000) {
                  // 5 minutes in milliseconds
                  linkToInvalidate = { id: linkId, data: linkData as GeneratedLink }
                  break
                }
              }

              // If we found a matching link, invalidate only that specific link
              if (linkToInvalidate) {
                await set(ref(database, `invalidatedLinks/${linkToInvalidate.id}`), {
                  ...linkToInvalidate.data,
                  invalidatedAt: new Date().toISOString(),
                  reason: "Associated location deleted",
                })

                // Remove only this specific link from generated links
                await remove(ref(database, `generatedLinks/${linkToInvalidate.id}`))

                // Update local state to remove only this specific link
                setGeneratedLinks((prev) => prev.filter((link) => link.id !== linkToInvalidate!.id))

                toast({
                  title: "Устгагдлаа",
                  description: "Байршил болон холбогдох линк устгагдлаа",
                })
              } else {
                toast({
                  title: "Устгагдлаа",
                  description: "Байршил устгагдлаа",
                })
              }
            }
          } else {
            toast({
              title: "Устгагдлаа",
              description: "Байршил устгагдлаа",
            })
          }
        }
      }

      const updatedLocations = locations.filter((_, i) => i !== index)
      setLocations(updatedLocations)

      setVisibleMaps((prev) => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })

      setVisibleDirections((prev) => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    } catch (error) {
      console.error("Error deleting location:", error)
      toast({
        title: "Алдаа",
        description: "Байршил устгахад алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const loadGeneratedLinks = () => {
    const linksRef = ref(database, "generatedLinks")

    const unsubscribe = onValue(linksRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const linksArray = Object.values(data) as GeneratedLink[]
        setGeneratedLinks(linksArray)
      } else {
        setGeneratedLinks([])
      }
    })

    return unsubscribe
  }

  const loadLocations = () => {
    const locationsRef = ref(database, "locations")

    const unsubscribe = onValue(locationsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const locationsArray = Object.values(data) as LocationData[]
        setLocations(locationsArray)
      } else {
        setLocations([])
      }
    })

    return unsubscribe
  }

  const clearAllLocations = async () => {
    try {
      await remove(ref(database, "locations"))
      setLocations([])
      toast({
        title: "Амжилттай устгагдлаа",
        description: "Бүх байршил устгагдлаа",
      })
    } catch (error) {
      console.error("Error clearing locations:", error)
      toast({
        title: "Алдаа",
        description: "Байршил устгахад алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const toggleMapVisibility = (index: number) => {
    setVisibleMaps((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const toggleDirectionVisibility = (index: number) => {
    setVisibleDirections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const openDirections = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    window.open(url, "_blank")
  }

  const formatAccuracy = (accuracy?: number) => {
    if (!accuracy) return "Тодорхойгүй"
    if (accuracy < 10) return "Өндөр"
    if (accuracy < 50) return "Дунд"
    return "Бага"
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("mn-MN")
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("userAuthenticated")
    localStorage.removeItem("userId")
    localStorage.removeItem("userRole")
    window.location.href = "/"
    toast({
      title: "Амжилттай гарлаа",
      description: "Системээс амжилттай гарлаа",
    })
  }

  const loadProfileData = async () => {
    try {
      const profileRef = ref(database, `adminProfiles/${adminId}`)
      const snapshot = await get(profileRef)

      if (snapshot.exists()) {
        const profile = snapshot.val()
        setProfileData(profile)
      }
    } catch (error) {
      console.error("[v0] Error loading profile:", error)
    }
  }

  const saveProfileData = async (profile: ProfileData) => {
    try {
      await set(ref(database, `adminProfiles/${adminId}`), profile)
      setProfileData(profile)
    } catch (error) {
      console.error("[v0] Error saving profile:", error)
    }
  }

  const handlePasswordChange = async () => {
    if (currentPassword !== adminPassword) {
      toast({
        title: "Алдаа",
        description: "Одоогийн нууц үг буруу байна",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Алдаа",
        description: "Шинэ нууц үг дор хаяж 6 тэмдэгт байх ёстой",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Алдаа",
        description: "Шинэ нууц үг таарахгүй байна",
        variant: "destructive",
      })
      return
    }

    try {
      await set(ref(database, `adminPasswords/${adminId}`), newPassword)
      setAdminPassword(newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setIsSecurityDialogOpen(false)
      toast({
        title: "Амжилттай солигдлоо",
        description: "Нууц үг амжилттай солигдлоо",
      })
    } catch (error) {
      console.error("Error changing password:", error)
      toast({
        title: "Алдаа",
        description: "Нууц үг солихад алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const passwordRef = ref(database, `adminPasswords/${adminId}`)
      const snapshot = await get(passwordRef)
      const storedPassword = snapshot.exists() ? snapshot.val() : "admin123"

      if (password === storedPassword) {
        setIsAuthenticated(true)
        localStorage.setItem("userAuthenticated", "true")
        localStorage.setItem("userId", adminId)
        localStorage.setItem("userRole", "server")
        setPassword("")

        const storedAdminId = localStorage.getItem("adminId")
        if (storedAdminId) {
          setAdminId(storedAdminId)
        } else {
          const newAdminId = Math.random().toString(36).substring(2, 15)
          setAdminId(newAdminId)
          localStorage.setItem("adminId", newAdminId)
        }

        toast({
          title: "Амжилттай нэвтэрлээ",
          description: "Админ хяналтын самбарт тавтай морилно уу",
        })
      } else {
        toast({
          title: "Алдаа",
          description: "Нууц үг буруу байна",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error during login:", error)
      toast({
        title: "Алдаа",
        description: "Нэвтрэхэд алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const checkAuthentication = async () => {
    const authStatus = localStorage.getItem("userAuthenticated")
    const storedUserId = localStorage.getItem("userId")
    const storedUserRole = localStorage.getItem("userRole") as "server" | "manager"

    if (authStatus === "true" && storedUserId && storedUserRole === "server") {
      setIsAuthenticated(true)
      setUserId(storedUserId)
      setUserRole(storedUserRole)
      setAdminId(storedUserId)
    } else if (storedUserRole === "manager") {
      window.location.href = "/manager"
      return
    }
    setIsLoading(false)
  }

  const handleProfileSave = async () => {
    if (!tempProfileData.name.trim()) {
      toast({
        title: "Алдаа",
        description: "Нэрээ оруулна уу",
        variant: "destructive",
      })
      return
    }

    try {
      await saveProfileData(tempProfileData)
      setIsProfileDialogOpen(false)
      toast({
        title: "Амжилттай хадгалагдлаа",
        description: "Профайл амжилттай шинэчиллээ",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Алдаа",
        description: "Профайл хадгалахад алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const handleProfileImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Алдаа",
        description: "Зөвхөн зургийн файл сонгоно уу",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Алдаа",
        description: "Зургийн хэмжээ 5MB-аас бага байх ёстой",
        variant: "destructive",
      })
      return
    }

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string

        // Update temporary profile data
        setTempProfileData((prev) => ({
          ...prev,
          profileImage: base64Image,
        }))

        toast({
          title: "Амжилттай",
          description: "Зураг амжилттай сонгогдлоо. Хадгалах товчийг дарна уу.",
        })
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Алдаа",
        description: "Зураг ачаалахад алдаа гарлаа",
        variant: "destructive",
      })
    }

    // Clear the input
    event.target.value = ""
  }

  useEffect(() => {
    checkAuthentication()
  }, [])

  useEffect(() => {
    let unsubscribeLocations: (() => void) | undefined
    let unsubscribeLinks: (() => void) | undefined

    if (isAuthenticated && adminId) {
      loadProfileData()
      unsubscribeLocations = loadLocations()
      unsubscribeLinks = loadGeneratedLinks()
    }

    return () => {
      if (unsubscribeLocations) unsubscribeLocations()
      if (unsubscribeLinks) unsubscribeLinks()
    }
  }, [isAuthenticated, adminId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Эрх хүрэхгүй</CardTitle>
            <CardDescription>
              Энэ хуудсанд нэвтрэхийн тулд зөвшөөрөл хэрэгтэй.
              <a href="/" className="text-primary hover:underline ml-1">
                Нэвтрэх хуудас руу буцах
              </a>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profileData.profileImage || "/placeholder.svg"} alt={profileData.name} />
                  <AvatarFallback>{profileData.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem
                onClick={() => {
                  setTempProfileData(profileData)
                  setIsProfileDialogOpen(true)
                }}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Профайл</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSecurityDialogOpen(true)}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Аюулгүй байдал</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Гарах</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Профайл засах</DialogTitle>
              <DialogDescription>Профайлын мэдээллээ шинэчлэх боломжтой</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="relative cursor-pointer group" onClick={handleProfileImageClick}>
                  <Avatar className="h-20 w-20 transition-opacity group-hover:opacity-80">
                    <AvatarImage src={tempProfileData.profileImage || "/placeholder.svg"} alt={tempProfileData.name} />
                    <AvatarFallback className="text-lg">{tempProfileData.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">Солих</span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground text-center">Зураг дээр дарж шинэ зураг сонгоно уу</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Нэр</Label>
                <Input
                  id="name"
                  value={tempProfileData.name}
                  onChange={(e) => setTempProfileData({ ...tempProfileData, name: e.target.value })}
                  placeholder="Нэрээ оруулна уу"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
                Цуцлах
              </Button>
              <Button onClick={handleProfileSave}>Хадгалах</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSecurityDialogOpen} onOpenChange={setIsSecurityDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Аюулгүй байдал</DialogTitle>
              <DialogDescription>Нэвтрэх нууц үгээ солих боломжтой</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Одоогийн нууц үг</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Одоогийн нууц үгээ оруулна уу"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newPassword">Шинэ нууц үг</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Шинэ нууц үгээ оруулна уу"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Нууц үг давтах</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Шинэ нууц үгээ давтана уу"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentPassword("")
                  setNewPassword("")
                  setConfirmPassword("")
                  setIsSecurityDialogOpen(false)
                }}
              >
                Цуцлах
              </Button>
              <Button onClick={handlePasswordChange}>Солих</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Link className="w-5 h-5 text-primary" />
              Хуваалцах линк үүсгэх
            </CardTitle>
            <CardDescription className="text-sm">
              Хэрэглэгчдэд байршил цуглуулахын тулд шинэ линк үүсгэнэ үү
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={generateLink}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Link className="w-4 h-4 mr-2" />
              Линк үүсгэх
            </Button>
          </CardContent>
        </Card>

        {generatedLinks.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Үүсгэсэн линкүүд</CardTitle>
              <CardDescription className="text-sm">
                Эдгээр линкүүдийг нийгмийн сүлжээ эсвэл мессежийн платформд хуваалцана уу
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {generatedLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-muted/50 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-muted-foreground break-all">{link.url}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(link.createdAt).toLocaleString("mn-MN")}
                      </p>
                    </div>
                    <div className="flex gap-2 sm:ml-4">
                      <Button
                        onClick={() => copyLink(link.url)}
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                      >
                        {copiedLinks.has(link.url) ? (
                          <>
                            <Check className="w-4 h-4 mr-1 text-accent" />
                            <span className="text-accent text-xs">Хуулсан</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1 sm:mr-0" />
                            <span className="sm:hidden">Хуулах</span>
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => deleteLocation(generatedLinks.indexOf(link))}
                        size="sm"
                        variant="destructive"
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="w-4 h-4 mr-1 sm:mr-0" />
                        <span className="sm:hidden">Устгах</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{locations.length}</p>
                <p className="text-sm text-muted-foreground">Нийт байршил</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">Байршлын жагсаалт</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={loadLocations}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none bg-transparent"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Шинэчлэх
                </Button>
                {locations.length > 0 && (
                  <Button onClick={clearAllLocations} variant="destructive" size="sm" className="flex-1 sm:flex-none">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Бүгдийг устгах
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Ачаалж байна...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Байршил байхгүй байна</p>
                <p className="text-muted-foreground text-sm">Хэрэглэгчид байршлаа хуваалцаагүй байна</p>
              </div>
            ) : (
              <div className="space-y-4">
                {locations.map((location, index) => (
                  <div key={index} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-mono text-xs sm:text-sm break-all">
                              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                            </span>
                          </div>
                          <Badge variant="secondary" className="w-fit">
                            {formatAccuracy(location.accuracy)}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs sm:text-sm">{formatDate(location.timestamp)}</span>
                          </div>
                          {location.accuracy && (
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              <span className="text-xs sm:text-sm">±{Math.round(location.accuracy)}м</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleMapVisibility(index)}
                          size="sm"
                          variant="outline"
                          className="flex-1 sm:flex-none"
                        >
                          {visibleMaps.has(index) ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1 sm:mr-2" />
                              <span className="text-xs sm:text-sm">Хаах</span>
                            </>
                          ) : (
                            <>
                              <Map className="w-4 h-4 mr-1 sm:mr-2" />
                              <span className="text-xs sm:text-sm">Зураг</span>
                            </>
                          )}
                        </Button>
                        <Button onClick={() => deleteLocation(index)} size="sm" variant="destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {visibleMaps.has(index) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-sm font-medium text-muted-foreground">Байршил газрын зураг дээр:</p>
                          <Button
                            onClick={() => toggleDirectionVisibility(index)}
                            size="sm"
                            variant="outline"
                            className="text-accent hover:text-accent w-full sm:w-auto"
                          >
                            <Navigation className="w-4 h-4 mr-2" />
                            {visibleDirections.has(index) ? "Чиглэл хаах" : "Чиглэл"}
                          </Button>
                        </div>
                        <div className="rounded-lg overflow-hidden">
                          <GoogleMap
                            latitude={location.latitude}
                            longitude={location.longitude}
                            accuracy={location.accuracy}
                            showDirections={visibleDirections.has(index)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
