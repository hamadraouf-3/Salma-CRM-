"use client";

import { useState, cloneElement, isValidElement, type ReactElement } from "react";
import { Modal } from "./modal";

/**
 * Wraps a trigger element (a button) so clicking it opens `children` (typically a
 * form) inside a Modal, instead of navigating to a separate "new"/"edit" page.
 *
 * `closeSignal` closes the modal when it changes — needed only for actions that
 * redirect back to the *same* URL on success (e.g. `/users?flash=...`), since that
 * kind of redirect doesn't unmount this component the way navigating to a
 * different page (a detail page) does.
 */
export function ModalFormTrigger({
  trigger,
  title,
  description,
  closeSignal,
  className,
  children,
}: {
  trigger: ReactElement<{ onClick?: () => void }>;
  title: string;
  description?: string;
  closeSignal?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [lastCloseSignal, setLastCloseSignal] = useState(closeSignal);

  if (closeSignal && closeSignal !== lastCloseSignal) {
    setLastCloseSignal(closeSignal);
    setOpen(false);
  }

  return (
    <>
      {isValidElement(trigger) ? cloneElement(trigger, { onClick: () => setOpen(true) }) : trigger}
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} className={className}>
        {children}
      </Modal>
    </>
  );
}
