"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

interface CopyRowButtonProps {
  value: string
}

export function CopyRowButton({ value }: CopyRowButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success("Row copied — paste into the sheet")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy to clipboard")
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="size-3.5 mr-1.5" /> : <Copy className="size-3.5 mr-1.5" />}
      {copied ? "Copied" : "Copy for sheet"}
    </Button>
  )
}
