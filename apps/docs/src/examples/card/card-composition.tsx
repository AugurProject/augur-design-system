import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@augurproject/design-system";

export function CardCompositionExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Query review</CardTitle>
        <CardDescription>Status, choices, and the current response.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>The panel groups the record with the actions that operate on it.</p>
      </CardContent>
      {/* One primary action: the panel's one green signal. */}
      <CardFooter>
        <Button>Open record</Button>
      </CardFooter>
    </Card>
  );
}
