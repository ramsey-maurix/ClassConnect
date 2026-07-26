import Link from "next/link";
import { Card } from "@classconnect/ui";

export default function NotFound() {
  return (
    <main className="not-found">
      <Card className="not-found__card">
        <h1>404</h1>
        <h2>Page not found</h2>
        <p>The ClassConnect page you requested does not exist or is not available for this role.</p>
        <Link className="ui-button ui-button--primary ui-button--md" href="/login">Return to login</Link>
      </Card>
    </main>
  );
}
