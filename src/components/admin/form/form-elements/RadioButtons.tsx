"use client";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Radio from "../input/Radio";
import { useTranslations } from "next-intl";

export default function RadioButtons() {
  const tUi = useTranslations("forms.radioButtons");

  const [selectedValue, setSelectedValue] = useState<string>("option2");

  const handleRadioChange = (value: string) => {
    setSelectedValue(value);
  };
  return (
    <ComponentCard title={tUi("radioButtons")}>
      <div className="flex flex-wrap items-center gap-8">
        <Radio
          id="radio1"
          name="group1"
          value="option1"
          checked={selectedValue === "option1"}
          onChange={handleRadioChange}
          label={tUi("default")}
        />
        <Radio
          id="radio2"
          name="group1"
          value="option2"
          checked={selectedValue === "option2"}
          onChange={handleRadioChange}
          label={tUi("selected")}
        />
        <Radio
          id="radio3"
          name="group1"
          value="option3"
          checked={selectedValue === "option3"}
          onChange={handleRadioChange}
          label={tUi("disabled")}
          disabled={true}
        />
      </div>
    </ComponentCard>
  );
}
