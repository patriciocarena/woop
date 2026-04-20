"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns true once the component has mounted on the client.
 * Use to gate rendering of any state that lives in localStorage so that
 * server-rendered HTML doesn't disagree with the client's first paint.
 *
 * Implemented via useSyncExternalStore so we don't trip React 19's
 * "no setState in useEffect" lint rule.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
