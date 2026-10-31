"use client";
import DatePicker from "@/components/admin/form/date-picker";
import { useState } from "react";
import { EyeCloseIcon, EyeIcon, TimeIcon } from "@/icons";
import ComponentCard from "../../common/ComponentCard";
import Input from "../input/InputField";
import Label from "../Label";
import Select from "../Select";
import { useTranslations } from "next-intl";

export default function DefaultInputs() {
  const tUi = useTranslations("forms.defaultInputs");

  const [showPassword, setShowPassword] = useState(false);
  const options = [
    { value: "marketing", label: tUi("marketing") },
    { value: "template", label: tUi("template") },
    { value: "development", label: tUi("development") },
  ];
  const handleSelectChange = (value: string) => {
    console.log("Selected value:", value);
  };

  return (
    <ComponentCard title={tUi("defaultInputs")}>
      <div className="space-y-6">
        <div>
          <Label htmlFor="test">{tUi("input")}</Label>
          <Input type="text" id="test" placeholder={tUi("regularInput")} />
        </div>
        <div>
          <Label>{tUi("inputWithPlaceholder")}</Label>
          <Input type="text" placeholder="info@gmail.com" />
        </div>
        <div>
          <Label>{tUi("selectInput")}</Label>
          <Select
            options={options}
            placeholder={tUi("selectAnOption")}
            onChange={handleSelectChange}
            className="dark:bg-dark-900"
          />
        </div>
        <div>
          <Label htmlFor="pass">{tUi("passwordInput")}</Label>
          <div className="relative">
            <Input
              id="pass"
              type={showPassword ? "text" : "password"}
              placeholder={tUi("enterYourPassword")}
              className="pe-10"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
            >
              {showPassword ? (
                <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
              ) : (
                <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div>
          <DatePicker
            id="date-picker"
            label={tUi("datePickerInput")}
            placeholder={tUi("selectADate")}
            onChange={(dates, currentDateString) => {
              // Handle your logic
              console.log({ dates, currentDateString });
            }}
          />
        </div>

        <div>
          <Label htmlFor="tm">{tUi("timePickerInput")}</Label>
          <div className="relative">
            <Input
              type="time"
              id="tm"
              name="tm"
              className="pe-10 text-start"
              onChange={(e) => console.log(e.target.value)}
            />
            <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              <TimeIcon />
            </span>
          </div>
        </div>
        <div>
          <Label htmlFor="tm">{tUi("inputWithPayment")}</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder={tUi("cardNumber")}
              className="ps-[62px]"
            />
            <span className="absolute start-0 top-1/2 flex h-11 w-[46px] -translate-y-1/2 items-center justify-center border-e border-gray-200 dark:border-gray-800">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="6.25" cy="10" r="5.625" fill="#E80B26" />
                <circle cx="13.75" cy="10" r="5.625" fill="#F59D31" />
                <path
                  d="M10 14.1924C11.1508 13.1625 11.875 11.6657 11.875 9.99979C11.875 8.33383 11.1508 6.8371 10 5.80713C8.84918 6.8371 8.125 8.33383 8.125 9.99979C8.125 11.6657 8.84918 13.1625 10 14.1924Z"
                  fill="#FC6020"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}
