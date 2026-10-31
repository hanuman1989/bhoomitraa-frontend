"use client";
import ComponentCard from "../../common/ComponentCard";
import Switch from "../switch/Switch";
import { useTranslations } from "next-intl";

export default function ToggleSwitch() {
  const tUi = useTranslations("forms.toggleSwitch");

  const handleSwitchChange = (checked: boolean) => {
    console.log("Switch is now:", checked ? tUi("oN") : tUi("oFF"));
  };
  return (
    <ComponentCard title={tUi("toggleSwitchInput")}>
      <div className="flex gap-4">
        <Switch
          label={tUi("default")}
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch
          label={tUi("checked")}
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch label={tUi("disabled")} disabled={true} />
      </div>{" "}
      <div className="flex gap-4">
        <Switch
          label={tUi("default")}
          defaultChecked={true}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch
          label={tUi("checked")}
          defaultChecked={true}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch label={tUi("disabled")} disabled={true} color="gray" />
      </div>
    </ComponentCard>
  );
}
