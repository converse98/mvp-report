"use client"

import { Button, Stack, useToast } from "@chakra-ui/react"

export function Toaster() {
  const toast = useToast()

  const showToast = () => {
    toast({
      title: "Proceso completado",
      description: "Se ejecutó correctamente.",
      status: "success",  // success | error | warning | info
      duration: 5000,
      isClosable: true,
      position: "bottom-right", // o bottom-end
    })
  }

  return (
    <Stack p={4}>
      <Button colorScheme="blue" onClick={showToast}>
        Mostrar Toast
      </Button>
    </Stack>
  )
}
