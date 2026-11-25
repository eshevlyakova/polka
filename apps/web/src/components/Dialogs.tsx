import { AddPantryDialog } from "./dialogs/AddPantryDialog";
import { ReceiptDialog } from "./dialogs/ReceiptDialog";
import { VoicePantryDialog } from "./dialogs/VoicePantryDialog";
import { WeightDialog } from "./dialogs/WeightDialog";
import { ProfileDialog } from "./dialogs/ProfileDialog";
import { QuickEditDialogs } from "./dialogs/QuickEditDialogs";
import type { AppController } from "../hooks/useAppController";
import { FoodDialog } from "./dialogs/FoodDialog";
import { OwnRecipeDialog } from "./dialogs/OwnRecipeDialog";
import { PantryDialog } from "./dialogs/PantryDialog";
export function Dialogs({ app }: { app: AppController }) {
  return (
    <>
      <AddPantryDialog app={app} />
      <ReceiptDialog app={app} />
      <VoicePantryDialog app={app} />
      <WeightDialog app={app} />
      <ProfileDialog app={app} />
      <QuickEditDialogs app={app} />
      <PantryDialog app={app} />
      <FoodDialog app={app} />
      <OwnRecipeDialog app={app} />
    </>
  );
}
