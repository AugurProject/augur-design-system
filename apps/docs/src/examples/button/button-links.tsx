import { Button } from "@augurproject/design-system";

export function ButtonLinksExample() {
  return (
    <>
      <Button asChild>
        <a href="#protocol">How Augur works</a>
      </Button>
      <Button asChild variant="outline">
        <a href="#developers">Read the developer guide</a>
      </Button>
    </>
  );
}
