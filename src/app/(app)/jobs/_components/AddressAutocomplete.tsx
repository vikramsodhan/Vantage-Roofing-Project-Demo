"use client"

import type { AddressAutofillRetrieveResponse } from "@mapbox/search-js-core"
import { AddressAutofill } from "@mapbox/search-js-react"
import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  name?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  onBlur,
  disabled,
  name,
}: AddressAutocompleteProps) {
  // Display buffer. `value` (the committed form value) is only updated per the
  // mode rules below — never blindly synced — so editing in autocomplete mode can
  // diverge from the committed value on purpose.
  const [inputValue, setInputValue] = useState(value)
  // Whether the user has switched to manual entry. Both new and edit forms start
  // in autocomplete mode.
  const [isManualMode, setIsManualMode] = useState(false)

  function handleChange(newValue: string) {
    setInputValue(newValue)
    if (isManualMode) {
      onChange(newValue) // manual: each keystroke is the committed value
    } else if (value && newValue !== value) {
      // autocomplete: editing a committed address invalidates it — clear until a
      // suggestion is picked again.
      // NOTE: if picking a suggestion ever saves blank, suspect this line — Mapbox's
      // fill also fires onChange, which can clear depending on event order.
      onChange("")
    }
  }

  function handleManualToggle(checked: boolean) {
    // If switched to manual mode with text in the input, get form ready to submit input.
    // If switched back to autocomplete do nothing. Input is valid on switch. Handle change take care of changes
    if (checked && inputValue) onChange(inputValue)
    setIsManualMode(checked)
  }

  const addressInput = (placeholder: string) => (
    <Input
      name={name}
      value={inputValue}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="street-address"
    />
  )

  const control = isManualMode ? (
    addressInput("123 Main St, Vancouver, BC")
  ) : (
    <AddressAutofill
      accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
      options={{
        country: "CA",
        // Bounding box for British Columbia [minLng, minLat, maxLng, maxLat]
        bbox: [-139.06, 48.3, -114.03, 60.0],
      }}
      onRetrieve={(result: AddressAutofillRetrieveResponse) => {
        const full_address = result.features[0]?.properties?.full_address
        if (full_address) {
          setInputValue(full_address)
          onChange(full_address)
        }
      }}
    >
      {addressInput("Start typing an address...")}
    </AddressAutofill>
  )

  return (
    <div className="flex flex-col gap-1.5">
      {control}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isManualMode ? "Type the full address." : "Pick a suggestion from the dropdown."}
        </p>
        <label className="flex cursor-pointer select-none items-center gap-2">
          <span className="text-xs text-muted-foreground">Enter manually</span>
          <Switch checked={isManualMode} onCheckedChange={handleManualToggle} disabled={disabled} />
        </label>
      </div>
    </div>
  )
}
