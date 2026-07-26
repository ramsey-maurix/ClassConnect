"use client";

import { useEffect } from "react";
import { Button, Card } from "@classconnect/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="not-found">
      <Card className="not-found__card">
        <h2>Something went wrong</h2>
        <p>The page could not be rendered. Your backend data has not been changed.</p>
        <Button onClick={reset}>Try again</Button>
      </Card>
    </main>
  );
}
