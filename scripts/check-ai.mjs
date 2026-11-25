import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  generateRecipes,
} = require("../apps/backend/dist/apps/backend/src/ai/provider.js");
const {
  aiCredentials,
} = require("../apps/backend/dist/apps/backend/src/ai/config.js");
if (!process.env.TIMEWEB_AI_TOKEN && !process.env.API_GLM) {
  console.error("В .env не задан TIMEWEB_AI_TOKEN или API_GLM.");
  process.exit(1);
}
try {
  const result = await generateRecipes(
    {
      preferences: "Предложи один простой завтрак без духовки",
      exclusions: "",
      maxMinutes: 20,
      products: [
        { foodId: "egg", name: "Яйцо", grams: 200, expiresOn: "" },
        { foodId: "tomato", name: "Помидоры", grams: 200, expiresOn: "" },
        { foodId: "oil", name: "Масло растительное", grams: 10, expiresOn: "" },
      ],
    },
    aiCredentials(process.env),
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        model: process.env.TIMEWEB_AI_TOKEN
          ? process.env.AI_TEXT_MODEL || "deepseek/deepseek-flash"
          : "glm-4.7-flash",
        recipes: result.map((recipe) => ({
          name: recipe.name,
          minutes: recipe.minutes,
          ingredients: recipe.ingredients.length,
        })),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      status: error.status ?? 500,
      message: error.message,
    }),
  );
  process.exit(1);
}
