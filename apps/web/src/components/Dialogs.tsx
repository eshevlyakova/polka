import { CatalogDialog } from "./dialogs/CatalogDialog";
import { AddPantryDialog } from "./dialogs/AddPantryDialog";
import { ReceiptDialog } from "./dialogs/ReceiptDialog";
import { WeightDialog } from "./dialogs/WeightDialog";
import { ProfileDialog } from "./dialogs/ProfileDialog";
import { QuickEditDialogs } from "./dialogs/QuickEditDialogs";
import type { AppController } from "../hooks/useAppController";
import { FoodDialog } from "./dialogs/FoodDialog";
import { OnboardingDialog } from "./dialogs/OnboardingDialog";
import { OwnRecipeDialog } from "./dialogs/OwnRecipeDialog";
import { PantryDialog } from "./dialogs/PantryDialog";
export function Dialogs({ app }: { app: AppController }) {
  return (
    <>
      <CatalogDialog app={app} />
      <AddPantryDialog app={app} />
      <ReceiptDialog app={app} />
      <WeightDialog app={app} />
      <ProfileDialog app={app} />
      <QuickEditDialogs app={app} />
      <OnboardingDialog app={app} />
      <PantryDialog app={app} />
      <FoodDialog app={app} />
      <OwnRecipeDialog app={app} />
    </>
  );
}
