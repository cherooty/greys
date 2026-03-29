/** Stub: toast UI unused; no dependency on `@/components/ui/toast`. */

export function useToast() {
  return {
    toasts: [] as { id: string }[],
    toast: () => {},
    dismiss: () => {},
  };
}

export function toast() {}
