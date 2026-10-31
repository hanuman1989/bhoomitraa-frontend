"use client";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Input from "../input/InputField";
import Label from "../Label";
import { useTranslations } from "next-intl";

export default function InputStates() {
  const tUi = useTranslations("forms.inputStates");

  const [email, setEmail] = useState("");
  const [emailTwo, setEmailTwo] = useState("");
  const [error, setError] = useState(false);

  // Simulate a validation check
  const validateEmail = (value: string) => {
    const isValidEmail =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    setError(!isValidEmail);
    return isValidEmail;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };
  const handleEmailTwoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailTwo(value);
    validateEmail(value);
  };
  return (
    <ComponentCard
      title={tUi("inputStates")}
      desc="Validation styles for error, success and disabled states on form controls."
    >
      <div className="space-y-5 sm:space-y-6">
        {/* Error Input */}
        <div>
          <Label>{tUi("email")}</Label>
          <Input
            type="email"
            defaultValue={email}
            error={error}
            onChange={handleEmailChange}
            placeholder={tUi("enterYourEmail")}
            hint={error ? tUi("thisIsAnInvalidEmailAddress") : ""}
          />
        </div>

        {/* Success Input */}
        <div>
          <Label>{tUi("email")}</Label>
          <Input
            type="email"
            defaultValue={emailTwo}
            success={!error}
            onChange={handleEmailTwoChange}
            placeholder={tUi("enterYourEmail")}
            hint={!error ? tUi("thisIsAnSuccessMessage") : ""}
          />
        </div>

        {/* Disabled Input */}
        <div>
          <Label>{tUi("email")}</Label>
          <Input
            type="text"
            defaultValue="disabled@example.com"
            disabled={true}
            placeholder={tUi("disabledEmail")}
          />
        </div>
      </div>
    </ComponentCard>
  );
}
