"use client"

import { ChakraProvider, extendTheme } from "@chakra-ui/react"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"

// Si quieres un tema custom, aquí puedes extenderlo
const theme = extendTheme({
  // tus configuraciones personalizadas, o déjalo vacío
})

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  )
}
