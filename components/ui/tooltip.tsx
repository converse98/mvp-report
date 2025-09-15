import { Tooltip as ChakraTooltip, Portal, TooltipProps as ChakraTooltipProps } from "@chakra-ui/react"
import * as React from "react"

export interface TooltipProps extends Omit<ChakraTooltipProps, "label"> {
  showArrow?: boolean
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement | null>
  /** 👉 Debe ser texto porque Chakra espera string en label */
  content: string
  disabled?: boolean
}

export const Tooltip = ({
  showArrow,
  children,
  disabled,
  portalled = true,
  content,
  portalRef,
  ...rest
}: TooltipProps) => {
  if (disabled) return <>{children}</>

  const tooltip = (
    <ChakraTooltip label={content} hasArrow={showArrow} {...rest}>
      {children}
    </ChakraTooltip>
  )

  return portalled ? (
    <Portal containerRef={portalRef}>{tooltip}</Portal>
  ) : (
    tooltip
  )
}
