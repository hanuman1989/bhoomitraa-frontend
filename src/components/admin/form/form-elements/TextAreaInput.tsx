"use client";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import TextArea from "../input/TextArea";
import Label from "../Label";
import { useTranslations } from "next-intl";

export default function TextAreaInput() {
  const tUi = useTranslations("forms.textAreaInput");

  const [message, setMessage] = useState("");
  const [messageTwo, setMessageTwo] = useState("");
  return (
    <ComponentCard title={tUi("textareaInputField")}>
      <div className="space-y-6">
        {/* Default TextArea */}
        <div>
          <Label>{tUi("description")}</Label>
          <TextArea
            value={message}
            onChange={(value) => setMessage(value)}
            rows={6}
          />
        </div>

        {/* Disabled TextArea */}
        <div>
          <Label>{tUi("description")}</Label>
          <TextArea rows={6} disabled />
        </div>

        {/* Error TextArea */}
        <div>
          <Label>{tUi("description")}</Label>
          <TextArea
            rows={6}
            value={messageTwo}
            error
            onChange={(value) => setMessageTwo(value)}
            hint={tUi("pleaseEnterAValidMessage")}
          />
        </div>
      </div>
    </ComponentCard>
  );
}
