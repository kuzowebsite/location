"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Shield, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { createUser, checkUserExists } from "@/lib/permissions"

export default function ManagerSetup() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password.trim()) {
      toast.error("Бүх талбарыг бөглөнө үү")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Нууц үг таарахгүй байна")
      return
    }

    if (password.length < 6) {
      toast.error("Нууц үг дор хаяж 6 тэмдэгт байх ёстой")
      return
    }

    setIsLoading(true)

    try {
      // Check if any manager already exists
      const existingManager = await checkUserExists(username)
      if (existingManager) {
        toast.error("Энэ нэртэй хэрэглэгч аль хэдийн байна")
        setIsLoading(false)
        return
      }

      // Create the first manager account
      await createUser(username, password, "manager")

      toast.success("Менежер эрх амжилттай үүсгэгдлээ!")

      // Redirect to login after short delay
      setTimeout(() => {
        router.push("/")
      }, 2000)

      // Self-destruct: Mark this setup as completed
      localStorage.setItem("manager_setup_completed", "true")
    } catch (error) {
      console.error("Setup error:", error)
      toast.error("Алдаа гарлаа. Дахин оролдоно уу.")
    } finally {
      setIsLoading(false)
    }
  }

  // Check if setup is already completed
  if (typeof window !== "undefined" && localStorage.getItem("manager_setup_completed")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-slate-900">Хандах эрхгүй</CardTitle>
            <CardDescription>
              Менежер эрх аль хэдийн үүсгэгдсэн байна. Аюулгүй байдлын үүднээс энэ хуудас хаагдлаа.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Нэвтрэх хуудас руу буцах
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-cyan-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-slate-900">Менежер эрх үүсгэх</CardTitle>
          <CardDescription>Анхны менежер эрхийг үүсгэнэ үү. Энэ хуудас зөвхөн нэг удаа ашиглагдана.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Хэрэглэгчийн нэр</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Хэрэглэгчийн нэр оруулна уу"
                disabled={isLoading}
                className="w-full"
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
                  placeholder="Нууц үг оруулна уу"
                  disabled={isLoading}
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Нууц үг баталгаажуулах</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Нууц үгээ дахин оруулна уу"
                  disabled={isLoading}
                  className="w-full pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Анхааруулга:</p>
                  <p>
                    Энэ хуудас менежер эрх үүсгэсний дараа автоматаар устгагдана. Нэвтрэх мэдээллээ сайн хадгална уу.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700" disabled={isLoading}>
              {isLoading ? "Үүсгэж байна..." : "Менежер эрх үүсгэх"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
