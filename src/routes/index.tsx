import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Chrome } from "@/components/focus/Chrome";

const scenePromise = typeof window === "undefined" ? null : import("@/components/hourglass/Scene");
const Scene = lazy(() => scenePromise ?? import("@/components/hourglass/Scene"));

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <WebGLBoundary>
        {ready ? (
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        ) : null}
      </WebGLBoundary>
      <Chrome />
    </main>
  );
}

class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="absolute inset-x-0 top-1/2 px-8 text-center text-sm text-muted">
          This glass needs WebGL, which this device did not provide.
        </p>
      );
    }
    return this.props.children;
  }
}
