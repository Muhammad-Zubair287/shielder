'use client';

import { RefObject, useEffect, useState } from 'react';

interface DropdownPosition {
  top: string;
  left: string;
  right: string;
  shouldFlipVertical: boolean;
}

/**
 * useDropdownPosition - RTL-aware dropdown positioning hook
 * Handles:
 * - Automatic positioning relative to trigger button
 * - RTL/LTR direction detection
 * - Viewport boundary detection and auto-flip behavior
 * - Proper alignment based on text direction
 */
export function useDropdownPosition(
  triggerRef: RefObject<HTMLElement>,
  dropdownRef: RefObject<HTMLElement>,
  isOpen: boolean,
  isRTL: boolean
): DropdownPosition {
  const [position, setPosition] = useState<DropdownPosition>({
    top: '100%',
    left: 'auto',
    right: 'auto',
    shouldFlipVertical: false,
  });

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;
    console.log('isRTL value:', isRTL); // add this line
    console.log('trigger rect:', triggerRef.current.getBoundingClientRect());
    const updatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const gap = 12; // mt-3 in Tailwind = 12px

      // Calculate vertical positioning
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const dropdownHeight = dropdownRef.current!.offsetHeight;

      // Check if dropdown fits below
      let top = `${triggerRect.height + gap}px`;
      let shouldFlipVertical = false;

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        // Flip to top if more space available above
        top = `${-dropdownHeight - gap}px`;
        shouldFlipVertical = true;
      }

      // Calculate horizontal positioning
      // Dropdown always opens to the LEFT of the trigger (same for LTR and RTL)
      const dropdownWidth = Math.min(dropdownRef.current!.offsetWidth, 288);
const minPadding = 16;

let left = 'auto';
let right = 'auto';

if (isRTL) {
  // In RTL, profile button is on the LEFT — align dropdown's LEFT edge to trigger's LEFT edge
  const preferredLeft = triggerRect.left;
  const maxLeft = viewportWidth - dropdownWidth - minPadding;
  const clampedLeft = Math.min(Math.max(preferredLeft, minPadding), maxLeft);
  left = `${clampedLeft}px`;
  right = 'auto';
} else {
  // In LTR, profile button is on the RIGHT — align dropdown's RIGHT edge to trigger's RIGHT edge
  const preferredRight = viewportWidth - triggerRect.right;
  const maxRight = viewportWidth - dropdownWidth - minPadding;
  const clampedRight = Math.min(Math.max(preferredRight, minPadding), maxRight);
  right = `${clampedRight}px`;
  left = 'auto';
}

      setPosition({
        top,
        left,
        right,
        shouldFlipVertical,
      });
    };

    // Update immediately and on window resize/scroll
    updatePosition();

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(dropdownRef.current);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, isRTL, triggerRef, dropdownRef]);

  return position;
}