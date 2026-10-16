import { WeightDialog } from "./dialogs/WeightDialog";
import { ProfileDialog } from "./dialogs/ProfileDialog";
import { QuickEditDialogs } from "./dialogs/QuickEditDialogs";
import type { AppController } from "../hooks/useAppController";
import { FoodDialog } from "./dialogs/FoodDialog";
import { OnboardingDialog } from "./dialogs/OnboardingDialog";
import { OwnRecipeDialog } from "./dialogs/OwnRecipeDialog";
import { PantryDialog } from "./dialogs/PantryDialog";
import { RecipeDialog } from "./dialogs/RecipeDialog";
export function Dialogs({ app }: { app: AppController }) {
  return (
    <>
      <WeightDialog app={app} />
      <ProfileDialog app={app} />
      <QuickEditDialogs app={app} />
      <OnboardingDialog app={app} />
      <PantryDialog app={app} />
      <FoodDialog app={app} />
      <RecipeDialog app={app} />
      <OwnRecipeDialog app={app} />
    </>
  );
}
