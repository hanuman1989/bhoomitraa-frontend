"use client";

import { EnvelopeIcon } from "@/icons";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import PhoneInput from "../group-input/PhoneInput";
import Input from "../input/InputField";
import CopyInput from "./CopyInput";
import UrlPrefixInput from "./UrlPrefixInput";
import { useTranslations } from "next-intl";

export default function InputGroup() {
  const tUi = useTranslations("forms.inputGroup");

  const countries = [
    { code: "US", label: "+1" },
    { code: "GB", label: "+44" },
    { code: "CA", label: "+1" },
    { code: "AU", label: "+61" },
  ];
  const handlePhoneNumberChange = (phoneNumber: string) => {
    console.log("Updated phone number:", phoneNumber);
  };

  return (
    <ComponentCard title={tUi("inputGroup")}>
      <div className="space-y-6">
        <div>
          <Label htmlFor="email">{tUi("email")}</Label>
          <div className="relative">
            <Input
              id="email"
              placeholder="info@gmail.com"
              type="text"
              className="ps-[62px]"
            />
            <span className="absolute start-0 top-1/2 -translate-y-1/2 border-e border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <EnvelopeIcon />
            </span>
          </div>
        </div>

        <div>
          <Label htmlFor="phone">{tUi("phone")}</Label>
          <PhoneInput
            selectPosition="start"
            countries={countries}
            placeholder="+1 (555) 000-0000"
            onChange={handlePhoneNumberChange}
          />
        </div>

        <div>
          <Label>{tUi("website")}</Label>
          <PhoneInput
            selectPosition="end"
            countries={countries}
            placeholder="+1 (555) 000-0000"
            onChange={handlePhoneNumberChange}
          />
        </div>

        <div>
          <Label>{tUi("uRL")}</Label>
          <UrlPrefixInput />
        </div>
        <div>
          <Label>{tUi("website")}</Label>
          <CopyInput />
        </div>
      </div>
    </ComponentCard>
  );
}
