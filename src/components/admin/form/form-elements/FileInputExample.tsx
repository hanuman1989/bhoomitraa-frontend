"use client";
import ComponentCard from "../../common/ComponentCard";
import FileInput from "../input/FileInput";
import Label from "../Label";
import { useTranslations } from "next-intl";

export default function FileInputExample() {
  const tUi = useTranslations("forms.fileInputExample");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file:", file.name);
    }
  };

  return (
    <ComponentCard title={tUi("fileInput")}>
      <div>
        <Label>{tUi("uploadFile")}</Label>
        <FileInput onChange={handleFileChange} className="custom-class" />
      </div>
    </ComponentCard>
  );
}
