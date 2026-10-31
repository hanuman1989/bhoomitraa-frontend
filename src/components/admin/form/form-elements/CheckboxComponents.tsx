"use client";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Checkbox from "../input/Checkbox";
import { useTranslations } from "next-intl";

export default function CheckboxComponents() {
  const tUi = useTranslations("forms.checkboxComponents");

  const [isChecked, setIsChecked] = useState(false);
  const [isCheckedTwo, setIsCheckedTwo] = useState(true);
  const [isCheckedDisabled, setIsCheckedDisabled] = useState(false);
  return (
    <ComponentCard title={tUi("checkbox")}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Checkbox checked={isChecked} onChange={setIsChecked} />
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-400">
            {tUi("default")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isCheckedTwo}
            onChange={setIsCheckedTwo}
            label={tUi("checked")}
          />
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isCheckedDisabled}
            onChange={setIsCheckedDisabled}
            disabled
            label={tUi("disabled")}
          />
        </div>
      </div>
    </ComponentCard>
  );
}
