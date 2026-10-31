"use client";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Select from "../Select";
import MultiSelect from "../MultiSelect";
import { useTranslations } from "next-intl";

export default function SelectInputs() {
  const tUi = useTranslations("forms.selectInputs");

  const options = [
    { value: "marketing", label: tUi("marketing") },
    { value: "template", label: tUi("template") },
    { value: "development", label: tUi("development") },
  ];

  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const handleSelectChange = (value: string) => {
    console.log("Selected value:", value);
  };

  const multiOptions = [
    { value: "1", text: tUi("option1"), selected: false },
    { value: "2", text: tUi("option2"), selected: false },
    { value: "3", text: tUi("option3"), selected: false },
    { value: "4", text: tUi("option4"), selected: false },
    { value: "5", text: tUi("option5"), selected: false },
  ];

  return (
    <ComponentCard title={tUi("selectInputs")}>
      <div className="space-y-6">
        <div>
          <Label>{tUi("selectInput")}</Label>
          <Select
            options={options}
            placeholder={tUi("selectOption")}
            onChange={handleSelectChange}
            className="dark:bg-dark-900"
          />
        </div>
        <div className="relative">
          <MultiSelect
            label={tUi("multipleSelectOptions")}
            options={multiOptions}
            defaultSelected={["1", "3"]}
            onChange={(values) => setSelectedValues(values)}
          />
          <p className="sr-only">
            {tUi("selectedValues")} {selectedValues.join(", ")}
          </p>
        </div>
      </div>
    </ComponentCard>
  );
}
