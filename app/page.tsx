"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { validateCredentials } from "@/lib/permissions"

export default function HomePage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const user = await validateCredentials(username, password)

      if (user && user.isActive) {
        localStorage.setItem("userAuthenticated", "true")
        localStorage.setItem("userId", user.id)
        localStorage.setItem("userRole", user.role)

        toast({
          title: "Амжилттай нэвтэрлээ",
          description: `${user.role === "manager" ? "Менежер" : "Сервер"} хяналтын самбарт шилжүүлж байна...`,
        })

        if (user.role === "manager") {
          router.push("/manager")
        } else {
          router.push("/server")
        }
      } else if (user && !user.isActive) {
        toast({
          title: "Алдаа",
          description: "Таны эрх хаагдсан байна",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Алдаа",
          description: "Нэвтрэх нэр эсвэл нууц үг буруу байна",
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

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Байршил хуваалцах систем</CardTitle>
          <CardDescription className="text-muted-foreground">
            Хяналтын самбарт нэвтрэхийн тулд мэдээллээ оруулна уу
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Нэвтрэх нэр</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Нэвтрэх нэрээ оруулна уу"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Нууц үг</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Нууц үгээ оруулна уу"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isLoading}>
              {isLoading ? "Нэвтэрч байна..." : "Нэвтрэх"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
