/**
 * Public entry point for @augurproject/design-system.
 *
 * Consumers use this module and the stylesheet entry point:
 *
 *   import { Button, Card } from "@augurproject/design-system";
 *   import "@augurproject/design-system/styles.css";
 *
 * Generated tokens and theme output landed with the foundation work
 * (#3–#5); font delivery (#5) adds the machine-readable font
 * provenance export. Starter components (#11–#14) are exported from
 * here as they are implemented — Button and Card arrived with #11,
 * Dialog with #13. Internal file organization must not become public
 * API through this module.
 */
export { AUGUR_FONTS, AUGUR_FONT_FAMILIES } from "./fonts";
export type { AugurFontProvenance } from "./fonts";

export { Button, buttonVariants } from "./components/button/button";
export type { ButtonProps } from "./components/button/button";
export type {
  ButtonVariant,
  ButtonSize,
  ButtonVariantsProps,
} from "./components/button/button-variants";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card/card";
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from "./components/card/card";

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./components/dialog/dialog";
export type {
  DialogProps,
  DialogTriggerProps,
  DialogPortalProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogFooterProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogCloseProps,
  DialogSize,
} from "./components/dialog/dialog";
// Patterns (#14): the first slice of the patterns layer (ARCHITECTURE.md
// §4). Composed of the components above; no product meaning.
export {
  PageHeader,
  PageHeaderBreadcrumb,
  PageHeaderContent,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "./patterns/page-header/page-header";
export type {
  PageHeaderProps,
  PageHeaderBreadcrumbProps,
  PageHeaderContentProps,
  PageHeaderTitleProps,
  PageHeaderDescriptionProps,
  PageHeaderActionsProps,
  HeadingLevel,
} from "./patterns/page-header/page-header";

export {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateActions,
} from "./patterns/empty-state/empty-state";
export type {
  EmptyStateProps,
  EmptyStateIconProps,
  EmptyStateTitleProps,
  EmptyStateDescriptionProps,
  EmptyStateActionsProps,
} from "./patterns/empty-state/empty-state";
export { Input } from "./components/input/input";
export type { InputProps } from "./components/input/input";

export {
  FormField,
  FormFieldControl,
  FormFieldLabel,
  FormFieldDescription,
  FormFieldError,
} from "./components/form-field/form-field";
export type {
  FormFieldProps,
  FormFieldControlProps,
  FormFieldLabelProps,
  FormFieldDescriptionProps,
  FormFieldErrorProps,
} from "./components/form-field/form-field";
