import { Select } from "../Select";
import { DateInput } from "../DateInput";
export function MealFields({
  meal,
  date,
  onMeal,
  onDate,
}: {
  meal: string;
  date: string;
  onMeal?: (value: string) => void;
  onDate?: (value: string) => void;
}) {
  return (
    <div className="fields">
      <label>
        Приём пищи
        <Select
          aria-label="Приём пищи"
          name="meal"
          value={onMeal ? meal : undefined}
          defaultValue={meal}
          onChange={(e) => onMeal?.(e.target.value)}
        >
          {["Завтрак", "Обед", "Ужин", "Перекус"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
      </label>
      <label>
        Когда съел
        <DateInput value={date} onChange={onDate} />
      </label>
    </div>
  );
}
