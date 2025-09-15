// src/providers.tsx  ⬅️  O en la ruta que uses para "@/providers"
"use client";

import { ChakraProvider } from "@chakra-ui/react";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <ChakraProvider>{children}</ChakraProvider>;
}
