"use client"

import { Users } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Profile, Role } from "@/types"

import { toggleActive, updateRole } from "../actions"

// Owner-only user management — change role, activate/deactivate accounts.
interface UserTableProps {
  users: Profile[]
  currentUserId: string
}

export default function UserTable({ users, currentUserId }: UserTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="size-4 text-muted-foreground" />
          Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function UserRow({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleRoleChange(role: string) {
    startTransition(async () => {
      const result = await updateRole(user.id, role as Role)
      if (!result.success) toast.error(result.error)
    })
  }

  function handleActiveToggle(checked: boolean) {
    startTransition(async () => {
      const result = await toggleActive(user.id, checked)
      if (!result.success) toast.error(result.error)
    })
  }

  return (
    <TableRow className={isPending ? "opacity-50 pointer-events-none" : ""}>
      <TableCell>{user.full_name}</TableCell>
      <TableCell>
        <Select
          value={user.role ?? "salesperson"}
          onValueChange={handleRoleChange}
          disabled={isSelf || isPending}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salesperson">Salesperson</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={user.is_active ?? true}
            onCheckedChange={handleActiveToggle}
            disabled={isSelf || isPending}
          />
          <Badge variant={user.is_active ? "default" : "secondary"}>
            {user.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </TableCell>
    </TableRow>
  )
}
