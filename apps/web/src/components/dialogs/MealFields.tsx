import { Select } from "../Select";
export function MealFields({ meal, date }: { meal: string; date: string }) {
  return (
    <div className="fields">
      <label>
        Приём пищи
        <Select aria-label="Приём пищи" name="meal" defaultValue={meal}>
          {["Завтрак", "Обед", "Ужин", "Перекус"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
      </label>
      <label>
        Когда съел
        <input name="date" type="date" defaultValue={date} required />
      </label>
    </div>
  );
}
