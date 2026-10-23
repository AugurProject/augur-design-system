import { Button } from "@augurproject/design-system";

export function ButtonStatesExample() {
  return (
    <>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra large</Button>
      <Button disabled>Disabled</Button>
      {/* Loading keeps the label's width and sets aria-busy. */}
      <Button loading>Finalize record</Button>
    </>
  );
}
