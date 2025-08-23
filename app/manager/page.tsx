"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { LogOut, Plus, Trash2, Users, Shield, Activity, Eye, EyeOff } from "lucide-react"
import { type User, createUser, getAllUsers, updateUserRole, deleteUser, toggleUserStatus } from "@/lib/permissions"

export default function ManagerPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "server" as "manager" | "server" })
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const authStatus = localStorage.getItem("userAuthenticated")
    const userRole = localStorage.getItem("userRole")

    if (authStatus === "true" && userRole === "manager") {
      setIsAuthenticated(true)
      loadUsers()
    } else {
      router.push("/")
    }
  }, [router])

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers()
      setUsers(allUsers)
    } catch (error) {
      toast({
        title: "Алдаа",
        description: "Хэрэглэгчдийг ачаалахад алдаа гарлаа",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      toast({
        title: "Алдаа",
        description: "Бүх талбарыг бөглөнө үү",
        variant: "destructive",
      })
      return
    }

    if (newUser.password.length < 6) {
      toast({
        title: "Алдаа",
        description: "Нууц үг дор хаяж 6 тэмдэгт байх ёстой",
        variant: "destructive",
      })
      return
    }

    try {
      await createUser(newUser.username, newUser.password, newUser.role)
      toast({
        title: "Амжилттай",
        description: "Хэрэглэгч амжилттай үүсгэгдлээ",
      })
      setIsCreateDialogOpen(false)
      setNewUser({ username: "", password: "", role: "server" })
      loadUsers()
    } catch (error) {
      toast({
        title: "Алдаа",
        description: "Хэрэглэгч үүсгэхэд алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const handleRoleChange = async (userId: string, newRole: "manager" | "server") => {
    try {
      await updateUserRole(userId, newRole)
      toast({
        title: "Амжилттай",
        description: "Эрх амжилттай өөрчлөгдлөө",
      })
      loadUsers()
    } catch (error) {
      toast({
        title: "Алдаа",
        description: "Эрх өөрчлөхөд алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId)
      toast({
        title: "Амжилттай",
        description: "Хэрэглэгч амжилттай устгагдлаа",
      })
      loadUsers()
    } catch (error) {
      toast({
        title: "Алдаа",
        description: "Хэрэглэгч устгахад алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      await toggleUserStatus(userId, isActive)
      toast({
        title: "Амжилттай",
        description: `Хэрэглэгч ${isActive ? "идэвхжүүлэгдлээ" : "идэвхгүй болгогдлоо"}`,
      })
      loadUsers()
    } catch (error) {
      toast({
        title: "Алдаа",
        description: "Статус өөрчлөхөд алдаа гарлаа",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("userAuthenticated")
    localStorage.removeItem("userId")
    localStorage.removeItem("userRole")
    toast({
      title: "Амжилттай гарлаа",
      description: "Системээс амжилттай гарлаа",
    })
    router.push("/")
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ачаалж байна...</p>
        </div>
      </div>
    )
  }

  const activeUsers = users.filter((u) => u.isActive).length
  const managerCount = users.filter((u) => u.role === "manager").length
  const serverCount = users.filter((u) => u.role === "server").length

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground">Менежер самбар</h1>
              <p className="text-muted-foreground">Хэрэглэгчийн эрх удирдах систем</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Гарах
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Нийт хэрэглэгч</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Идэвхтэй хэрэглэгч</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{activeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Менежер / Сервер</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                {managerCount} / {serverCount}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Хэрэглэгчийн удирдлага</CardTitle>
                <CardDescription>Систем рүү нэвтрэх эрх олгох болон хасах</CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Хэрэглэгч нэмэх
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Шинэ хэрэглэгч үүсгэх</DialogTitle>
                    <DialogDescription>Server эсвэл Manager эрхтэй хэрэглэгч үүсгэнэ үү</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="username">Хэрэглэгчийн нэр</Label>
                      <Input
                        id="username"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="Хэрэглэгчийн нэр оруулна уу"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Нууц үг</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Нууц үг оруулна уу (дор хаяж 6 тэмдэгт)"
                          className="pr-10"
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
                    <div className="grid gap-2">
                      <Label htmlFor="role">Эрх</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value: "manager" | "server") => setNewUser({ ...newUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="server">Server - Байршил цуглуулах эрх</SelectItem>
                          <SelectItem value="manager">Manager - Бүх эрх</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Цуцлах
                    </Button>
                    <Button onClick={handleCreateUser}>Үүсгэх</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Хэрэглэгч байхгүй байна</p>
                <p className="text-muted-foreground">Эхний хэрэглэгчээ үүсгэж эхлээрэй</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Хэрэглэгчийн нэр</TableHead>
                    <TableHead>Эрх</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Үүсгэсэн огноо</TableHead>
                    <TableHead>Сүүлд нэвтэрсэн</TableHead>
                    <TableHead>Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value: "manager" | "server") => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="server">Server</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={(checked) => handleToggleStatus(user.id, checked)}
                          />
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString("mn-MN")}</TableCell>
                      <TableCell>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("mn-MN") : "Хэзээ ч"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Устгах
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
